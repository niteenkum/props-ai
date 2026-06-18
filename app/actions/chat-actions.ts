"use server";

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ThePitchly Dashboard Chatbot — Server Actions              ║
 * ║  Uses Corsair SDK for Gmail/Calendar + Gemini for reasoning ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Corsair MCP-Style Tool Execution:
 *   listCorsairOps()             → listOperations(corsair, { plugin })
 *   getCorsairSchema()           → getSchema(corsair, path)
 *   executeCorsairOp()           → corsair.withTenant(email)[plugin].api[...path](args)
 *
 * Gemini acts as the reasoning engine. It calls these as function_call tools.
 */

import { corsair } from "../utils/corsair";
import { listOperations, getSchema } from "corsair";
// Note: listOperations and getSchema are exported from the main corsair package (confirmed at runtime)
import { prisma } from "../utils/prisma";
import { getUserProfileAction } from "./db-actions";
import { getFollowUpsAction, bookCallAction } from "./calendar-actions";
import { addJobPostAction } from "./db-actions";
import { analyzeAndGenerateAction } from "./ai-actions";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actionType?: string;
  actionData?: unknown;
}

export interface ChatResponse {
  reply: string;
  actionType: "text" | "emails" | "jobs" | "draft" | "stats" | "calls" | "schedule_job_select" | "error";
  actionData?: unknown;
}

export interface DraftEmail {
  to: string;
  subject: string;
  body: string;
  cc?: string;
}

// ─── Corsair MCP Tool Wrappers ─────────────────────────────────────────────

/**
 * Lists all available Corsair API operations for gmail + googlecalendar.
 * Mirrors the `list_operations` MCP tool.
 */
export async function listCorsairOps(plugin?: string): Promise<string> {
  try {
    const ops = listOperations(corsair, { plugin: plugin as any, type: "api" });
    return typeof ops === "string" ? ops : JSON.stringify(ops);
  } catch (err) {
    console.warn("[listCorsairOps] Error:", err);
    return "gmail.api.messages.list\ngmail.api.messages.get\ngmail.api.messages.send\ngmail.api.threads.get\ngmail.api.drafts.create\ngooglecalendar.api.events.getMany\ngooglecalendar.api.events.create";
  }
}

/**
 * Returns the TypeScript-style input/output schema for a Corsair operation path.
 * Mirrors the `get_schema` MCP tool.
 */
export async function getCorsairSchema(path: string): Promise<string> {
  try {
    const schema = getSchema(corsair, path as any);
    return typeof schema === "string" ? schema : JSON.stringify(schema, null, 2);
  } catch (err) {
    console.warn("[getCorsairSchema] Error for path:", path, err);
    return `Schema unavailable for: ${path}`;
  }
}

/**
 * Executes a Corsair API operation for a specific tenant (user).
 * Mirrors the `corsair_run` MCP tool.
 *
 * @param userEmail - The tenant's email (used for multi-tenant auth)
 * @param fullPath  - e.g. "gmail.api.messages.list" or "googlecalendar.api.events.list"
 * @param args      - The arguments to pass to the API call
 */
export async function executeCorsairOp(
  userEmail: string,
  fullPath: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const tenant = corsair.withTenant(userEmail);

    // Parse path: "gmail.api.messages.list" → plugin="gmail", segments=["messages","list"]
    const parts = fullPath.split(".");
    if (parts.length < 4 || parts[1] !== "api") {
      return { success: false, error: `Invalid Corsair path format: ${fullPath}. Expected: plugin.api.resource.method` };
    }

    const plugin = parts[0]; // e.g. "gmail"
    const apiSegments = parts.slice(2); // e.g. ["messages", "list"]

    // Traverse: tenant.gmail.api.messages.list
    let fn: any = (tenant as any)[plugin]?.api;
    if (!fn) {
      return { success: false, error: `Plugin "${plugin}" not found on Corsair tenant.` };
    }

    for (const segment of apiSegments) {
      fn = fn[segment];
      if (!fn) {
        return { success: false, error: `Path segment "${segment}" not found in ${fullPath}` };
      }
    }

    if (typeof fn !== "function") {
      return { success: false, error: `${fullPath} does not resolve to a callable function.` };
    }

    // ── Defensive remap for calendar event creation ───────────────────────
    // Gemini sometimes uses "resource" (raw GCal REST convention) instead of
    // the Corsair SDK's expected "event" key, causing a 400 Bad Request.
    if (fullPath === "googlecalendar.api.events.create" && args.resource && !args.event) {
      args = { ...args, event: args.resource };
      delete (args as any).resource;
      console.log("[executeCorsairOp] Remapped 'resource' → 'event' for events.create");
    }

    // ── Auto-inject conferenceDataVersion for calendar event gets ─────────
    // Google Calendar API requires conferenceDataVersion: 1 to return meeting details/Meet links.
    if (
      (fullPath === "googlecalendar.api.events.get" || fullPath === "googlecalendar.api.events.getMany") &&
      args.conferenceDataVersion === undefined
    ) {
      args = { ...args, conferenceDataVersion: 1 };
      console.log(`[executeCorsairOp] Auto-injected conferenceDataVersion: 1 for ${fullPath}`);
    }

    const result = await fn(args);
    return { success: true, data: result };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error(`[executeCorsairOp] Failed for ${fullPath}:`, msg);
    return { success: false, error: msg };
  }
}

