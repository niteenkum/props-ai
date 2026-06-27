import { NextRequest, NextResponse } from "next/server";
import {
  upsertWAMessagesAction,
  getJobPostsByContactAction,
  updateWAMessageAnalysisAction,
  createJobPostFromWAAction,
  WAMessageInput,
} from "@/app/actions/db-actions";
import { analyzeJobCandidacyAction } from "@/app/actions/ai-actions";
import { prisma } from "@/app/utils/prisma";


// ─── Keyword pre-flight check ─────────────────────────────────────────────────
const JOB_KEYWORDS = [
  "hiring", "we are looking", "job opening", "urgent requirement", "urgent hiring",
  "position", "developer", "engineer", "designer", "apply", "resume", "cv",
  "salary", "lpa", "ctc", "per annum", "experience", "location:", "remote",
  "full-time", "fulltime", "full stack", "frontend", "backend", "freelance",
  "immediate joiner", "notice period", "react", "node", "python", "java",
  "flutter", "angular", "vue", "golang", "devops", "aws", "cloud",
  "share your cv", "send your resume", "dm me", "whatsapp me",
];

function isLikelyJobPost(text: string): boolean {
  const lower = text.toLowerCase();
  return JOB_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Contact info extractor ───────────────────────────────────────────────────
function extractContactInfo(text: string): {
  email?: string;
  phone?: string;
} {
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  // Match: +91-XXXXX-XXXXX, +91XXXXXXXXXX, 10-digit, or spaced formats
  const phoneMatch = text.match(
    /(?:\+91[\s\-]?)?(?:[6-9]\d{9}|\d{3}[\s\-]\d{3}[\s\-]\d{4})/
  );
  return {
    email: emailMatch?.[0],
    phone: phoneMatch?.[0]?.replace(/[\s\-]/g, ""),
  };
}

// ─── Batch helper (N concurrent) ─────────────────────────────────────────────
async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  delayMs: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, groupName, userEmail, messages } = body as {
      groupId: string;
      groupName: string;
      userEmail: string;
      messages: Array<{
        id: string;           // whatsappMessageId (msg.key.id)
        text: string;
        sender: string;
        senderName: string;
        timestamp: number;    // unix seconds
      }>;
    };

    if (!groupId || !userEmail || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Step 1: Store all messages (upsert — skip already-analysed) ──────────
    const inputs: WAMessageInput[] = messages
      .filter((m) => m.text?.trim().length > 0)
      .map((m) => ({
        userEmail,
        groupId,
        groupName,
        whatsappMessageId: m.id,
        senderPhone: m.sender ?? "",
        senderName: m.senderName ?? "Unknown",
        text: m.text,
        timestamp: new Date(m.timestamp * 1000),
      }));

    await upsertWAMessagesAction(inputs);

    // ── Step 2: Identify new messages that are still "raw" ────────────────────
    // Re-query DB to get only messages with status="raw" for this sync batch
    // This ensures we don't re-analyze messages that were already processed
    const rawMessages = await prisma.whatsAppMessage.findMany({
      where: {
        userEmail,
        groupId,
        whatsappMessageId: { in: inputs.map((m) => m.whatsappMessageId) },
        status: "raw",
      },
      select: { whatsappMessageId: true, text: true },
    });

    // Map back to our input format for processing
    const newMessages = rawMessages.map((raw) => {
      const original = inputs.find((i) => i.whatsappMessageId === raw.whatsappMessageId)!;
      return original;
    });

    // ── Step 3: Keyword pre-flight ────────────────────────────────────────────
    const likelyJobs = newMessages.filter((m) => isLikelyJobPost(m.text));
    const skipped = newMessages.filter((m) => !isLikelyJobPost(m.text));

    // Mark skipped messages
    await Promise.all(
      skipped.map((m) =>
        updateWAMessageAnalysisAction(m.whatsappMessageId, { status: "skipped" })
      )
    );

    // ── Step 4: Analyse likely-job messages with Gemini ───────────────────────
    const analysisResults = await runInBatches(
      likelyJobs,
      4,   // 4 concurrent
      600, // 600ms between batches to respect rate limits
      async (msg) => {
        // 4a: Extract contact info from message text
        const { email: contactEmail, phone: contactPhone } = extractContactInfo(msg.text);

        // 4b: Targeted DB lookup by email/phone (only if found)
        const existingJobs = await getJobPostsByContactAction(
          userEmail,
          contactEmail,
          contactPhone
        );

        // 4c: Run Gemini analysis — pass only the matching jobs for dedup
        const result = await analyzeJobCandidacyAction(
          msg.text,
          userEmail,
          existingJobs.length > 0 ? existingJobs : undefined
        );

        if (!result.success) {
          // Mark as skipped if AI failed
          await updateWAMessageAnalysisAction(msg.whatsappMessageId, { status: "skipped" });
          return { msg, result: null };
        }

        // 4d: Determine final status
        if (result.isDuplicate && result.duplicateJobId) {
          // Duplicate detected — link to existing job, no new record
          await updateWAMessageAnalysisAction(msg.whatsappMessageId, {
            status: "duplicate",
            aiScore: result.score,
            aiRole: result.role,
            aiCompany: result.company,
            aiExplanation: result.explanation,
            matchedSkills: result.matchedSkills ?? [],
            missingSkills: result.missingSkills ?? [],
            isDuplicate: true,
            duplicateOfJobId: result.duplicateJobId,
          });
          return { msg, result };
        }

        const score = result.score ?? 0;

        if (score >= 55) {
          // Strong lead — create a JobPost
          try {
            const jobPostId = await createJobPostFromWAAction({
              userEmail,
              waMessageId: msg.whatsappMessageId,
              role: result.role ?? "Unknown Role",
              company: result.company ?? "Unknown Company",
              originalText: msg.text,
              contactEmail: result.contactEmail,
              contactCc: result.contactCc,
              contactBcc: result.contactBcc,
              contactPhone: result.contactPhone,
              upworkJobUrl: result.upworkJobUrl,
              applyUrl: result.applyUrl,
              matchScore: score,
              matchExplanation: result.explanation,
              matchedSkills: result.matchedSkills,
              missingSkills: result.missingSkills,
            });
            await updateWAMessageAnalysisAction(msg.whatsappMessageId, {
              status: "lead",
              aiScore: score,
              aiRole: result.role,
              aiCompany: result.company,
              aiExplanation: result.explanation,
              matchedSkills: result.matchedSkills ?? [],
              missingSkills: result.missingSkills ?? [],
              jobPostId,
            });
          } catch (err) {
            console.error("[sync-and-analyze] createJobPostFromWA failed:", err);
            await updateWAMessageAnalysisAction(msg.whatsappMessageId, {
              status: "analyzed",
              aiScore: score,
              aiRole: result.role,
              aiCompany: result.company,
              aiExplanation: result.explanation,
              matchedSkills: result.matchedSkills ?? [],
              missingSkills: result.missingSkills ?? [],
            });
          }
        } else {
          // Low score — analyzed but not a lead
          await updateWAMessageAnalysisAction(msg.whatsappMessageId, {
            status: "analyzed",
            aiScore: score,
            aiRole: result.role,
            aiCompany: result.company,
            aiExplanation: result.explanation,
            matchedSkills: result.matchedSkills ?? [],
            missingSkills: result.missingSkills ?? [],
          });
        }

        return { msg, result };
      }
    );

    // ── Step 5: Return summary stats ──────────────────────────────────────────
    const leads = analysisResults.filter(
      (r) => r.result?.success && !r.result?.isDuplicate && (r.result?.score ?? 0) >= 55
    ).length;
    const duplicates = analysisResults.filter((r) => r.result?.isDuplicate).length;
    const analyzed = likelyJobs.length - leads - duplicates;

    return NextResponse.json({
      success: true,
      stats: {
        total: messages.length,
        skipped: skipped.length,
        analyzed,
        leads,
        duplicates,
      },
    });
  } catch (err: any) {
    console.error("[sync-and-analyze] Error:", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
