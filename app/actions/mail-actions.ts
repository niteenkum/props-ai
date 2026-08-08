"use server";

// ─── Mail Server Actions ───────────────────────────────────────────────────
// All mail operations: account status, token refresh, read inbox, send email.
// Zoho-first implementation — provider field is extensible.

import { prisma } from "../utils/prisma";
import { Pool } from "pg";

// ─── Raw pg fallback for SentEmail ───────────────────────────────────────────
// Next.js bundles server actions, so a stale PrismaClient (without SentEmail)
// can persist even after `prisma generate`. We bypass Prisma entirely here and
// talk to Postgres directly via `pg` Pool — no bundle-cache issues.

function rawPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false }
  });
}

async function rawInsertSentEmail(data: {
  userEmail:  string;
  jobPostId:  string | null;
  provider:   string;
  fromEmail:  string;
  toEmail:    string;
  subject:    string;
  body:       string;
  zohoMsgId:  string | null;
}): Promise<{ id: string; sentAt: string }> {
  const pool = rawPool();
  try {
    let validJobPostId: string | null = null;
    let validAdminJobId: string | null = null;

    if (data.jobPostId) {
      const jobRes = await pool.query<{ id: string }>(
        `SELECT id FROM "JobPost" WHERE id = $1 LIMIT 1`,
        [data.jobPostId]
      );
      if (jobRes.rows.length > 0) {
        validJobPostId = data.jobPostId;
      } else {
        const adminRes = await pool.query<{ id: string }>(
          `SELECT id FROM "AdminJob" WHERE id = $1 LIMIT 1`,
          [data.jobPostId]
        );
        if (adminRes.rows.length > 0) {
          validAdminJobId = data.jobPostId;
        }
      }
    }

    const res = await pool.query<{ id: string; sent_at: Date }>(
      `INSERT INTO "SentEmail"
         (id, "userEmail", "jobPostId", "adminJobId", provider, "fromEmail", "toEmail", subject, body, "zohoMsgId", "sentAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, "sentAt" AS sent_at`,
      [
        data.userEmail, validJobPostId, validAdminJobId, data.provider,
        data.fromEmail, data.toEmail,   data.subject,
        data.body,      data.zohoMsgId,
      ],
    );
    const row = res.rows[0];
    console.log(`[rawInsertSentEmail] ✅ id=${row.id} (jobPostId=${validJobPostId}, adminJobId=${validAdminJobId})`);
    return { id: row.id, sentAt: row.sent_at.toISOString() };
  } finally {
    await pool.end();
  }
}

async function rawSelectSentEmails(jobPostId: string): Promise<SentEmailRecord[]> {
  const pool = rawPool();
  try {
    const res = await pool.query<{
      id: string; provider: string; from_email: string;
      to_email: string; subject: string; body: string;
      zoho_msg_id: string | null; sent_at: Date;
    }>(
      `SELECT id, provider,
              "fromEmail"  AS from_email,
              "toEmail"    AS to_email,
              subject, body,
              "zohoMsgId"  AS zoho_msg_id,
              "sentAt"     AS sent_at
       FROM   "SentEmail"
       WHERE  "jobPostId" = $1 OR "adminJobId" = $1
       ORDER  BY "sentAt" DESC`,
      [jobPostId],
    );
    return res.rows.map(r => ({
      id:        r.id,
      provider:  r.provider,
      fromEmail: r.from_email,
      toEmail:   r.to_email,
      subject:   r.subject,
      body:      r.body,
      sentAt:    r.sent_at.toISOString(),
      zohoMsgId: r.zoho_msg_id ?? undefined,
    }));
  } finally {
    await pool.end();
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MailAccountInfo {
  provider:     string;
  accountEmail: string;
  connected:    true;
}

export interface MailMessage {
  messageId:  string;
  subject:    string;
  fromEmail:  string;
  fromName:   string;
  receivedAt: string;   // ISO string
  summary:    string;   // first ~120 chars of snippet
  isRead:     boolean;
  provider:   "zoho" | "gmail"; // which account this message came from
  emailType?: string;
  aiSummary?: string;
  sentiment?: string;
  id?:        string;
  body?:      string;
}

export interface SendResult {
  success:    boolean;
  error?:     string;
  zohoMsgId?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function zohoAuthBase(region: string): string {
  return `https://accounts.zoho.${region}`;
}

// ─── 1. Get all linked mail accounts ──────────────────────────────────────

/** Returns ALL mail accounts linked for a user (Zoho + Gmail combined). */
export async function getMailAccountsAction(
  userEmail: string
): Promise<MailAccountInfo[]> {
  if (!userEmail) return [];

  const accounts = await prisma.mailAccount.findMany({
    where: { userEmail },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map(a => ({
    provider:     a.provider,
    accountEmail: a.accountEmail,
    connected:    true as const,
  }));
}

/** Legacy single-account getter — returns first linked account (for backward compat). */
export async function getMailAccountAction(
  userEmail: string
): Promise<MailAccountInfo | null> {
  const all = await getMailAccountsAction(userEmail);
  return all[0] ?? null;
}

// ─── 2. Disconnect (delete tokens for a specific provider) ────────────────

export async function disconnectMailAction(
  userEmail: string,
  provider: "zoho" | "gmail" = "zoho",
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.mailAccount.delete({
      where: { userEmail_provider: { userEmail, provider } },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Account not found or already disconnected." };
  }
}

// ─── 3. Refresh Zoho access token ─────────────────────────────────────────
// Returns the fresh access token (also updates the DB).
// Called internally by fetchInbox / sendMail when the token is expired.

export async function refreshZohoTokenAction(
  userEmail: string
): Promise<string | null> {
  const account = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "zoho" } },
  });
  if (!account || account.provider !== "zoho") return null;

  const clientId     = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;

  // Derive the region-correct accounts server from the stored mail API base
  // e.g. https://mail.zoho.in → https://accounts.zoho.in
  const authBase = account.apiBase
    ? account.apiBase.replace("mail.zoho", "accounts.zoho")
    : zohoAuthBase(process.env.ZOHO_REGION || "com");

  try {
    const res = await fetch(`${authBase}/oauth/v2/token`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        refresh_token: account.refreshToken ?? "",
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    "refresh_token",
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error || !data.access_token) {
      console.error("[refreshZohoToken] Refresh failed:", data);
      return null;
    }

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await prisma.mailAccount.update({
      where:  { userEmail_provider: { userEmail, provider: "zoho" } },
      data:   { accessToken: data.access_token, expiresAt },
    });

    return data.access_token as string;
  } catch (err) {
    console.error("[refreshZohoToken] Error:", err);
    return null;
  }
}

// ─── Internal: get a valid (possibly refreshed) access token ───────────────

async function getValidAccessToken(
  userEmail: string
): Promise<{ token: string; accountId: string | null; apiBase: string; accountEmail: string } | null> {
  const account = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "zoho" } },
  });
  if (!account) {
    console.warn(`[getValidAccessToken] ⚠️ No MailAccount found for userEmail="${userEmail}"`);
    return null;
  }

  // Fall back to env region if apiBase was never stored (legacy rows)
  const apiBase = account.apiBase
    ?? `https://mail.zoho.${process.env.ZOHO_REGION || "com"}`;

  const isExpired = new Date() >= account.expiresAt;
  let token: string | null = null;

  if (isExpired) {
    console.log(`[getValidAccessToken] 🔄 Token expired (${account.expiresAt.toISOString()}). Attempting refresh for ${userEmail}...`);
    token = await refreshZohoTokenAction(userEmail);
    if (!token) {
      console.warn(`[getValidAccessToken] ⚠️ Refresh failed. Falling back to existing accessToken.`);
      token = account.accessToken || null;
    }
  } else {
    token = account.accessToken;
  }

  if (!token) {
    console.error(`[getValidAccessToken] ❌ No valid accessToken available for ${userEmail}. Re-authentication required at /api/mail/zoho/connect?email=${encodeURIComponent(userEmail)}`);
    return null;
  }
  return { token, accountId: account.zohoAccountId, apiBase, accountEmail: account.accountEmail };
}

// ─── 4. Fetch inbox messages ──────────────────────────────────────────────
// NOTE: The /folders API requires ZohoMail.folders.READ scope (not granted).
// /messages/view with NO folderId returns all recent mail — this works fine.

// ─── 4. Sync Helpers & Database Storage ──────────────────────────────────────