// ─── Gemini Function-Call Agent Loop ──────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

/** Tool declarations Gemini can call */
const FUNCTION_DECLARATIONS = [
  {
    name: "corsair_list_operations",
    description: "List all available Corsair API operations for a plugin (gmail or googlecalendar). Returns newline-separated operation paths.",
    parameters: {
      type: "object",
      properties: {
        plugin: {
          type: "string",
          description: "The plugin name: 'gmail' or 'googlecalendar'",
          enum: ["gmail", "googlecalendar"],
        },
      },
      required: [],
    },
  },
  {
    name: "corsair_get_schema",
    description: "Get the TypeScript input/output schema for a specific Corsair operation path.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The full Corsair operation path, e.g. 'gmail.api.messages.list'",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "corsair_run",
    description: "Execute a Corsair API operation for the user. Use this to fetch emails, send emails, search inbox, get threads, list calendar events, etc. Always use this for any Gmail or Google Calendar operation.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "The full Corsair operation path, e.g. 'gmail.api.messages.list', 'gmail.api.messages.send', 'googlecalendar.api.events.getMany'",
        },
        args: {
          type: "object",
          description: `The arguments to pass to the API operation.
- gmail.api.messages.list → { q: 'search query', maxResults: 20 }
- gmail.api.messages.send → { raw: '<base64-encoded RFC 822 email>' }
- googlecalendar.api.events.getMany → { calendarId: 'primary', timeMin: '2026-06-16T00:00:00Z', singleEvents: true, conferenceDataVersion: 1 }
- googlecalendar.api.events.create → { calendarId: 'primary', conferenceDataVersion: 1, sendUpdates: 'all', event: { summary: 'Title', description: 'Notes', start: { dateTime: '2026-06-20T15:00:00+05:30', timeZone: 'Asia/Kolkata' }, end: { dateTime: '2026-06-20T16:00:00+05:30', timeZone: 'Asia/Kolkata' }, attendees: [{ email: 'someone@example.com' }] } }
  IMPORTANT: For googlecalendar.api.events.create, the event body MUST be nested under the key "event" (not "resource").
  IMPORTANT: For googlecalendar.api.events.getMany or get, you MUST pass "conferenceDataVersion": 1 to receive Google Meet video conference links.`,
        },
      },
      required: ["path", "args"],
    },
  },
  {
    name: "db_query",
    description: "Query the local ThePitchly database for job posts, sent emails, outreach statistics, and scheduled calls/follow-ups.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["job_stats", "job_list", "pending_jobs", "sent_emails", "synced_emails", "calls"],
          description: "What to query. 'job_stats' = aggregate counts, 'job_list' = all jobs, 'pending_jobs' = unapplied job posts (status is Draft or Generated), 'sent_emails' = outreach emails sent to companies (from SentEmail table), 'synced_emails' = received inbox emails (from SyncedEmail table), 'calls' = upcoming scheduled interview calls.",
        },
        filter: {
          type: "string",
          description: "Optional search filter (e.g. company name, email address)",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "draft_email",
    description: "Create a draft email to show to the user for review before sending. Returns a compose card in the UI.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body text" },
        cc: { type: "string", description: "Optional CC email address" },
      },
      required: ["to", "subject", "body"],
    },
  },
  // schedule_call is intentionally REMOVED from AI tools.
  // The UI's ScheduleJobSelectPanel handles booking via bookCallFromBotAction directly.
  // AI only triggers db_query({type:'job_list'}) → schedule_job_select card → client books.
  {
    name: "create_job_post",
    description: `Create a new job post in ThePitchly from a job description the user provides.

WORKFLOW:
1. Ask the user to paste or describe the job posting (role, company, requirements, contact info if any).
2. If they give you a short description, ask for more detail (company name, role title, key requirements) so the AI can score it properly.
3. Once you have enough information (at minimum: role title + brief description), call create_job_post.
4. The system will run full AI analysis: match scoring, cold email draft, proposal, cover letter — all auto-generated.
5. The new job will appear in the Jobs list with status 'Draft'.

NEVER make up job details — only use what the user actually provides.`,
    parameters: {
      type: "object",
      properties: {
        jobText: {
          type: "string",
          description: "The raw job description text provided by the user. Include everything: role, company, requirements, contact details, apply URL, etc. The more detail, the better the AI analysis.",
        },
        role: {
          type: "string",
          description: "Job title / role name, e.g. 'Senior React Developer'. Extract from jobText if possible.",
        },
        company: {
          type: "string",
          description: "Company name. Use 'Not specified' if not mentioned.",
        },
        contactEmail: {
          type: "string",
          description: "Recruiter or contact email address, if mentioned in the job text.",
        },
        notes: {
          type: "string",
          description: "Any extra notes the user wants to add to this job.",
        },
      },
      required: ["jobText", "role", "company"],
    },
  },
];