export async function classifyEmailWithAI(
  userEmail: string,
  subject: string,
  fromEmail: string,
  fromName: string,
  snippet: string
): Promise<{ type: string; summary: string; sentiment: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { saveTokens: true }
    });

    if (user?.saveTokens) {
      console.log(`[classifyEmailWithAI] Skipping LLM call because Save Tokens is ON for ${userEmail}`);
      const type = runHeuristicClassification(subject, fromEmail, snippet);
      return { type, summary: snippet.slice(0, 120), sentiment: "neutral" };
    }

    const { getProvider } = await import("../utils/ai/service");
    const provider = getProvider();
    if (!provider) {
      const type = runHeuristicClassification(subject, fromEmail, snippet);
      return { type, summary: snippet.slice(0, 120), sentiment: "neutral" };
    }

    const systemPrompt = `You are an AI assistant that analyzes incoming email messages for a professional developer's application tracker.
Analyze the email and categorize it into one of these types:
- interview_call: Interview invitations, scheduling requests, technical test details, or meeting links.
- freelance_opportunity: Freelance projects, contract work offers, gig offers, or project proposals.
- remote_opportunity: Full-time or part-time remote job offers, recruiting requests for remote roles.
- rejection: Rejections, updates saying the application won't proceed, or closing/filling the position.
- offer_letter: Formal job offers, employment offers, or letters of intent.
- general: General updates, newsletters, confirmations of application receipt, or other updates.

Also, write a concise, 1-sentence summary of the email's key message or action item, and determine the overall sentiment (positive, neutral, or negative).

You must respond with a valid JSON object only. Do not include markdown code block formatting (e.g. no \`\`\`json).
The response JSON schema must match exactly:
{
  "type": "interview_call" | "freelance_opportunity" | "remote_opportunity" | "rejection" | "offer_letter" | "general",
  "summary": "1-sentence summary of the email",
  "sentiment": "positive" | "neutral" | "negative"
}`;

    const userPrompt = `Subject: ${subject}
From: ${fromName} <${fromEmail}>
Snippet: ${snippet}`;

    const rawResponse = await provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 256,
      apiType: "email_classification",
      jsonMode: true,
      userEmail,
    });

    let jsonStr = rawResponse.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    return {
      type: parsed.type || "general",
      summary: parsed.summary || snippet.slice(0, 120),
      sentiment: parsed.sentiment || "neutral",
    };
  } catch (error) {
    console.error("[AI Classification] Failed, falling back to heuristics:", error);
    const type = runHeuristicClassification(subject, fromEmail, snippet);
    return { type, summary: snippet.slice(0, 120), sentiment: "neutral" };
  }
}

function runHeuristicClassification(subject: string, fromEmail: string, snippet: string): string {
  const subjectLower = subject.toLowerCase();
  const bodyLower = snippet.toLowerCase();

  const interviewKeywords = ["interview", "schedule", "zoom", "meet.google", "google meet", "calendar", "calendly", "call invitation", "availability"];
  const freelanceKeywords = ["freelance", "contract", "gig", "upwork", "fiverr", "toptal", "hourly rate", "part-time project"];
  const remoteKeywords = ["remote", "wfh", "work from home", "anywhere", "distributed"];
  const rejectionKeywords = ["not proceeding", "thank you for your time", "unable to move forward", "decided to move forward with other", "unsuccessful", "rejection", "unfortunately"];
  const offerKeywords = ["offer letter", "formal offer", "job offer", "employment agreement", "onboarding"];

  if (interviewKeywords.some(k => subjectLower.includes(k) || bodyLower.includes(k))) {
    return "interview_call";
  }
  if (freelanceKeywords.some(k => subjectLower.includes(k) || bodyLower.includes(k))) {
    return "freelance_opportunity";
  }
  if (remoteKeywords.some(k => subjectLower.includes(k) || bodyLower.includes(k))) {
    return "remote_opportunity";
  }
  if (rejectionKeywords.some(k => subjectLower.includes(k) || bodyLower.includes(k))) {
    return "rejection";
  }
  if (offerKeywords.some(k => subjectLower.includes(k) || bodyLower.includes(k))) {
    return "offer_letter";
  }
  return "general";
}

async function syncZohoEmails(userEmail: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[syncZohoEmails] 🚀 Starting sync for ${userEmail}`);
  const auth = await getValidAccessToken(userEmail);
  if (!auth) {
    return { success: false, error: "Zoho account not connected or token expired." };
  }

  const { token, accountId, apiBase } = auth;
  let activeAccountId = accountId;
  if (!activeAccountId) {
    try {
      const accRes = await fetch(`${apiBase}/api/accounts`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      });
      if (accRes.ok) {
        const accData   = await accRes.json();
        const firstAcc  = accData?.data?.[0];
        activeAccountId = String(firstAcc?.accountId ?? firstAcc?.accountID ?? "");
        if (activeAccountId) {
          await prisma.mailAccount.update({
            where: { userEmail_provider: { userEmail, provider: "zoho" } },
            data:  { zohoAccountId: activeAccountId },
          });
        }
      }
    } catch { /* proceed */ }
  }

  if (!activeAccountId) {
    return { success: false, error: "Could not determine Zoho account ID." };
  }

  try {
    const cursor = await prisma.emailSyncCursor.findUnique({
      where: { userEmail_provider: { userEmail, provider: "zoho" } }
    });

    const params = new URLSearchParams({
      limit: "50",
      sortBy: "date",
    });
    const url = `${apiBase}/api/accounts/${activeAccountId}/messages/view?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });

    if (!res.ok) {
      return { success: false, error: `Zoho API error (${res.status})` };
    }

    const data = await res.json();
    const raw: any[] = data?.data ?? [];
    console.log(`[syncZohoEmails] Fetched ${raw.length} messages from Zoho`);

    let newEmailsCount = 0;
    let maxReceivedAt = cursor?.lastSyncAt ? new Date(cursor.lastSyncAt) : new Date(0);

    for (const m of raw) {
      const messageId = String(m.messageId ?? m.msgId ?? "");
      if (!messageId) continue;

      const receivedAt = m.receivedTime
        ? new Date(Number(m.receivedTime))
        : new Date();

      if (cursor && receivedAt.getTime() <= new Date(cursor.lastSyncAt).getTime()) {
        continue;
      }

      const exists = await prisma.syncedEmail.findUnique({
        where: {
          userEmail_provider_messageId: {
            userEmail,
            provider: "zoho",
            messageId
          }
        }
      });

      if (exists) continue;

      const subject = m.subject ?? "(no subject)";
      const fromEmail = m.fromAddress ?? m.sender ?? "";
      const fromName = m.fromDisplayString ?? m.senderDisplayName ?? m.sender ?? "";
      const summary = (m.summary ?? m.content ?? "").slice(0, 120);

      const aiResult = await classifyEmailWithAI(userEmail, subject, fromEmail, fromName, summary);

      await prisma.syncedEmail.create({
        data: {
          userEmail,
          provider: "zoho",
          messageId,
          subject,
          fromEmail,
          fromName,
          receivedAt,
          summary,
          isRead: m.isRead === true || m.status === "0" || m.status === "read",
          emailType: aiResult.type,
          aiSummary: aiResult.summary,
          sentiment: aiResult.sentiment,
        }
      });

      newEmailsCount++;
      if (receivedAt.getTime() > maxReceivedAt.getTime()) {
        maxReceivedAt = receivedAt;
      }
    }

    if (newEmailsCount > 0 || !cursor) {
      await prisma.emailSyncCursor.upsert({
        where: { userEmail_provider: { userEmail, provider: "zoho" } },
        create: { userEmail, provider: "zoho", lastSyncAt: maxReceivedAt },
        update: { lastSyncAt: maxReceivedAt }
      });
    }

    console.log(`[syncZohoEmails] Sync completed. Saved ${newEmailsCount} new emails.`);
    return { success: true };
  } catch (err: any) {
    console.error("[syncZohoEmails] Zoho sync exception:", err);
    return { success: false, error: err?.message ?? "Zoho sync failed." };
  }
}