/** Execute a function_call from Gemini */
async function executeFunctionCall(
  name: string,
  args: Record<string, unknown>,
  userEmail: string
): Promise<{ toolResult: unknown; specialAction?: { type: string; data: unknown } }> {
  switch (name) {
    case "corsair_list_operations": {
      const ops = await listCorsairOps(args.plugin as string | undefined);
      return { toolResult: ops };
    }

    case "corsair_get_schema": {
      const schema = await getCorsairSchema(args.path as string);
      return { toolResult: schema };
    }

    case "corsair_run": {
      const path = args.path as string;
      const callArgs = (args.args as Record<string, unknown>) ?? {};
      const result = await executeCorsairOp(userEmail, path, callArgs);

      if (!result.success) {
        return { toolResult: { error: result.error } };
      }

      // If this was a messages.list call, fetch details for each message
      if (path.includes("messages.list")) {
        const raw = result.data as any;
        const msgIds: string[] = (raw?.messages ?? []).slice(0, 15).map((m: any) => m.id).filter(Boolean);

        if (msgIds.length > 0) {
          const messages: any[] = [];
          for (const id of msgIds) {
            try {
              const msgResult = await executeCorsairOp(userEmail, "gmail.api.messages.get", { id, format: "metadata" });
              if (msgResult.success) {
                const msg = msgResult.data as any;
                const headers = (msg?.payload?.headers ?? []) as { name: string; value: string }[];
                const getH = (n: string) => headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ?? "";
                const fromRaw = getH("From");
                const fromMatch = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
                messages.push({
                  id,
                  subject: getH("Subject") || "(no subject)",
                  from: fromMatch?.[2] ?? fromRaw,
                  fromName: fromMatch?.[1]?.trim() ?? fromRaw.split("@")[0],
                  date: getH("Date"),
                  snippet: (msg?.snippet ?? "").slice(0, 120),
                  isRead: !(msg?.labelIds ?? []).includes("UNREAD"),
                  labels: msg?.labelIds ?? [],
                });
              }
            } catch { /* skip */ }
          }
          return {
            toolResult: { messageCount: msgIds.length, messages },
            specialAction: { type: "emails", data: messages },
          };
        }
      }

      return { toolResult: result.data };
    }

    case "db_query": {
      const queryType = args.type as string;
      const filter = (args.filter as string | undefined) ?? "";

      if (queryType === "job_stats") {
        const [total, generated, sent, interviewing] = await Promise.all([
          prisma.jobPost.count(),
          prisma.jobPost.count({ where: { status: "Generated" } }),
          prisma.jobPost.count({ where: { status: "Sent" } }),
          prisma.jobPost.count({ where: { status: "Interviewing" } }),
        ]);
        const avgScore = await prisma.jobPost.aggregate({ _avg: { matchScore: true } });
        const stats = {
          total,
          generated,
          sent,
          interviewing,
          avgMatchScore: Math.round(avgScore._avg.matchScore ?? 0),
        };
        return {
          toolResult: stats,
          specialAction: { type: "stats", data: stats },
        };
      }

      if (queryType === "job_list") {
        const where: any = {};
        if (filter) {
          where.OR = [
            { role: { contains: filter, mode: "insensitive" } },
            { company: { contains: filter, mode: "insensitive" } },
          ];
        }
        const jobs = await prisma.jobPost.findMany({
          where,
          orderBy: { postedDate: "desc" },
          take: 10,
          select: { id: true, role: true, company: true, matchScore: true, status: true, contactEmail: true },
        });
        // Detect if called from a scheduling context by checking recent history
        // We use a heuristic: if Gemini called db_query(job_list) it's almost always for schedule_call flow
        return {
          toolResult: jobs,
          specialAction: { type: "schedule_job_select", data: jobs },
        };
      }

      if (queryType === "pending_jobs") {
        const jobs = await prisma.jobPost.findMany({
          where: {
            status: { in: ["Draft", "Generated"] }
          },
          orderBy: { postedDate: "desc" },
          take: 15,
          select: { id: true, role: true, company: true, matchScore: true, status: true, contactEmail: true },
        });
        return {
          toolResult: jobs,
          specialAction: { type: "jobs", data: jobs },
        };
      }

      if (queryType === "synced_emails") {
        const where: any = { userEmail };
        if (filter) {
          where.OR = [
            { fromEmail: { contains: filter, mode: "insensitive" } },
            { subject: { contains: filter, mode: "insensitive" } },
          ];
        }
        const emails = await prisma.syncedEmail.findMany({
          where,
          orderBy: { receivedAt: "desc" },
          take: 15,
          select: {
            messageId: true,
            subject: true,
            fromEmail: true,
            fromName: true,
            receivedAt: true,
            summary: true,
            isRead: true,
            emailType: true,
            aiSummary: true,
            sentiment: true,
            provider: true,
          },
        });
        const emailData = emails.map((e) => ({
          ...e,
          receivedAt: e.receivedAt.toISOString(),
        }));
        return {
          toolResult: emailData,
          specialAction: { type: "emails", data: emailData },
        };
      }

      if (queryType === "calls") {
        const upcoming = await getFollowUpsAction(userEmail, "upcoming");
        return {
          toolResult: upcoming,
          specialAction: { type: "calls", data: upcoming },
        };
      }
      if (queryType === "sent_emails") {
        // Build base where: genuine outreach only.
        // Exclude: noreply/no-reply addresses, user's own email (self-sent),
        // and gmail-synced items that aren't linked to a job post.
        const outreachWhere: any = {
          userEmail,
          AND: [
            { toEmail: { not: { contains: "noreply",  mode: "insensitive" } } },
            { toEmail: { not: { contains: "no-reply", mode: "insensitive" } } },
            { toEmail: { not: { equals: userEmail,    mode: "insensitive" } } },
            {
              OR: [
                { jobPostId: { not: null } },
                { provider:  { not: { equals: "gmail", mode: "insensitive" } } },
              ],
            },
          ],
        };

        if (filter) {
          outreachWhere.filterOR = [
            { toEmail:  { contains: filter, mode: "insensitive" } },
            { subject:  { contains: filter, mode: "insensitive" } },
            { jobPost: { is: {
              OR: [
                { company: { contains: filter, mode: "insensitive" } },
                { role:    { contains: filter, mode: "insensitive" } },
              ],
            }}},
          ];
          outreachWhere.AND.push({ OR: outreachWhere.filterOR });
          delete outreachWhere.filterOR;
        }

        const sentEmails = await prisma.sentEmail.findMany({
          where:   outreachWhere,
          orderBy: { sentAt: "desc" },
          take:    20,
          select: {
            id:        true,
            toEmail:   true,
            subject:   true,
            sentAt:    true,
            provider:  true,
            fromEmail: true,
            jobPost: {
              select: { role: true, company: true },
            },
          },
        });

        const sentEmailData = sentEmails.map((e) => ({
          id:        e.id,
          toEmail:   e.toEmail,
          subject:   e.subject,
          sentAt:    e.sentAt.toISOString(),
          provider:  e.provider,
          fromEmail: e.fromEmail,
          company:   e.jobPost?.company ?? null,
          role:      e.jobPost?.role ?? null,
        }));

        return {
          toolResult: { count: sentEmailData.length, emails: sentEmailData },
          specialAction: { type: "emails", data: sentEmailData },
        };
      }

      return { toolResult: { error: `Unknown query type: ${queryType}` } };
    }

    case "draft_email": {
      const draft: DraftEmail = {
        to: args.to as string,
        subject: args.subject as string,
        body: args.body as string,
        cc: args.cc as string | undefined,
      };
      return {
        toolResult: { drafted: true, ...draft },
        specialAction: { type: "draft", data: draft },
      };
    }

    case "schedule_call": {
      const jobId           = args.jobId as string;
      const title           = args.title as string;
      const startDateTime   = args.startDateTime as string;
      const durationMinutes = (args.durationMinutes as number) ?? 30;
      const attendeeEmail   = (args.attendeeEmail as string | undefined) ?? "";
      const notes           = (args.notes as string | undefined) ?? "";
      const timeZone        = (args.timeZone as string | undefined) ?? "Asia/Kolkata";

      // Validate jobId exists in DB
      const jobPost = await prisma.jobPost.findUnique({ where: { id: jobId }, select: { id: true, role: true, company: true } });
      if (!jobPost) {
        return { toolResult: { error: `Job not found with id: ${jobId}. Please call db_query({ type: 'job_list' }) first to get a valid job ID.` } };
      }

      try {
        const result = await bookCallAction(userEmail, {
          jobId,
          title,
          attendeeEmail,
          startDateTime,
          durationMinutes,
          notes,
          timeZone,
        });

        if (!result.success) {
          return { toolResult: { error: result.error ?? "Failed to schedule call" } };
        }

        const callData = {
          followUpId:  result.followUpId,
          meetLink:    result.meetLink,
          gcalEventId: result.gcalEventId,
          gcalEventUrl: result.gcalEventUrl,
          title,
          job:         `${jobPost.role} at ${jobPost.company}`,
          scheduledAt: startDateTime,
          durationMin: durationMinutes,
          attendeeEmail: attendeeEmail || null,
        };

        return {
          toolResult: { scheduled: true, ...callData },
          specialAction: { type: "calls", data: [callData] },
        };
      } catch (err: any) {
        console.error("[schedule_call] Error:", err?.message);
        return { toolResult: { error: err?.message ?? "Failed to schedule call" } };
      }
    }

    case "create_job_post": {
      const jobText      = args.jobText as string;
      const hintRole     = (args.role as string) || "";
      const hintCompany  = (args.company as string) || "Not specified";
      const contactEmail = (args.contactEmail as string | undefined) ?? "";
      const notes        = (args.notes as string | undefined) ?? "";

      if (!jobText || jobText.trim().length < 20) {
        return { toolResult: { error: "Job description is too short. Please ask the user to provide more details about the role, company, and requirements." } };
      }

      console.log(`[create_job_post] Starting AI analysis for "${hintRole}" at "${hintCompany}"...`);

      try {
        // Run full AI analysis — same pipeline as the main Jobs page
        const analysis = await analyzeAndGenerateAction(jobText, userEmail);

        if (!analysis.success || !analysis.result) {
          return { toolResult: { error: analysis.error ?? "AI analysis failed. Please try again." } };
        }

        const r = analysis.result;

        // Prefer user-provided hints over AI extraction if AI says "Unknown" / "Not specified"
        const finalRole    = (r.role && r.role !== "Unknown") ? r.role : hintRole;
        const finalCompany = (r.company && r.company !== "Not specified") ? r.company : hintCompany;

        // Save to DB via addJobPostAction
        const saved = await addJobPostAction({
          role:          finalRole,
          company:       finalCompany,
          originalText:  jobText,
          parsedSummary: r.parsedSummary ?? "",
          contactName:   r.contactName  ?? undefined,
          contactEmail:  r.contactEmail || contactEmail || undefined,
          matchScore:    r.matchScore ?? 50,
          tags:          r.tags ?? [],
          notes:         notes || r.notes || undefined,
          generatedTemplates: {
            coldEmail:   r.generatedTemplates?.coldEmail,
            proposal:    r.generatedTemplates?.proposal,
            linkedin:    r.generatedTemplates?.linkedin,
            coverLetter: r.generatedTemplates?.coverLetter,
          },
          suggestAttachResume: r.suggestAttachResume ?? undefined,
        });

        const jobData = {
          id:          saved.id,
          role:        saved.role,
          company:     saved.company,
          matchScore:  saved.matchScore,
          status:      saved.status,
          contactEmail: saved.contactEmail,
          tags:        saved.tags,
        };

        console.log(`[create_job_post] Created job ${saved.id} — ${saved.role} at ${saved.company} (score: ${saved.matchScore})`);

        return {
          toolResult: { created: true, ...jobData },
          specialAction: { type: "jobs", data: [jobData] },
        };
      } catch (err: any) {
        console.error("[create_job_post] Error:", err?.message);
        return { toolResult: { error: err?.message ?? "Failed to create job post" } };
      }
    }

    default:
      return { toolResult: { error: `Unknown function: ${name}` } };
  }
}

/** Call Gemini with function-calling support */
async function callGemini(
  systemPrompt: string,
  contents: any[],
  withTools = true
): Promise<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body: any = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (withTools) {
    body.tools = [{ functionDeclarations: FUNCTION_DECLARATIONS }];
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  // Check for function call
  const funcPart = parts.find((p: any) => p.functionCall);
  if (funcPart) {
    return {
      functionCall: {
        name: funcPart.functionCall.name,
        args: funcPart.functionCall.args ?? {},
      },
    };
  }

  // Text response
  const text = parts.map((p: any) => p.text ?? "").join("").trim();
  return { text };
}

// ─── Main Chat Action ──────────────────────────────────────────────────────

/**
 * Main entry point for the dashboard chatbot.
 * Runs a Gemini agent loop with Corsair tools.
 */
export async function processDashboardChatAction(
  userEmail: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  if (!GEMINI_API_KEY) {
    return {
      reply: "AI is not configured. Please set GEMINI_API_KEY in your environment.",
      actionType: "error",
    };
  }

  try {
    // 1. Gather user context
    const [profile, mailAccounts] = await Promise.all([
      getUserProfileAction(userEmail),
      prisma.mailAccount.findMany({ where: { userEmail }, select: { provider: true, accountEmail: true } }),
    ]);

    const connectedProviders = mailAccounts.map((a) => `${a.provider} (${a.accountEmail})`).join(", ") || "None connected";
    const gmailConnected = mailAccounts.some((a) => a.provider === "gmail");

    // 2. Build system prompt
    const systemPrompt = `You are The Pitchly AI, an intelligent AI assistant embedded in The Pitchly — a professional job outreach and proposal management platform.

## USER PROFILE
Name: ${profile.name}
Role: ${profile.role}
Skills: ${profile.skills.join(", ")}
Portfolio: ${profile.portfolioUrl || "Not set"}
Email: ${profile.email || userEmail}

## PLATFORM CONTEXT
- Current Time: ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })} (IST) / ${new Date().toISOString()} (UTC)
- Connected mail accounts: ${connectedProviders}
- Gmail integration: ${gmailConnected ? "✅ Connected (use corsair_run for Gmail operations)" : "❌ Not connected"}

## YOUR CAPABILITIES
You can:
1. Answer questions about the user's profile, skills, and job applications
2. Fetch and search emails using Gmail via Corsair (use corsair_run with gmail.api.messages.list)
3. Fetch full email threads (gmail.api.threads.get)
4. Draft emails for the user to review (use draft_email tool)
5. Send emails (gmail.api.messages.send — only after user reviews the draft)
6. Query the local database for job stats and applications (use db_query)
7. Query unapplied / pending jobs where status is Draft or Generated (use db_query with type 'pending_jobs')
8. Query scheduled calls/follow-ups (use db_query with type 'calls')
9. List calendar events (googlecalendar.api.events.getMany)
10. Schedule a Google Meet call linked to a job (use schedule_call tool — see workflow below)
11. **Create a new job post** from a description the user provides (use create_job_post tool)
12. **Show prioritized inbox** — use db_query({ type: 'synced_emails' }) to show AI-classified emails with priority badges (interview calls, offer letters, rejections, freelance leads) and sentiment dots. Use this whenever user asks: "show my inbox", "list my emails", "any interview calls?", "show priority emails", "check inbox", "any rejections?", "any offers?".

## INBOX / PRIORITY EMAIL — WORKFLOW
When the user asks to see their inbox OR asks about specific email types (interviews, offers, rejections, leads):
STEP 1: Call db_query({ type: 'synced_emails' }) — optionally pass a filter for the email type keyword.
STEP 2: The UI will render each email as a priority card with colored type badge + sentiment dot + AI summary.
STEP 3: In your text reply, give a brief summary: e.g. "You have 2 interview calls, 1 offer letter, and 3 rejections in your inbox."

If user asks specifically for a type, filter by keyword. Examples:
- "show interview emails" → db_query({ type: 'synced_emails', filter: 'interview' })
- "any rejections?" → db_query({ type: 'synced_emails', filter: 'rejection' })
- "show positive emails" → db_query({ type: 'synced_emails' }) then mention in text reply

## CREATING A JOB POST — WORKFLOW
When the user wants to add a new job, says "add this job", "save this job", "create a job post", or pastes a job description:

STEP 1: If they only mentioned a company/role name without details, ask: "Could you paste the job description or share more details? (requirements, contact email, etc.)"
STEP 2: Once you have at least a role title + brief description (20+ characters), call create_job_post immediately.
STEP 3: The system will auto-analyze: match score, cold email, proposal, cover letter are all auto-generated.
STEP 4: Tell the user the job was created and suggest they open it in the Jobs page to review the generated templates.

## SCHEDULING A CALL — MANDATORY WORKFLOW
When a user asks to schedule a call, interview, meeting, or book time with a client:

STEP 1: Call db_query({ type: 'job_list' }) to fetch their job posts.
STEP 2: STOP — say only "Here are your jobs — please select the one this call is for:" and nothing else. The UI will render a job selection card automatically.
STEP 3: The user picks the job and fills in the time/date via the interactive scheduling UI. You do NOT need to do anything else.

NEVER call schedule_call — it does not exist. NEVER ask the user for time/date/duration in text. The UI handles the entire scheduling flow after you call db_query(job_list).
NEVER use corsair_run for calendar event creation.

## RULES
- If the user asks you to find job leads, search for freelance projects, or scan for new gigs, DO NOT try to search. Instead, decline politely and inform them: "Currently you have to connect your own WhatsApp group and you can read messages, or directly paste any job post. We are currently working on it so that we can have a scraper as well."
- For ALL Gmail operations, ALWAYS use the corsair_run tool. NEVER attempt to call Gmail API directly.
- For sending emails, first use draft_email to show a compose card. Never auto-send without user approval.
- When fetching emails, use gmail.api.messages.list with a 'q' parameter for search queries.
- For local job/application/call data, use db_query (types: 'job_stats', 'job_list', 'pending_jobs', 'calls', 'sent_emails', 'synced_emails').
- **PREFER db_query(synced_emails) over corsair_run for inbox listing** — it's faster and shows AI-classified priority data (emailType, aiSummary, sentiment).
- For scheduling calls, call db_query({ type: 'job_list' }) — the UI card handles all booking. Do NOT call schedule_call.
- When a user asks for a "meeting link", "meet link", or "conference link", ALWAYS look for and provide the actual video conference URL (e.g., from 'hangoutLink' or 'conferenceData' in Google Calendar events, or 'meetLink' in database calls). DO NOT confuse this with the calendar event page URL ('htmlLink' or 'gcalEventUrl'), which is just a link to view the event on Google Calendar. Only provide the calendar event page link as a fallback if the video conference link is not available.
- Be concise, helpful, and professional. Use emojis sparingly.
- If Gmail is not connected, suggest the user connect it from the Mail Account settings page.

## AVAILABLE CORSAIR TOOLS
${gmailConnected ? `Gmail: gmail.api.messages.list, gmail.api.messages.get, gmail.api.messages.send, gmail.api.threads.get, gmail.api.drafts.create` : "Gmail: not connected"}
Calendar: googlecalendar.api.events.getMany, googlecalendar.api.events.create`;

    // 3. Build conversation history for Gemini (multi-turn)
    const contents: any[] = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // 4. Agent loop (up to 4 turns for function calling)
    let specialAction: { type: string; data: unknown } | undefined;
    let finalText = "";

    for (let turn = 0; turn < 4; turn++) {
      const geminiResponse = await callGemini(systemPrompt, contents, true);

      if (geminiResponse.text) {
        finalText = geminiResponse.text;
        break;
      }

      if (geminiResponse.functionCall) {
        const { name, args } = geminiResponse.functionCall;
        console.log(`[ChatAction] Gemini function_call: ${name}`, args);

        // Add the model's function call to history
        contents.push({
          role: "model",
          parts: [{ functionCall: { name, args } }],
        });

        // Execute the function
        const { toolResult, specialAction: sa } = await executeFunctionCall(name, args, userEmail);
        if (sa && !specialAction) {
          specialAction = sa;
        }

        // Add function result to history
        contents.push({
          role: "user",
          parts: [{ functionResponse: { name, response: { result: toolResult } } }],
        });

        // Continue loop — Gemini will now summarize the result
        continue;
      }

      // Neither text nor function call — shouldn't happen
      finalText = "I encountered an unexpected response. Please try again.";
      break;
    }

    if (!finalText) {
      finalText = "I processed your request. See the results above.";
    }

    // 5. Return response
    if (specialAction) {
      return {
        reply: finalText,
        actionType: specialAction.type as ChatResponse["actionType"],
        actionData: specialAction.data,
      };
    }

    return { reply: finalText, actionType: "text" };
  } catch (err: any) {
    console.error("[processDashboardChatAction] Error:", err);
    const msg = err?.message ?? "Something went wrong. Please try again.";
    return { reply: msg, actionType: "error" };
  }
}