async function syncGmailEmails(userEmail: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[syncGmailEmails] 🚀 Starting sync for ${userEmail}`);
  const account = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "gmail" } },
  });
  if (!account) return { success: false, error: "Gmail account not connected." };

  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);

    const cursor = await prisma.emailSyncCursor.findUnique({
      where: { userEmail_provider: { userEmail, provider: "gmail" } }
    });

    let listParams: any = {
      maxResults: 50,
      labelIds: ["INBOX"],
    };

    if (cursor) {
      const epochSecs = Math.floor(new Date(cursor.lastSyncAt).getTime() / 1000);
      listParams.q = `after:${epochSecs}`;
    }

    const listRes = await tenant.gmail.api.messages.list(listParams) as any;
    const msgIds: string[] = (listRes.messages ?? []).map((m: any) => m.id).filter(Boolean);
    console.log(`[syncGmailEmails] Found ${msgIds.length} candidate Gmail messages since last sync`);

    if (msgIds.length === 0) {
      return { success: true };
    }

    let newEmailsCount = 0;
    let maxReceivedAt = cursor?.lastSyncAt ? new Date(cursor.lastSyncAt) : new Date(0);

    for (const id of msgIds) {
      try {
        const exists = await prisma.syncedEmail.findUnique({
          where: {
            userEmail_provider_messageId: {
              userEmail,
              provider: "gmail",
              messageId: id
            }
          }
        });

        if (exists) continue;

        const meta = await tenant.gmail.api.messages.get({
          id,
          format: "full",
        }) as any;

        const headers = (meta?.payload?.headers ?? []) as { name: string; value: string }[];
        const getH = (name: string) =>
          headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

        const fromRaw   = getH("From");
        const fromMatch = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
        const fromName  = fromMatch?.[1]?.trim() || fromRaw.split("@")[0];
        const fromEmail = fromMatch?.[2]?.trim() ?? fromRaw;
        const subject   = getH("Subject") || "(no subject)";

        const receivedAt = meta?.internalDate
          ? new Date(Number(meta.internalDate))
          : (getH("Date") ? new Date(getH("Date")) : new Date());

        const summary = (meta.snippet ?? "").slice(0, 120);

        const aiResult = await classifyEmailWithAI(userEmail, subject, fromEmail, fromName, summary);

        await prisma.syncedEmail.create({
          data: {
            userEmail,
            provider: "gmail",
            messageId: id,
            subject,
            fromEmail,
            fromName,
            receivedAt,
            summary,
            isRead: !(meta.labelIds ?? []).includes("UNREAD"),
            emailType: aiResult.type,
            aiSummary: aiResult.summary,
            sentiment: aiResult.sentiment,
          }
        });

        newEmailsCount++;
        if (receivedAt.getTime() > maxReceivedAt.getTime()) {
          maxReceivedAt = receivedAt;
        }
      } catch (errMsg) {
        console.warn(`[syncGmailEmails] Skipping message ${id} due to error:`, errMsg);
      }
    }

    if (newEmailsCount > 0 || !cursor) {
      await prisma.emailSyncCursor.upsert({
        where: { userEmail_provider: { userEmail, provider: "gmail" } },
        create: { userEmail, provider: "gmail", lastSyncAt: maxReceivedAt },
        update: { lastSyncAt: maxReceivedAt }
      });
    }

    console.log(`[syncGmailEmails] Gmail sync completed. Saved ${newEmailsCount} new emails.`);
    return { success: true };
  } catch (err: any) {
    console.error("[syncGmailEmails] Gmail sync exception:", err);
    return { success: false, error: err?.message ?? "Gmail sync failed." };
  }
}

async function getSyncedEmailsFromDb(
  userEmail: string,
  provider?: "zoho" | "gmail",
  limit = 50
): Promise<MailMessage[]> {
  const whereClause: any = { userEmail };
  if (provider) {
    whereClause.provider = provider;
  }

  const emails = await prisma.syncedEmail.findMany({
    where: whereClause,
    orderBy: { receivedAt: "desc" },
    take: limit,
  });

  return emails.map(m => ({
    messageId:  m.messageId,
    subject:    m.subject,
    fromEmail:  m.fromEmail,
    fromName:   m.fromName,
    receivedAt: m.receivedAt.toISOString(),
    summary:    m.summary,
    isRead:     m.isRead,
    provider:   m.provider as "gmail" | "zoho",
    emailType:  m.emailType,
    aiSummary:  m.aiSummary ?? undefined,
    sentiment:  m.sentiment ?? undefined,
  }));
}

// ─── 4a. Fetch Zoho inbox messages (with Sync) ──────────────────────────────────

export async function fetchInboxAction(
  userEmail: string,
  limit = 20
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  console.log(`\n[fetchInbox] 🚀 Sync & Fetch for Zoho: ${userEmail}`);
  const syncRes = await syncZohoEmails(userEmail);
  
  try {
    const messages = await getSyncedEmailsFromDb(userEmail, "zoho", limit);
    return { 
      success: true, 
      messages,
      error: syncRes.success ? undefined : syncRes.error 
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to query database." };
  }
}

// ─── 4b. Fetch Gmail inbox messages (with Sync) ──────────────────────────────────

export async function fetchGmailInboxAction(
  userEmail: string,
  limit = 20
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  console.log(`\n[fetchGmailInbox] 🚀 Sync & Fetch for Gmail: ${userEmail}`);
  const syncRes = await syncGmailEmails(userEmail);
  
  try {
    const messages = await getSyncedEmailsFromDb(userEmail, "gmail", limit);
    return { 
      success: true, 
      messages,
      error: syncRes.success ? undefined : syncRes.error 
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to query database." };
  }
}

// ─── 4c. Unified inbox — Zoho + Gmail combined (with Sync) ───────────────────────

export async function fetchUnifiedInboxAction(
  userEmail: string,
  limit = 50
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string; providerErrors?: Record<string, string> }> {
  const perProvider = Math.ceil(limit / 2);
  console.log(`[fetchUnifiedInbox] Syncing and fetching up to ${limit} emails for ${userEmail}`);

  const [zohoSync, gmailSync] = await Promise.allSettled([
    syncZohoEmails(userEmail),
    syncGmailEmails(userEmail)
  ]);

  const providerErrors: Record<string, string> = {};
  if (zohoSync.status === "fulfilled" && !zohoSync.value.success) {
    providerErrors["zoho"] = zohoSync.value.error ?? "Zoho sync failed";
  } else if (zohoSync.status === "rejected") {
    providerErrors["zoho"] = "Zoho sync failed";
  }

  if (gmailSync.status === "fulfilled" && !gmailSync.value.success) {
    providerErrors["gmail"] = gmailSync.value.error ?? "Gmail sync failed";
  } else if (gmailSync.status === "rejected") {
    providerErrors["gmail"] = "Gmail sync failed";
  }

  try {
    const messages = await getSyncedEmailsFromDb(userEmail, undefined, limit);
    return {
      success: true,
      messages,
      providerErrors: Object.keys(providerErrors).length > 0 ? providerErrors : undefined
    };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Failed to query database.", providerErrors };
  }
}


// ─── 4d. Fetch a Gmail thread (click-to-open) ────────────────────────────────
// Fetches the full thread for a clicked Gmail message.
// Returns ThreadMessage[] in the same shape as the Zoho thread action.

export async function fetchGmailThreadAction(
  userEmail:  string,
  messageId:  string,   // Gmail message ID (e.g. "19e95b7b3648b5cc")
): Promise<{ success: boolean; messages?: ThreadMessage[]; error?: string; threadId?: string }> {
  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);

    // 1. Get the threadId for this message via Corsair SDK
    // Use format:full — Corsair doesn't pass metadataHeaders correctly to Gmail API
    const msgData  = await tenant.gmail.api.messages.get({
      id: messageId,
      format: "full",
    }) as any;

    const threadId = msgData.threadId as string;

    // 2. Fetch the full thread via Corsair SDK
    const threadData = await tenant.gmail.api.threads.get({
      id: threadId,
      format: "full",
    }) as any;
    const rawMsgs: any[] = (threadData as any).messages ?? [];

    // 3. Get the linked Gmail account email (to determine sent vs received)
    const account = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "gmail" } },
    });
    const myEmail = (account?.accountEmail ?? userEmail).toLowerCase();

    // Helper: decode base64url Gmail body
    function decodeBody(part: any): string {
      if (!part) return "";
      if (part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      if (part.parts) {
        // Prefer text/plain, then text/html
        const plain = part.parts.find((p: any) => p.mimeType === "text/plain");
        const html  = part.parts.find((p: any) => p.mimeType === "text/html");
        if (plain?.body?.data) return Buffer.from(plain.body.data, "base64").toString("utf-8");
        if (html?.body?.data)  return decodeHtml(Buffer.from(html.body.data, "base64").toString("utf-8"));
      }
      return "";
    }

    function decodeHtml(html: string): string {
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    // Strip quoted reply sections
    function stripQuotes(text: string): string {
      const patterns = [
        /\n?\s*On\s+.{10,80}\s+wrote:\s*\n?[\s\S]*/i,
        /\n?\s*-{3,}\s*Original Message\s*-{3,}\s*\n?[\s\S]*/i,
        /\n?\s*From:\s+.+\n\s*Sent:\s+.+\n[\s\S]*/i,
        /\n?\s*_{3,}\s*\n[\s\S]*/,
      ];
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m.index !== undefined) {
          const before = text.slice(0, m.index).trim();
          if (before.length > 0) return before;
        }
      }
      return text;
    }

    // 4. Build ThreadMessage[] from raw Gmail messages
    const messages: ThreadMessage[] = rawMsgs.map((m: any) => {
      const headers = (m.payload?.headers ?? []) as { name: string; value: string }[];
      const getH    = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

      const fromRaw   = getH("From");
      const fromMatch = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
      const fromName  = fromMatch?.[1]?.trim() ?? fromRaw;
      const fromEmail = fromMatch?.[2]?.trim() ?? fromRaw;
      const toEmail   = getH("To");
      const subject   = getH("Subject") || "(no subject)";
      const dateStr   = getH("Date");
      // RFC 2822 Message-ID — needed for proper In-Reply-To threading
      const rfc822MsgId = getH("Message-ID") || getH("Message-Id");

      // isSent: check From header match OR Gmail's SENT label (handles edge cases)
      const labelIds  = (m.labelIds ?? []) as string[];
      const isSent    = fromEmail.toLowerCase() === myEmail
                        || labelIds.includes("SENT");
      const rawBody   = decodeBody(m.payload);
      const body      = stripQuotes(rawBody || m.snippet || "");

      return {
        id:           m.id,
        direction:    isSent ? "sent" : "received",
        fromEmail,
        fromName,
        toEmail,
        subject,
        body,
        sentAt:       dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        zohoMsgId:    m.id,       // Gmail message ID (for identifying messages)
        rfc822MsgId,              // RFC 2822 Message-ID (for threading In-Reply-To)
        gmailThreadId: threadId,  // Gmail thread ID (for messages.send threadId param)
      } as ThreadMessage;
    });

    // Sort oldest first (thread order)
    messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    console.log(`[fetchGmailThreadAction] ✅ Got ${messages.length} thread messages via Corsair (threadId: ${threadId})`);
    return { success: true, messages, threadId };  // return threadId so UI can use it for send
  } catch (err: any) {
    console.error("[fetchGmailThreadAction] Error:", err);
    return { success: false, error: err?.message ?? "Failed to fetch Gmail thread." };
  }
}



// ─── 4e. Mark Gmail message as read ──────────────────────────────────────────
// Called automatically when user opens a thread.
// Uses Corsair messages.modify to remove the UNREAD label.

export async function gmailMarkAsReadAction(
  userEmail: string,
  messageId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);
    await (tenant.gmail.api.messages.modify as any)({
      id: messageId,
      removeLabelIds: ["UNREAD"],
    });

    // Update DB state
    await prisma.syncedEmail.updateMany({
      where: { userEmail, provider: "gmail", messageId },
      data: { isRead: true }
    });

    console.log(`[gmailMarkAsRead] ✅ Marked ${messageId} as read`);
    return { success: true };
  } catch (err: any) {
    // Non-critical — don't surface to user
    console.warn("[gmailMarkAsRead] Failed (non-critical):", err?.message);
    return { success: false, error: err?.message };
  }
}

// ─── 4f. Star / Unstar a Gmail message ───────────────────────────────────────
// Toggles the STARRED label via Corsair messages.modify.

export async function gmailToggleStarAction(
  userEmail:  string,
  messageId:  string,
  starred:    boolean,   // true = star it, false = unstar it
): Promise<{ success: boolean; error?: string }> {
  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);
    await (tenant.gmail.api.messages.modify as any)({
      id: messageId,
      addLabelIds:    starred ? ["STARRED"] : [],
      removeLabelIds: starred ? [] : ["STARRED"],
    });
    console.log(`[gmailToggleStar] ✅ ${starred ? "⭐ Starred" : "☆ Unstarred"} ${messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[gmailToggleStar] Error:", err?.message);
    return { success: false, error: err?.message };
  }
}

// ─── 4g. Trash a Gmail message ────────────────────────────────────────────────
// Moves the message to Trash via Corsair messages.trash.
// Message can be restored from Trash within 30 days.

export async function gmailTrashAction(
  userEmail:  string,
  messageId:  string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);
    await (tenant.gmail.api.messages.trash as any)({ id: messageId });

    // Delete from DB state
    await prisma.syncedEmail.deleteMany({
      where: { userEmail, provider: "gmail", messageId }
    });

    console.log(`[gmailTrash] ✅ Trashed ${messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[gmailTrash] Error:", err?.message);
    return { success: false, error: err?.message };
  }
}


// ─── Gmail Advanced Search via Corsair ───────────────────────────────────────
// Builds a Gmail API `q` query string from structured filters,
// calls Corsair gmail.api.messages.list, then hydrates with metadata.

export interface GmailSearchFilters {
  from?:          string;
  to?:            string;
  subject?:       string;
  hasAttachment?: boolean;
  isUnread?:      boolean;
  isStarred?:     boolean;
  dateAfter?:     string;   // YYYY-MM-DD
  dateBefore?:    string;   // YYYY-MM-DD
  rawQuery?:      string;
  maxResults?:    number;
}

export interface GmailSearchResult {
  messageId:   string;
  subject:     string;
  fromEmail:   string;
  fromName:    string;
  receivedAt:  string;
  snippet:     string;
  isRead:      boolean;
  isStarred:   boolean;
  labels:      string[];
}

export async function gmailSearchAction(
  userEmail: string,
  filters: GmailSearchFilters,
): Promise<{ success: boolean; results?: GmailSearchResult[]; query?: string; error?: string }> {
  try {
    const account = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "gmail" } },
    });
    if (!account) return { success: false, error: "Gmail account not connected." };

    // Build Gmail `q` string
    const parts: string[] = [];
    if (filters.from?.trim())       parts.push(`from:${filters.from.trim()}`);
    if (filters.to?.trim())         parts.push(`to:${filters.to.trim()}`);
    if (filters.subject?.trim())    parts.push(`subject:${filters.subject.trim()}`);
    if (filters.hasAttachment)      parts.push("has:attachment");
    if (filters.isUnread === true)  parts.push("is:unread");
    if (filters.isUnread === false) parts.push("is:read");
    if (filters.isStarred)          parts.push("is:starred");
    if (filters.dateAfter?.trim()) {
      const d = new Date(filters.dateAfter);
      if (!isNaN(d.getTime()))
        parts.push(`after:${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`);
    }
    if (filters.dateBefore?.trim()) {
      const d = new Date(filters.dateBefore);
      if (!isNaN(d.getTime()))
        parts.push(`before:${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`);
    }
    if (filters.rawQuery?.trim())   parts.push(filters.rawQuery.trim());
    if (!parts.length)              parts.push("in:inbox");

    const q = parts.join(" ");
    const maxResults = Math.min(filters.maxResults ?? 25, 50);

    console.log(`[gmailSearch] 🔍 q="${q}" max=${maxResults}`);

    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);

    // Step 1: Corsair list → message IDs
    const listRes = await (tenant.gmail.api.messages.list as any)({ q, maxResults }) as any;
    const msgIds: string[] = (listRes?.messages ?? []).map((m: any) => m.id).filter(Boolean);
    console.log(`[gmailSearch] Corsair returned ${msgIds.length} message IDs`);

    if (!msgIds.length) return { success: true, results: [], query: q };

    // Step 2: Hydrate each message
    const results: GmailSearchResult[] = [];
    for (const id of msgIds.slice(0, maxResults)) {
      try {
        const meta = await (tenant.gmail.api.messages.get as any)({
          id, format: "metadata",
          metadataHeaders: ["From", "To", "Subject", "Date"],
        }) as any;

        const hdrs = (meta?.payload?.headers ?? []) as { name: string; value: string }[];
        const h = (n: string) => hdrs.find((x: any) => x.name?.toLowerCase() === n.toLowerCase())?.value ?? "";

        const fromRaw  = h("From");
        const fm = fromRaw.match(/^(.+?)?\s*<([^>]+)>$/);
        const labelIds = (meta?.labelIds ?? []) as string[];

        results.push({
          messageId:  id,
          subject:    h("Subject") || "(no subject)",
          fromEmail:  fm?.[2]?.trim() ?? fromRaw,
          fromName:   fm?.[1]?.trim() || fromRaw.split("@")[0],
          receivedAt: meta?.internalDate ? new Date(Number(meta.internalDate)).toISOString() : new Date().toISOString(),
          snippet:    (meta?.snippet ?? "").slice(0, 140),
          isRead:     !labelIds.includes("UNREAD"),
          isStarred:  labelIds.includes("STARRED"),
          labels:     labelIds,
        });
      } catch { /* skip bad messages */ }
    }

    return { success: true, results, query: q };
  } catch (err: any) {
    console.error("[gmailSearch] Error:", err?.message);
    return { success: false, error: err?.message ?? "Search failed." };
  }
}

// ─── 4h. Star / Unstar a Zoho message ────────────────────────────────────────
// Uses Zoho updatemessage API: PUT /accounts/{accountId}/updatemessage
// mode=setFlag + flagid=important → stars the message (yellow flag in Zoho)
// mode=removeFlag + flagid=important → removes the star

export async function zohoToggleStarAction(
  userEmail: string,
  messageId: string,
  starred:   boolean,  // true = star it, false = unstar
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getValidAccessToken(userEmail);
    if (!auth) return { success: false, error: "Zoho account not connected." };

    const { token, accountId, apiBase } = auth;
    if (!accountId) return { success: false, error: "Zoho account ID not found." };

    const body = {
      mode:      starred ? "setFlag" : "removeFlag",
      messageId: [messageId],
      flagid:    "important",  // "important" = star icon in Zoho Mail UI
    };

    const res = await fetch(`${apiBase}/api/accounts/${accountId}/updatemessage`, {
      method:  "PUT",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[zohoToggleStar] ❌ HTTP ${res.status}:`, err.slice(0, 200));
      return { success: false, error: `Zoho API error (${res.status})` };
    }

    console.log(`[zohoToggleStar] ✅ ${starred ? "⭐ Starred" : "☆ Unstarred"} Zoho message ${messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error("[zohoToggleStar] Error:", err?.message);
    return { success: false, error: err?.message };
  }
}


// ─── 5. Send an email ────────────────────────────────────────────────────────
// Optional `attachment` attaches a file (e.g. resume PDF) via multipart/form-data.

export interface MailAttachment {
  base64:    string;   // base64-encoded file content
  filename:  string;   // e.g. "Resume_NiteenKumar.pdf"
  mimeType:  string;   // e.g. "application/pdf"
}

export async function sendMailAction(
  userEmail:   string,
  to:          string,
  subject:     string,
  body:        string,
  attachment?: MailAttachment,
  cc?:         string,
  bcc?:        string,
): Promise<SendResult> {
  const auth = await getValidAccessToken(userEmail);
  if (!auth) {
    return { success: false, error: "Mail account not connected or token expired." };
  }

  const { token, accountId, apiBase, accountEmail } = auth;

  if (!accountId) {
    return { success: false, error: "Zoho account ID not available. Try reconnecting." };
  }

  try {
    let res: Response;

    if (attachment) {
      // ── Step 1: Upload the attachment to Zoho ──────────────────────────────
      const uploadForm = new FormData();
      const binary  = Buffer.from(attachment.base64, "base64");
      const blob    = new Blob([binary], { type: attachment.mimeType });
      uploadForm.append("attach", blob, attachment.filename);

      const uploadRes = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages/attachments?uploadType=multipart`,
        {
          method:  "POST",
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
          body:    uploadForm,
        }
      );

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        console.error("[sendMail] Zoho upload failed:", uploadRes.status, err);
        return { success: false, error: `Failed to upload attachment (Zoho ${uploadRes.status})` };
      }

      const uploadData   = await uploadRes.json();
      // Zoho returns data as an array ([{ storeName, attachmentName, attachmentPath }])
      const rawData      = uploadData?.data;
      const uploadedFile = Array.isArray(rawData) ? rawData[0] : rawData;
      if (!uploadedFile?.storeName) {
        console.error("[sendMail] Zoho upload response missing storeName:", uploadData);
        return { success: false, error: "Attachment upload succeeded but returned no file reference." };
      }

      // ── Step 2: Send the email with the uploaded attachment reference ───────
      res = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromAddress: accountEmail,
            toAddress:   to,
            ccAddress:   cc || undefined,
            bccAddress:  bcc || undefined,
            subject,
            content:     body,
            mailFormat:  "plaintext",
            attachments: [
              {
                storeName:      uploadedFile.storeName,
                attachmentName: uploadedFile.attachmentName,
                attachmentPath: uploadedFile.attachmentPath,
              },
            ],
          }),
        }
      );
    } else {
      // ── Plain JSON send (no attachment) ─────────────────────────────────────
      res = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Zoho-oauthtoken ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromAddress: accountEmail,
            toAddress:   to,
            ccAddress:   cc || undefined,
            bccAddress:  bcc || undefined,
            subject,
            content:     body,
            mailFormat:  "plaintext",
          }),
        }
      );
    }

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendMail] Zoho send failed:", res.status, err);
      return { success: false, error: `Failed to send (Zoho ${res.status})` };
    }

    const resData   = await res.json().catch(() => ({}));
    const zohoMsgId = String(resData?.data?.messageId ?? resData?.messageId ?? "") || undefined;

    console.log(`[sendMail] ✅ Sent from ${userEmail} → ${to}${cc ? ` (CC: ${cc})` : ""}${bcc ? ` (BCC: ${bcc})` : ""}${attachment ? " 📎 +attachment" : ""} (msgId: ${zohoMsgId ?? "n/a"})`);
    return { success: true, zohoMsgId };
  } catch (err: any) {
    console.error("[sendMail] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected send error." };
  }
}