/**
 * Send an email via Corsair Gmail or Zoho after user approves the draft.
 */
export async function sendDraftEmailAction(
  userEmail: string,
  draft: DraftEmail,
  provider?: "gmail" | "zoho"
): Promise<{ success: boolean; error?: string }> {
  try {
    let targetProvider = provider;
    if (!targetProvider) {
      const accounts = await prisma.mailAccount.findMany({
        where: { userEmail }
      });
      const providers = accounts.map(a => a.provider);
      if (providers.includes("gmail")) {
        targetProvider = "gmail";
      } else if (providers.includes("zoho")) {
        targetProvider = "zoho";
      } else {
        return { success: false, error: "No connected mail accounts found." };
      }
    }

    if (targetProvider === "zoho") {
      const account = await prisma.mailAccount.findUnique({
        where: { userEmail_provider: { userEmail, provider: "zoho" } },
      });
      if (!account) {
        return { success: false, error: "Zoho account is not connected." };
      }
      const fromEmail = account.accountEmail;

      const { sendMailAction } = await import("./mail-actions");
      const result = await sendMailAction(
        userEmail,
        draft.to,
        draft.subject,
        draft.body,
        undefined,
        draft.cc
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Log to SentEmail table
      try {
        await prisma.sentEmail.create({
          data: {
            userEmail,
            provider: "zoho",
            fromEmail,
            toEmail: draft.to,
            subject: draft.subject,
            body: draft.body,
            jobPostId: null,
            zohoMsgId: result.zohoMsgId || null,
            sentAt: new Date(),
          },
        });
      } catch (e: any) {
        console.error("[sendDraftEmailAction] Zoho SentEmail log error:", e);
      }

      return { success: true };
    } else {
      // Build RFC 2822 raw message for Gmail
      const account = await prisma.mailAccount.findUnique({
        where: { userEmail_provider: { userEmail, provider: "gmail" } },
      });
      const fromEmail = account?.accountEmail ?? userEmail;

      const rawLines = [
        `From: ${fromEmail}`,
        `To: ${draft.to}`,
        ...(draft.cc ? [`Cc: ${draft.cc}`] : []),
        `Subject: ${draft.subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        draft.body,
      ];
      const raw = rawLines.join("\r\n");
      const encoded = Buffer.from(raw).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const result = await executeCorsairOp(userEmail, "gmail.api.messages.send", { raw: encoded });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Log to SentEmail table
      try {
        await prisma.sentEmail.create({
          data: {
            userEmail,
            provider: "gmail",
            fromEmail,
            toEmail: draft.to,
            subject: draft.subject,
            body: draft.body,
            jobPostId: null,
            zohoMsgId: null,
            sentAt: new Date(),
          },
        });
      } catch { /* non-critical */ }

      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to send email." };
  }
}

/**
 * Book a call directly from the client-side scheduling UI.
 * Called after user selects a job, picks time/date from the analog clock card, and confirms.
 */
export async function bookCallFromBotAction(
  userEmail: string,
  input: {
    jobId: string;
    jobRole: string;
    jobCompany: string;
    title: string;
    startDateTime: string;
    durationMinutes: number;
    attendeeEmail?: string;
    notes?: string;
    timeZone?: string;
  }
): Promise<{ success: boolean; meetLink?: string; gcalEventUrl?: string; error?: string }> {
  try {
    const result = await bookCallAction(userEmail, {
      jobId:           input.jobId,
      title:           input.title,
      attendeeEmail:   input.attendeeEmail ?? "",
      startDateTime:   input.startDateTime,
      durationMinutes: input.durationMinutes,
      notes:           input.notes ?? "",
      timeZone:        input.timeZone ?? "Asia/Kolkata",
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success:      true,
      meetLink:     result.meetLink,
      gcalEventUrl: result.gcalEventUrl,
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to book call" };
  }
}

// ─── Schedule Context Action ──────────────────────────────────────────────────
// Fetches full job details + generates AI meeting agenda for pre-filling the schedule form.
export async function getScheduleContextAction(
  userEmail: string,
  jobId: string
): Promise<{
  contactEmail?: string;
  contactName?: string;
  agenda?: string;
  error?: string;
}> {
  try {
    const job = await prisma.jobPost.findFirst({
      where: { id: jobId },
      select: {
        role: true, company: true,
        parsedSummary: true, matchedSkills: true, missingSkills: true,
        contactEmail: true, contactName: true,
      },
    });
    if (!job) return { error: "Job not found" };

    // Build a short meeting agenda with AI
    const { getProvider } = await import("../utils/ai/service");
    const provider = getProvider();

    let agenda = "";
    if (provider) {
      const systemPrompt = `You are a freelance developer preparing for a client intro call. Generate a concise meeting agenda with exactly 3 bullet points. Be professional and specific. Output ONLY the 3 bullet points, nothing else, no preamble.`;
      const userPrompt = `Job: ${job.role} at ${job.company || "a company"}
Summary: ${(job.parsedSummary || "").slice(0, 400)}
My matched skills: ${(job.matchedSkills || []).slice(0, 5).join(", ")}
Skills to address: ${(job.missingSkills || []).slice(0, 3).join(", ")}

Write a 3-bullet agenda for an intro/interview call.`;

      try {
        agenda = await provider.generate({
          systemPrompt,
          userPrompt,
          temperature: 0.5,
          maxTokens: 200,
          apiType: "job_analysis",
        });
      } catch { agenda = ""; }
    }

    return {
      contactEmail: job.contactEmail ?? undefined,
      contactName:  job.contactName  ?? undefined,
      agenda:       agenda.trim()    || undefined,
    };
  } catch (err: any) {
    return { error: err?.message ?? "Failed to fetch context" };
  }
}