// ─── 5b. Send NEW email via Gmail (Corsair) ───────────────────────────────────
// Composes and sends a brand-new email (not a reply) via Corsair Gmail SDK.

export async function sendGmailNewAction(
  userEmail: string,
  to:        string,
  subject:   string,
  body:      string,
  cc?:       string,
  bcc?:      string,
): Promise<SendResult> {
  try {
    const { corsair } = await import("../utils/corsair");
    const tenant = corsair.withTenant(userEmail);

    const headerLines = [
      `From: ${userEmail}`,
      `To: ${to}`,
      ...(cc  ? [`Cc: ${cc}`]  : []),
      ...(bcc ? [`Bcc: ${bcc}`] : []),
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
    ];
    const rawEmail  = headerLines.join("\r\n");
    const base64Raw = Buffer.from(rawEmail)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await tenant.gmail.api.messages.send({ raw: base64Raw } as any);

    console.log(`[sendGmailNew] ✅ Sent via Gmail/Corsair: ${userEmail} → ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error("[sendGmailNew] Error:", err);
    return { success: false, error: err?.message ?? "Failed to send via Gmail." };
  }
}



// ─── 6. Send email linked to a job post ──────────────────────────────────────
// Wraps sendMailAction: also persists a SentEmail record and flips job status → Sent.

export interface SentEmailRecord {
  id:         string;
  provider:   string;
  fromEmail:  string;
  toEmail:    string;
  subject:    string;
  body:       string;
  zohoMsgId?: string | null;
  sentAt:     string;  // ISO string
}

export async function sendJobEmailAction(
  userEmail:     string,
  jobPostId:     string,
  to:            string,
  subject:       string,
  body:          string,
  attachResume?: boolean,
  cc?:           string,
  bcc?:          string,
): Promise<{ success: boolean; error?: string; zohoMsgId?: string; sentAt?: string }> {
  // 1. Optionally load user's resume PDF from DB
  let attachment: MailAttachment | undefined;
  if (attachResume) {
    const pool = rawPool();
    try {
      const r = await pool.query<{ resume_pdf_base64: string | null; resume_file_name: string | null }>(
        // Join via User table — UserProfile.email ≠ login email
        `SELECT up."resumePdfBase64" AS resume_pdf_base64,
                up."resumeFileName"  AS resume_file_name
         FROM   "UserProfile" up
         JOIN   "User" u ON u.id = up."userId"
         WHERE  u.email = $1
         LIMIT  1`,
        [userEmail],
      );
      const row = r.rows[0];
      if (row?.resume_pdf_base64) {
        attachment = {
          base64:   row.resume_pdf_base64,
          filename: row.resume_file_name ?? "Resume.pdf",
          mimeType: "application/pdf",
        };
        console.log(`[sendJobEmail] 📎 Attaching resume: ${attachment.filename}`);
      } else {
        console.warn(`[sendJobEmail] attachResume=true but no PDF found for ${userEmail}`);
      }
    } finally {
      await pool.end();
    }
  }

  // 2. Send via Zoho (with or without attachment)
  const result = await sendMailAction(userEmail, to, subject, body, attachment, cc, bcc);
  if (!result.success) return result;

  // 3. Get sender address (Zoho account)
  const account   = await prisma.mailAccount.findUnique({
    where: { userEmail_provider: { userEmail, provider: "zoho" } },
  });
  const fromEmail = account?.accountEmail ?? userEmail;

  // 4. Save SentEmail via raw pg (bypasses stale Next.js-bundled Prisma client)
  const recipientToEmail = to + (cc ? `, cc: ${cc}` : "") + (bcc ? `, bcc: ${bcc}` : "");
  const sent = await rawInsertSentEmail({
    userEmail,
    jobPostId,
    provider:  account?.provider ?? "zoho",
    fromEmail,
    toEmail:   recipientToEmail,
    subject,
    body,
    zohoMsgId: result.zohoMsgId ?? null,
  });

  // 5. Check existing sent email count — if this is the first send, sync contactEmail
  const existingSentCount = await prisma.sentEmail.count({ where: { jobPostId } }).catch(() => 1);
  const isFirstSend = existingSentCount <= 1; // ≤1 because we just inserted above

  // 6. Update job status → Sent; also update contactEmail if changed or blank (first send only)
  const currentJob = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    select: { contactEmail: true },
  });

  if (currentJob) {
    const shouldUpdateEmail =
      isFirstSend &&
      to.trim() !== "" &&
      (currentJob.contactEmail !== to.trim());

    await prisma.jobPost.update({
      where: { id: jobPostId },
      data:  {
        status: "Sent",
        ...(shouldUpdateEmail ? { contactEmail: to.trim() } : {}),
      },
    });

    if (shouldUpdateEmail) {
      console.log(`[sendJobEmail] 📧 Updated job contactEmail → ${to.trim()}`);
    }
  } else if (jobPostId) {
    await prisma.adminJob.update({
      where: { id: jobPostId },
      data: {
        contactEmail: to.trim(),
      },
    }).catch(() => {});
  }

  return { success: true, zohoMsgId: result.zohoMsgId, sentAt: sent.sentAt };
}

// ─── 7. Get sent email history for a job ────────────────────────────────────────────

export async function getSentEmailsForJobAction(
  jobPostId: string
): Promise<SentEmailRecord[]> {
  return rawSelectSentEmails(jobPostId);
}

// ─── 7b. Unified email thread (sent + received) for a job ────────────────────
// Merges local SentEmail records with messages fetched from Zoho's mailbox
// that share the same thread (searched by subject line).

export interface ThreadMessage {
  id:             string;
  direction:      "sent" | "received";
  fromEmail:      string;
  fromName?:      string;
  toEmail:        string;
  subject:        string;
  body:           string;
  sentAt:         string;  // ISO string
  zohoMsgId?:     string;
  rfc822MsgId?:   string;  // RFC 2822 Message-ID header (for In-Reply-To when replying)
  gmailThreadId?: string;  // Gmail thread ID (different from message ID)
}

export async function getEmailThreadForJobAction(
  userEmail: string,
  jobPostId: string,
): Promise<{ messages: ThreadMessage[]; error?: string }> {
  // 1. Load local sent emails for this job (strictly matching jobPostId OR adminJobId)
  const sentRows = await rawSelectSentEmails(jobPostId);
  if (sentRows.length === 0) {
    return { messages: [] };
  }

  // Deduplicate local sent rows by zohoMsgId or body content
  const uniqueSent: SentEmailRecord[] = [];
  const seenBodies = new Set<string>();
  const seenMsgIds = new Set<string>();

  for (const r of sentRows) {
    if (r.zohoMsgId && seenMsgIds.has(r.zohoMsgId)) continue;
    const bodyKey = (r.body || "").replace(/\s+/g, "").slice(0, 100);
    if (bodyKey && seenBodies.has(bodyKey)) continue;

    if (r.zohoMsgId) seenMsgIds.add(r.zohoMsgId);
    if (bodyKey) seenBodies.add(bodyKey);
    uniqueSent.push(r);
  }

  // Convert deduplicated sent rows → ThreadMessage[]
  const sentMessages: ThreadMessage[] = uniqueSent.map(r => ({
    id:        r.id,
    direction: "sent" as const,
    fromEmail: r.fromEmail,
    toEmail:   r.toEmail,
    subject:   r.subject,
    body:      r.body,
    sentAt:    r.sentAt,
    zohoMsgId: r.zohoMsgId ?? undefined,
  }));

  // 2. Try to fetch received replies from Zoho
  const auth = await getValidAccessToken(userEmail);
  if (!auth || !auth.accountId) {
    // Can't reach Zoho — return deduplicated local sent emails
    return { messages: sentMessages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()) };
  }

  const { token, accountId, apiBase, accountEmail } = auth;

  try {
    const baseSubject = sentRows[sentRows.length - 1].subject
      .replace(/^(Re:\s*)+/i, "")
      .trim();

    const recipientEmail = sentRows[sentRows.length - 1].toEmail
      .split(",")[0]
      .replace(/cc:.*|bcc:.*/gi, "")
      .trim();

    console.log(`[getEmailThread] 🔍 Searching Zoho for live thread:`);
    console.log(`  baseSubject: "${baseSubject}"`);
    console.log(`  recipientEmail: "${recipientEmail}"`);
    console.log(`  accountEmail: "${accountEmail}"`);
    console.log(`  apiBase: "${apiBase}"`);
    console.log(`  accountId: "${accountId}"`);

    let rawMessages: any[] = [];

    // ONLY fetch messages FROM the recruiter (their replies to us).
    // We do NOT fetch "to:recipientEmail" or the full mailbox — that pulls unrelated emails.
    if (recipientEmail) {
      const fromParams = new URLSearchParams({ searchKey: `from:${recipientEmail}`, limit: "50" });
      console.log(`[getEmailThread] 📡 Fetching replies from: ${recipientEmail}`);
      const res = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages/search?${fromParams}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      console.log(`[getEmailThread] 📡 Zoho from: search status: ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        const msgs: any[] = json?.data ?? json?.messages ?? [];
        console.log(`[getEmailThread] 📡 Total from recruiter: ${msgs.length} messages`);

        // Strict filter: only keep messages whose subject matches the thread subject
        const subjectLower = baseSubject.toLowerCase();
        for (const m of msgs) {
          const msgSubject = ((m.subject ?? "").replace(/^(Re:\s*)*/i, "").trim()).toLowerCase();
          const subjectMatches = msgSubject.includes(subjectLower) || subjectLower.includes(msgSubject);
          console.log(`[getEmailThread]   subject="${m.subject}" from=${m.fromAddress} → matches=${subjectMatches}`);
          if (subjectMatches) {
            rawMessages.push(m);
          }
        }
        console.log(`[getEmailThread] 📦 After subject filter: ${rawMessages.length} messages in thread`);
      } else {
        const errText = await res.text();
        console.warn(`[getEmailThread] ⚠️ from: search failed (${res.status}):`, errText);
      }
    }

    console.log(`[getEmailThread] 📦 Total received messages from Zoho: ${rawMessages.length}`);

    // 3. Build a set of Zoho message IDs we already have as sent records
    const sentZohoIds = new Set(sentRows.filter(r => r.zohoMsgId).map(r => r.zohoMsgId!));
    // Also filter by sender — if fromAddress is our own account, it's a sent message (we already have it)
    const accountEmailLower = accountEmail.toLowerCase();

    console.log(`[getEmailThread] 🧹 Filtering: sentZohoIds=${[...sentZohoIds].join(",")} | accountEmail=${accountEmailLower}`);

    // 4. Filter to only received (incoming) messages — skip our own sent messages
    const receivedRaw = rawMessages.filter((m: any) => {
      const msgId = String(m.messageId ?? m.msgId ?? "");
      // Skip if it's one of our sent emails
      if (sentZohoIds.has(msgId)) {
        console.log(`[getEmailThread]   Skipping ${msgId} — already in sentZohoIds`);
        return false;
      }
      // Skip if the sender is us (sent folder copy)
      const from = (m.fromAddress ?? m.sender ?? "").toLowerCase();
      if (from.includes(accountEmailLower)) {
        console.log(`[getEmailThread]   Skipping ${msgId} — sender is us (${from})`);
        return false;
      }
      console.log(`[getEmailThread]   ✅ Keeping received message ${msgId} from ${from}`);
      return true;
    });

    console.log(`[getEmailThread] 📬 ${receivedRaw.length} received messages to fetch content for`);

    // 5. Fetch content for each received message
    const receivedMessages: ThreadMessage[] = [];

    for (const m of receivedRaw) {
      const msgId   = String(m.messageId ?? m.msgId ?? "");
      const folderId = String(m.folderId ?? "");
      let body = m.summary ?? m.content ?? "";

      // Try to fetch the full content if we have folderId
      if (folderId && msgId) {
        try {
          const contentRes = await fetch(
            `${apiBase}/api/accounts/${accountId}/folders/${folderId}/messages/${msgId}/content?includeBlockContent=false`,
            { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
          );
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            // Zoho returns HTML content — strip tags for plaintext display
            const htmlContent = contentData?.data?.content ?? "";
            body = htmlContent
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<\/div>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/&lt;/gi, "<")
              .replace(/&gt;/gi, ">")
              .replace(/&quot;/gi, '"')
              .replace(/&#39;/gi, "'")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            // Strip quoted reply content (e.g. "On Sun, 7 Jun 2026 at 00:34, <x@y.com> wrote:")
            // Common patterns:
            //   "On [date], [name/email] wrote:"
            //   "-----Original Message-----"
            //   "> quoted lines"
            const quotePatterns = [
              /\n?\s*On\s+.{10,80}\s+wrote:\s*\n?[\s\S]*/i,              // "On ... wrote:" + everything after
              /\n?\s*-{3,}\s*Original Message\s*-{3,}\s*\n?[\s\S]*/i,    // -----Original Message-----
              /\n?\s*From:\s+.+\n\s*Sent:\s+.+\n[\s\S]*/i,              // Outlook style "From: ... Sent: ..."
              /\n?\s*_{3,}\s*\n[\s\S]*/,                                  // ___ divider + everything after
            ];
            for (const pattern of quotePatterns) {
              const match = body.match(pattern);
              if (match && match.index !== undefined) {
                // Only strip if there's actual content before the quote
                const beforeQuote = body.slice(0, match.index).trim();
                if (beforeQuote.length > 0) {
                  body = beforeQuote;
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[getEmailThread] Failed to fetch content for ${msgId}:`, err);
        }
      }

      const sentTime = m.receivedTime
        ? new Date(Number(m.receivedTime)).toISOString()
        : m.sentDateInGMT
          ? new Date(m.sentDateInGMT).toISOString()
          : new Date().toISOString();

      receivedMessages.push({
        id:        `zoho-${msgId}`,
        direction: "received",
        fromEmail: m.fromAddress ?? m.sender ?? "",
        fromName:  m.fromDisplayString ?? m.senderDisplayName ?? "",
        toEmail:   m.toAddress ?? accountEmail,
        subject:   m.subject ?? "(no subject)",
        body,
        sentAt:    sentTime,
        zohoMsgId: msgId,
      });
    }

    // 6. Merge and sort by date (oldest first)
    const allMessages = [...sentMessages, ...receivedMessages]
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

    return { messages: allMessages };
  } catch (err: any) {
    console.error("[getEmailThread] Error:", err);
    // Fallback to just sent emails
    return {
      messages: sentMessages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
      error: err?.message,
    };
  }
}

// ─── 8. Get resume filename for a user (used to populate attach toggle) ───────

export async function getUserResumeFilenameAction(
  userEmail: string
): Promise<string | null> {
  const pool = rawPool();
  try {
    const res = await pool.query<{ resume_file_name: string | null; has_pdf: boolean }>(
      // Join via User table so we match by LOGIN email, not profile email field
      `SELECT up."resumeFileName"  AS resume_file_name,
              (up."resumePdfBase64" IS NOT NULL AND up."resumePdfBase64" != '') AS has_pdf
       FROM   "UserProfile" up
       JOIN   "User" u ON u.id = up."userId"
       WHERE  u.email = $1
       LIMIT  1`,
      [userEmail],
    );
    const row = res.rows[0];
    if (!row || !row.has_pdf) return null;
    return row.resume_file_name ?? "Resume.pdf";
  } catch (e) {
    console.error("[getUserResumeFilenameAction]", e);
    return null;
  } finally {
    await pool.end();
  }
}

// ─── 9. Get resume PDF base64 (for in-browser preview / download) ─────────────

export async function getResumePdfBase64Action(
  userEmail: string
): Promise<{ base64: string; filename: string } | null> {
  const pool = rawPool();
  try {
    const res = await pool.query<{ pdf: string | null; filename: string | null }>(
      `SELECT up."resumePdfBase64" AS pdf,
              up."resumeFileName"  AS filename
       FROM   "UserProfile" up
       JOIN   "User" u ON u.id = up."userId"
       WHERE  u.email = $1
       LIMIT  1`,
      [userEmail],
    );
    const row = res.rows[0];
    if (!row?.pdf) return null;
    return { base64: row.pdf, filename: row.filename ?? "Resume.pdf" };
  } catch (e) {
    console.error("[getResumePdfBase64Action]", e);
    return null;
  } finally {
    await pool.end();
  }
}

// ─── 10. Send a reply in an existing email thread ────────────────────────────
// Uses Zoho's inReplyTo field to keep the message in the same thread.

export async function sendReplyEmailAction(
  userEmail:    string,
  jobPostId:    string,
  to:           string,
  subject:      string,
  body:         string,
  inReplyToId:  string,   // Zoho messageId of the message being replied to
): Promise<{ success: boolean; error?: string; zohoMsgId?: string; sentAt?: string }> {
  const auth = await getValidAccessToken(userEmail);
  if (!auth) return { success: false, error: "Mail account not connected or token expired." };

  const { token, accountId, apiBase, accountEmail } = auth;
  if (!accountId) return { success: false, error: "Zoho account ID not available." };

  try {
    // Zoho reply: POST same endpoint but with action=reply and inReplyTo header
    const res = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: accountEmail,
          toAddress:   to,
          subject:     subject.startsWith("Re:") ? subject : `Re: ${subject}`,
          content:     body,
          mailFormat:  "plaintext",
          inReplyTo:   inReplyToId,   // threads the reply in the same conversation
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendReply] Zoho failed:", res.status, err);
      return { success: false, error: `Failed to send reply (Zoho ${res.status})` };
    }

    const resData   = await res.json().catch(() => ({}));
    const zohoMsgId = String(resData?.data?.messageId ?? resData?.messageId ?? "") || undefined;

    // Persist the reply to SentEmail table
    const account   = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "zoho" } },
    });
    const fromEmail = account?.accountEmail ?? userEmail;

    const sent = await rawInsertSentEmail({
      userEmail,
      jobPostId,
      provider:  account?.provider ?? "zoho",
      fromEmail,
      toEmail:   to,
      subject:   subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      body,
      zohoMsgId: zohoMsgId ?? null,
    });

    console.log(`[sendReply] ✅ Reply sent → ${to} (msgId: ${zohoMsgId ?? "n/a"})`);
    return { success: true, zohoMsgId, sentAt: sent.sentAt };
  } catch (err: any) {
    console.error("[sendReply] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected error sending reply." };
  }
}

// ─── 11. General Email Thread Fetcher ─────────────────────────────────────────
// Searches and builds a chronological thread of emails (sent and received) sharing the same subject line.

export async function getEmailThreadAction(
  userEmail: string,
  messageId: string,
  subject: string,
  senderEmail: string
): Promise<{ success: boolean; messages?: ThreadMessage[]; error?: string }> {
  console.log(`\n[getEmailThreadAction] 🚀 CALLED for ${userEmail}, msgId=${messageId}, subject="${subject}", sender="${senderEmail}"`);

  const auth = await getValidAccessToken(userEmail);
  if (!auth || !auth.accountId) {
    console.error("[getEmailThreadAction] ❌ No valid token");
    return { success: false, error: "Mail account not connected or token expired." };
  }

  const { token, accountId, apiBase, accountEmail } = auth;
  const baseSubject = subject
    .replace(/^(Re:\s*|Fwd:\s*)+/i, "")
    .trim();

  try {
    console.log(`[getEmailThreadAction] 🔍 Searching Zoho: baseSubject="${baseSubject}"`);

    const searchKey = `subject:"${baseSubject}"`;
    const params = new URLSearchParams({
      searchKey,
      limit: "50",
    });

    const searchRes = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages/search?${params}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );

    let rawMessages: any[] = [];
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      rawMessages = searchData?.data ?? [];
      console.log(`[getEmailThreadAction] Found ${rawMessages.length} messages by subject search`);
    } else {
      const errText = await searchRes.text();
      console.warn(`[getEmailThreadAction] Subject search failed: ${searchRes.status} — ${errText}`);
    }

    // Ensure the clicked message itself is included
    const hasClickedMsg = rawMessages.some(m => String(m.messageId ?? m.msgId ?? "") === messageId);
    if (!hasClickedMsg) {
      console.log(`[getEmailThreadAction] Clicked message ${messageId} not in results, searching specifically...`);
      const singleRes = await fetch(
        `${apiBase}/api/accounts/${accountId}/messages/search?searchKey=msgId:${messageId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      if (singleRes.ok) {
        const singleData = await singleRes.json();
        const singleMsgs = singleData?.data ?? [];
        if (singleMsgs.length > 0) {
          rawMessages.push(singleMsgs[0]);
        }
      }
    }

    const accountEmailLower = accountEmail.toLowerCase();
    const messages: ThreadMessage[] = [];

    for (const m of rawMessages) {
      const msgId = String(m.messageId ?? m.msgId ?? "");
      const folderId = String(m.folderId ?? "");
      const from = (m.fromAddress ?? m.sender ?? "").toLowerCase();
      const direction = from.includes(accountEmailLower) ? ("sent" as const) : ("received" as const);
      
      let body = m.summary ?? m.content ?? "";

      if (folderId && msgId) {
        try {
          const contentRes = await fetch(
            `${apiBase}/api/accounts/${accountId}/folders/${folderId}/messages/${msgId}/content?includeBlockContent=false`,
            { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
          );
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            const htmlContent = contentData?.data?.content ?? "";
            body = htmlContent
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<\/div>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/&lt;/gi, "<")
              .replace(/&gt;/gi, ">")
              .replace(/&quot;/gi, '"')
              .replace(/&#39;/gi, "'")
              .replace(/\n{3,}/g, "\n\n")
              .trim();

            // Strip quotes
            const quotePatterns = [
              /\n?\s*On\s+.{10,80}\s+wrote:\s*\n?[\s\S]*/i,
              /\n?\s*-{3,}\s*Original Message\s*-{3,}\s*\n?[\s\S]*/i,
              /\n?\s*From:\s+.+\n\s*Sent:\s+.+\n[\s\S]*/i,
              /\n?\s*_{3,}\s*\n[\s\S]*/,
            ];
            for (const pattern of quotePatterns) {
              const match = body.match(pattern);
              if (match && match.index !== undefined) {
                const beforeQuote = body.slice(0, match.index).trim();
                if (beforeQuote.length > 0) {
                  body = beforeQuote;
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.warn(`[getEmailThreadAction] Failed to fetch content for ${msgId}:`, err);
        }
      }

      const receivedAt = m.receivedTime
        ? new Date(Number(m.receivedTime)).toISOString()
        : m.sentDateInGMT
          ? new Date(m.sentDateInGMT).toISOString()
          : new Date().toISOString();

      messages.push({
        id: msgId,
        direction,
        fromEmail: m.fromAddress ?? m.sender ?? "",
        fromName: m.fromDisplayString ?? m.senderDisplayName ?? m.sender ?? "",
        toEmail: m.toAddress ?? accountEmail,
        subject: m.subject ?? "(no subject)",
        body,
        sentAt: receivedAt,
        zohoMsgId: msgId
      });
    }

    messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    return { success: true, messages };
  } catch (err: any) {
    console.error("[getEmailThreadAction] Error:", err);
    return { success: false, error: err?.message ?? "Failed to build thread." };
  }
}

// ─── 12. Send a general thread reply ──────────────────────────────────────────

export async function sendThreadReplyAction(
  userEmail:     string,
  to:            string,
  subject:       string,
  body:          string,
  inReplyToId:   string,   // RFC 2822 Message-ID of the message being replied to
  provider?:     "zoho" | "gmail",
  gmailThreadId?: string,  // actual Gmail thread ID (from fetchGmailThreadAction)
): Promise<{ success: boolean; error?: string; zohoMsgId?: string; sentAt?: string }> {
  console.log(`[sendThreadReplyAction] 🚀 Reply: to=${to}, subject="${subject}", provider=${provider ?? "auto"}, gmailThreadId=${gmailThreadId}`);

  // ── Auto-detect provider if not passed ──────────────────────────────────────
  // Gmail message IDs are hex strings (no dashes), Zoho IDs are numeric
  const detectedProvider = provider
    ?? (/^[0-9a-f]{16,}$/i.test(inReplyToId) ? "gmail" : "zoho");

  // ── Gmail reply via Corsair SDK ──────────────────────────────────────────────
  if (detectedProvider === "gmail") {
    try {
      const { corsair } = await import("../utils/corsair");
      const tenant = corsair.withTenant(userEmail);

      const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;

      // Use RFC 2822 Message-ID for In-Reply-To (inReplyToId may already have <> or not)
      // Normalize: strip existing angle brackets then re-add
      const rfc822Id = inReplyToId.startsWith("<")
        ? inReplyToId
        : `<${inReplyToId}>`;

      // Build RFC 2822 raw email string
      const emailLines = [
        `From: ${userEmail}`,
        `To: ${to}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${rfc822Id}`,
        `References: ${rfc822Id}`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        body,
      ];
      const rawEmail  = emailLines.join("\r\n");
      const base64Raw = Buffer.from(rawEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // gmailThreadId is passed separately — it's the actual thread ID, not message ID
      const sendPayload: any = { raw: base64Raw };
      if (gmailThreadId) sendPayload.threadId = gmailThreadId;

      await tenant.gmail.api.messages.send(sendPayload);

      // Persist to SentEmail table
      const sent = await rawInsertSentEmail({
        userEmail,
        jobPostId: null,
        provider:  "gmail",
        fromEmail: userEmail,
        toEmail:   to,
        subject:   replySubject,
        body,
        zohoMsgId: null,
      });

      console.log(`[sendThreadReplyAction] ✅ Gmail reply sent via Corsair to ${to}`);
      return { success: true, sentAt: sent.sentAt };
    } catch (err: any) {
      console.error("[sendThreadReplyAction] Gmail/Corsair error:", err);
      return { success: false, error: err?.message ?? "Failed to send Gmail reply." };
    }
  }

  // ── Zoho reply (existing logic) ──────────────────────────────────────────────
  const auth = await getValidAccessToken(userEmail);
  if (!auth) return { success: false, error: "Mail account not connected or token expired." };

  const { token, accountId, apiBase, accountEmail } = auth;
  if (!accountId) return { success: false, error: "Zoho account ID not available." };

  try {
    const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
    const res = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Zoho-oauthtoken ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: accountEmail,
          toAddress:   to,
          subject:     replySubject,
          content:     body,
          mailFormat:  "plaintext",
          inReplyTo:   inReplyToId,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[sendThreadReplyAction] Zoho failed:", res.status, err);
      return { success: false, error: `Failed to send reply (Zoho ${res.status})` };
    }

    const resData   = await res.json().catch(() => ({}));
    const zohoMsgId = String(resData?.data?.messageId ?? resData?.messageId ?? "") || undefined;

    const account   = await prisma.mailAccount.findUnique({
      where: { userEmail_provider: { userEmail, provider: "zoho" } },
    });
    const fromEmail = account?.accountEmail ?? userEmail;

    const sent = await rawInsertSentEmail({
      userEmail,
      jobPostId: null,
      provider:  account?.provider ?? "zoho",
      fromEmail,
      toEmail:   to,
      subject:   replySubject,
      body,
      zohoMsgId: zohoMsgId ?? null,
    });

    console.log(`[sendThreadReplyAction] ✅ Zoho reply sent to ${to} (msgId: ${zohoMsgId})`);
    return { success: true, zohoMsgId, sentAt: sent.sentAt };
  } catch (err: any) {
    console.error("[sendThreadReplyAction] Error:", err);
    return { success: false, error: err?.message ?? "Unexpected error sending reply." };
  }
}

export async function getRecentSyncedEmailsAction(
  userEmail: string,
  sinceIsoString: string
): Promise<{ success: boolean; emails?: any[]; error?: string }> {
  try {
    const emails = await prisma.syncedEmail.findMany({
      where: {
        userEmail,
        createdAt: {
          gt: new Date(sinceIsoString),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return { success: true, emails };
  } catch (err: any) {
    console.error("[getRecentSyncedEmailsAction] Error:", err);
    return { success: false, error: err?.message ?? "Failed to get recent emails" };
  }
}

// ─── 12. Generate AI Reply for a Thread ──────────────────────────────────────
// Uses thread context + user profile to AI-draft a reply via the configured
// AI provider (Gemini / OpenAI / Claude / etc.).

export async function generateAIReplyAction(
  userEmail:      string,
  jobRole:        string,
  jobCompany:     string,
  recipientEmail: string,
  threadMessages: {
    direction: "sent" | "received";
    fromEmail: string;
    toEmail:   string;
    body:      string;
    sentAt:    string;
  }[],
  customPrompt?: string,
  chatHistory?:  { role: "user" | "assistant"; content: string }[],
  userInstructions?: string[],
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    // 1. Load user profile from DB (UserProfile + Projects)
    const user = await prisma.user.findUnique({
      where:   { email: userEmail },
      include: {
        profile:  true,
        projects: true,
      },
    });

    if (!user?.profile) {
      return { success: false, error: "User profile not found. Please complete your profile first." };
    }

    const { profile, projects } = user;

    // Map to UserProfile interface expected by the AI service
    const userProfile = {
      name:         profile.name,
      role:         profile.role,
      email:        profile.email,
      skills:       profile.skills,
      portfolioUrl: profile.portfolioUrl,
      githubUrl:    profile.githubUrl,
      linkedinUrl:  profile.linkedinUrl,
      resumeText:   profile.resumeText ?? undefined,
      education:    (profile.education as any[]) ?? [],
      projects:     projects.map(p => ({
        name:        p.name,
        tech:        p.tech,
        description: p.description,
        links:       (p.links as any[]) ?? [],
      })),
    };

    // 2. Call AI service
    const { generateEmailReply } = await import("../utils/ai/email-reply");
    const reply = await generateEmailReply({
      threadMessages,
      profile: userProfile,
      jobRole,
      jobCompany,
      recipientEmail,
      customPrompt,
      userInstructions,
      chatHistory,
    });

    console.log(`[generateAIReplyAction] ✅ Draft generated for ${userEmail} (${reply.length} chars)`);
    return { success: true, reply };
  } catch (err: any) {
    console.error("[generateAIReplyAction] Error:", err);
    return { success: false, error: err?.message ?? "AI reply generation failed" };
  }
}
