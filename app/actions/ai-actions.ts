"use server";

// ─── AI Server Actions ─────────────────────────────────────────────────────
// All AI calls happen server-side. No API keys leak to the client.

import { isAIAvailable, generateAllTemplates, generateTemplate, analyzeJobWithAI, getActiveProviderName, generateForProvider, getAvailableProviders } from "../utils/ai/service";
import { analyzeJobPost } from "../utils/ai-engine";
import { getUserProfileAction } from "./db-actions";
import type { TemplateType, AIAnalysisResult } from "../utils/ai/types";
import type { UserProfile } from "../utils/db";

// ─── Analyze job post + generate all templates ─────────────────────────────

export async function analyzeAndGenerateAction(
  jobText: string,
  userEmail: string
): Promise<{ success: boolean; result?: AIAnalysisResult; error?: string; provider?: string | null }> {
  console.log("\n" + "═".repeat(60));
  console.log("📋 [AI Action] analyzeAndGenerateAction STARTED");
  console.log(`   📧 User: ${userEmail}`);
  console.log(`   📝 Job text length: ${jobText.length} chars`);
  console.log(`   📝 Job text preview: ${jobText.slice(0, 100)}...`);
  console.log("═".repeat(60));

  try {
    // Step 1: Load profile
    console.log("\n🔹 Step 1: Loading user profile...");
    const profile = await getUserProfileAction(userEmail);
    if (!profile) {
      console.error("❌ Profile NOT found for:", userEmail);
      return { success: false, error: "User profile not found. Please set up your profile first." };
    }
    console.log(`   ✅ Profile loaded: ${profile.name} (${profile.skills.length} skills)`);

    // Step 2: Heuristic analysis
    console.log("\n🔹 Step 2: Running heuristic analysis...");
    const heuristic = analyzeJobPost(jobText, profile);
    console.log(`   ✅ Heuristic result:`);
    console.log(`      Role: ${heuristic.role}`);
    console.log(`      Company: ${heuristic.company}`);
    console.log(`      Score: ${heuristic.matchScore}%`);
    console.log(`      Tags: [${heuristic.tags.join(", ")}]`);

    // Step 3: Check AI
    console.log("\n🔹 Step 3: Checking AI availability...");
    const aiReady = isAIAvailable();
    const providerName = getActiveProviderName();
    console.log(`   AI Available: ${aiReady}`);
    console.log(`   Provider: ${providerName || "NONE"}`);

    if (!aiReady) {
      console.log("   ⚠️  No AI provider — returning heuristic results");
      return { success: true, result: heuristic, provider: null };
    }

    // Step 4: AI analysis
    console.log("\n🔹 Step 4: Running AI job analysis...");
    const aiStart = Date.now();
    const aiParsed = await analyzeJobWithAI(jobText, profile);
    console.log(`   ⏱️  AI analysis took ${Date.now() - aiStart}ms`);
    if (aiParsed) {
      console.log(`   ✅ AI parsed: role=${aiParsed.role}, company=${aiParsed.company}`);
    } else {
      console.log(`   ⚠️  AI analysis returned null, using heuristic data`);
    }

    // Merge
    const parsed = {
      role: aiParsed?.role || heuristic.role,
      company: aiParsed?.company || heuristic.company,
      contactName: aiParsed?.contactName || heuristic.contactName,
      contactEmail: aiParsed?.contactEmail || heuristic.contactEmail,
      matchScore: heuristic.matchScore,
      tags: aiParsed?.tags && aiParsed.tags.length > 0 ? aiParsed.tags : heuristic.tags,
      parsedSummary: aiParsed?.parsedSummary || heuristic.parsedSummary,
      notes: heuristic.notes,
    };
    console.log(`\n🔹 Step 5: Merged parsed data:`);
    console.log(`   Role: ${parsed.role} | Company: ${parsed.company} | Score: ${parsed.matchScore}%`);

    // Step 6: Generate templates
    console.log("\n🔹 Step 6: Generating all templates...");
    const tplStart = Date.now();
    const templates = await generateAllTemplates(jobText, profile, parsed);
    console.log(`   ⏱️  All templates generated in ${Date.now() - tplStart}ms`);
    console.log(`   📧 coldEmail: ${templates.coldEmail ? templates.coldEmail.slice(0, 50) + "..." : "❌ EMPTY/FAILED"}`);
    console.log(`   💼 proposal:  ${templates.proposal ? templates.proposal.slice(0, 50) + "..." : "❌ EMPTY/FAILED"}`);
    console.log(`   🔗 linkedin:  ${templates.linkedin ? templates.linkedin.slice(0, 50) + "..." : "❌ EMPTY/FAILED"}`);
    console.log(`   📄 cover:     ${templates.coverLetter ? templates.coverLetter.slice(0, 50) + "..." : "❌ EMPTY/FAILED"}`);

    // Check for failed templates
    const failed = Object.entries(templates).filter(([, v]) => v.startsWith("[Generation failed"));
    if (failed.length > 0) {
      console.warn(`   ⚠️  ${failed.length} template(s) FAILED: ${failed.map(([k]) => k).join(", ")}`);
    }

    console.log("\n" + "═".repeat(60));
    console.log("✅ [AI Action] analyzeAndGenerateAction COMPLETE");
    console.log("═".repeat(60) + "\n");

    return {
      success: true,
      result: { ...parsed, generatedTemplates: templates },
      provider: providerName,
    };
  } catch (error) {
    console.error("\n" + "═".repeat(60));
    console.error("❌ [AI Action] analyzeAndGenerateAction CRASHED");
    console.error("   Error:", error instanceof Error ? error.message : error);
    console.error("   Stack:", error instanceof Error ? error.stack : "no stack");
    console.error("═".repeat(60) + "\n");

    // Fallback to heuristic on any AI failure
    try {
      console.log("🔄 [AI Action] Attempting heuristic fallback...");
      const profile = await getUserProfileAction(userEmail);
      if (profile) {
        const heuristic = analyzeJobPost(jobText, profile);
        console.log("✅ [AI Action] Heuristic fallback succeeded");
        return {
          success: true,
          result: heuristic,
          provider: null,
          error: `AI generation failed (${error instanceof Error ? error.message : "unknown"}). Using heuristic templates.`,
        };
      }
    } catch (fallbackError) {
      console.error("❌ [AI Action] Heuristic fallback also failed:", fallbackError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "AI generation failed",
    };
  }
}

// ─── Regenerate a single template ──────────────────────────────────────────

export async function regenerateTemplateAction(
  type: TemplateType,
  jobText: string,
  userEmail: string,
  parsedData: {
    role: string;
    company: string;
    contactName: string;
    contactEmail: string;
    matchScore: number;
    tags: string[];
    parsedSummary: string;
    notes: string;
  }
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const profile = await getUserProfileAction(userEmail);
    if (!profile) {
      return { success: false, error: "User profile not found." };
    }

    if (!isAIAvailable()) {
      return { success: false, error: "No AI provider configured. Add your API key in the .env file." };
    }

    const content = await generateTemplate(type, jobText, profile, parsedData);
    return { success: true, content };
  } catch (error) {
    console.error(`[AI Action] regenerateTemplateAction (${type}) failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Template generation failed",
    };
  }
}

// ─── Check AI status ───────────────────────────────────────────────────────

export async function getAIStatusAction(): Promise<{
  available: boolean;
  provider: string | null;
}> {
  return {
    available: isAIAvailable(),
    provider: getActiveProviderName(),
  };
}

// ─── Compare two job posts for duplicate detection ─────────────────────────

export async function compareDuplicatePostsAction(
  existingText: string,
  newText: string,
): Promise<{ isSame: boolean; confidence: number; reason: string }> {
  // Use the heuristic comparison (fast, no API required)
  const { heuristicCompare } = await import("../utils/platform-detector");
  const result = heuristicCompare(existingText, newText);

  // If confidence is in the ambiguous zone (60–85%) and AI is available, ask AI
  if (!result.isSame && result.confidence >= 60 && isAIAvailable()) {
    try {
      // Use the existing provider-agnostic AI service
      const { default: aiCompare } = await import("../utils/ai/compare-posts");
      const aiResult = await aiCompare(existingText, newText);
      if (aiResult) return aiResult;
    } catch (err) {
      console.warn("[AI] Duplicate comparison fallback to heuristic:", err);
    }
  }

  return result;
}

// ─── Get all available AI providers ────────────────────────────────────────

export async function getAvailableProvidersAction(): Promise<{
  providers: string[];
  activeProvider: string | null;
}> {
  return {
    providers:      getAvailableProviders(),
    activeProvider: getActiveProviderName(),
  };
}

// ─── Generate proposals for selected platforms via chosen model ─────────────

export async function generateProposalsAction(
  jobText: string,
  platforms: string[],
  providerName: "gemini" | "claude" | "openai" | "auto",
  userEmail: string
): Promise<{
  success: boolean;
  results?: Record<string, string>;
  parsed?: {
    role: string; company: string; contactName: string;
    contactEmail: string; contactCc?: string; contactBcc?: string;
    matchScore: number; tags: string[]; parsedSummary: string;
  };
  suggestAttachResume?: boolean;   // AI hint: should resume be attached?
  error?: string;
  provider?: string;
}> {
  console.log(`\n[generateProposalsAction] platforms=${platforms.join(",")} provider=${providerName} user=${userEmail}`);

  try {
    const profile = await getUserProfileAction(userEmail);
    if (!profile) {
      return { success: false, error: "User profile not found. Please complete your profile first." };
    }

    const heuristic = analyzeJobPost(jobText, profile);
    let parsed = {
      role:          heuristic.role,
      company:       heuristic.company,
      contactName:   heuristic.contactName,
      contactEmail:  heuristic.contactEmail,
      contactCc:     undefined as string | undefined,
      contactBcc:    undefined as string | undefined,
      matchScore:    heuristic.matchScore,
      tags:          heuristic.tags,
      parsedSummary: heuristic.parsedSummary,
      notes:         heuristic.notes,
    };

    let suggestAttachResume: boolean | undefined;

    if (isAIAvailable()) {
      try {
        const aiParsed = await analyzeJobWithAI(jobText, profile);
        if (aiParsed) {
          parsed = {
            ...parsed,
            role:          aiParsed.role          || parsed.role,
            company:       aiParsed.company       || parsed.company,
            contactName:   aiParsed.contactName   || parsed.contactName,
            contactEmail:  aiParsed.contactEmail  || parsed.contactEmail,
            contactCc:     aiParsed.contactCc     || parsed.contactCc,
            contactBcc:    aiParsed.contactBcc    || parsed.contactBcc,
            tags:          aiParsed.tags?.length   ? aiParsed.tags : parsed.tags,
            parsedSummary: aiParsed.parsedSummary || parsed.parsedSummary,
          };
          // Carry the AI's attach-resume recommendation
          if (typeof aiParsed.suggestAttachResume === "boolean") {
            suggestAttachResume = aiParsed.suggestAttachResume;
          }
        }
      } catch { /* ignore — use heuristic */ }
    }

    const results: Record<string, string> = {};

    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      let attempts = 0;
      console.log(`[generateProposalsAction] [${i+1}/${platforms.length}] Generating "${platform}"...`);

      while (attempts < 2) {
        try {
          results[platform] = await generateForProvider(providerName, platform, jobText, profile, parsed);
          break;
        } catch (err: any) {
          attempts++;
          const msg = err?.message || String(err);
          console.error(`[generateProposalsAction] "${platform}" attempt ${attempts} failed: ${msg}`);
          if (attempts < 2) {
            // If Claude failed (bad key / model not on tier), fall back to Gemini
            const isClaudeFail = msg.includes("Claude API error") &&
              (providerName === "auto" || providerName === "claude");
            if (isClaudeFail) {
              console.warn(`[generateProposalsAction] Claude failed for "${platform}", falling back to Gemini`);
              try {
                results[platform] = await generateForProvider("gemini", platform, jobText, profile, parsed);
                break;
              } catch (fallbackErr: any) {
                console.error(`[generateProposalsAction] Gemini fallback also failed: ${fallbackErr?.message}`);
              }
            }
            await new Promise(r => setTimeout(r, msg.includes("429") ? 3000 : 1000));
          } else {
            results[platform] = `[Generation failed for ${platform}. Please try again.]`;
          }
        }
      }
      if (i < platforms.length - 1) await new Promise(r => setTimeout(r, 350));
    }

    console.log(`[generateProposalsAction] Done — ${Object.keys(results).length}/${platforms.length} generated. attachResume=${suggestAttachResume}`);
    return {
      success: true,
      results,
      parsed: {
        role: parsed.role, company: parsed.company, contactName: parsed.contactName,
        contactEmail: parsed.contactEmail, contactCc: parsed.contactCc, contactBcc: parsed.contactBcc,
        matchScore: parsed.matchScore, tags: parsed.tags, parsedSummary: parsed.parsedSummary,
      },
      suggestAttachResume,
      provider: String(providerName),
    };
  } catch (err: any) {
    console.error("[generateProposalsAction] Unexpected error:", err);
    return { success: false, error: err?.message || "Unexpected error during generation." };
  }
}

// ─── Unified job analysis: candidacy scoring + duplicate detection ────────────
// Called when user clicks "Analyze Job".
// Flow:
//   1. Extract email from job post (caller's responsibility)
//   2. If existingJobs provided → AI checks for duplicate AND scores candidacy in one call
//   3. If no existingJobs (no email found) → AI scores candidacy + extracts contact info

export interface ExistingJobSnippet {
  id: string;
  role: string;
  company: string;
  originalText: string;
}

export async function analyzeJobCandidacyAction(
  jobText: string,
  userEmail: string,
  existingJobs?: ExistingJobSnippet[]
): Promise<{
  success: boolean;
  score?: number;
  role?: string;
  company?: string;
  contactEmail?: string;
  contactCc?: string;
  contactBcc?: string;
  contactPhone?: string;
  upworkJobUrl?: string;
  applyUrl?: string;
  explanation?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  isDuplicate?: boolean;
  duplicateJobId?: string;
  duplicateReason?: string;
  error?: string;
}> {
  if (!jobText.trim() || jobText.length < 30) {
    return { success: false, error: "Job text too short" };
  }

  try {
    const profile = await getUserProfileAction(userEmail);
    if (!profile) return { success: false, error: "Profile not found" };

    if (!isAIAvailable()) return { success: false, error: "No AI provider available" };

    const { getProvider } = await import("../utils/ai/service");
    const provider = getProvider();
    if (!provider) return { success: false, error: "No provider" };

    const projectSummaries = profile.projects.slice(0, 5).map(p =>
      `• ${p.name}: ${p.description.slice(0, 100)} [${p.tech.slice(0, 4).join(", ")}]`
    ).join("\n");

    const hasPrior = existingJobs && existingJobs.length > 0;

    const duplicateSection = hasPrior
      ? `\nEXISTING JOBS IN DB (check if new post is duplicate of any):
${existingJobs!.map((j, i) =>
  `[${i}] id="${j.id}" role="${j.role}" company="${j.company}"\n${j.originalText.slice(0, 400)}`
).join("\n---\n")}

DUPLICATE RULES:
- Same job = same company + same role + similar requirements (even if reworded)
- Different budget/deadline alone does NOT make it a different job
- Only flag isDuplicate=true if confidence > 75%
`
      : "";

    const systemPrompt = `You are a smart job-candidacy analyzer. Analyze candidacy fit${hasPrior ? " and detect duplicates" : ""}.
CRITICAL: Output ONLY valid JSON. No markdown, no explanation, no code blocks.`;

    const duplicateFields = hasPrior
      ? `,\n  "isDuplicate": <true|false>,\n  "duplicateJobId": "<matching id from existing jobs or ''>",\n  "duplicateReason": "<brief reason or ''>"` : "";

    const userPrompt = `Analyze this candidacy${hasPrior ? " and check for duplicates" : ""} and return JSON.

CANDIDATE PROFILE:
- Role: ${profile.role}
- Skills: ${profile.skills.join(", ")}
${profile.resumeText ? `- Resume Text:\n${profile.resumeText}` : ""}
${projectSummaries ? `- Projects:\n${projectSummaries}` : ""}
${duplicateSection}
NEW JOB POST:
${jobText.slice(0, 1200)}

SCORING RULES — follow in this exact priority order:

STEP 1 — ROLE MATCH (highest weight):
- The candidate's stated Role is the STRONGEST signal. If the job title or description semantically matches the candidate's role, start at 65-80%.
- "Website Developer" / "Web Developer" / "Web Designer" = match for any web development role (Full Stack, Frontend, Backend, WordPress, Laravel, React, etc.)
- "Video Editor" job = match for any candidate whose role or skills include video editing
- "Content Writer" job = match for any content writing / copywriting role
- A vague job with no specific tech requirement means: if the candidate's role fits the general domain → score 65-80+

STEP 2 — SKILL & PROJECT DEPTH (adjust up/down from STEP 1):
- Use the candidate's listed skills, resume, and projects to fine-tune the score
- More relevant skills/projects → push score higher (toward 85-100)
- Candidate skills in wrong domain entirely → push score lower (toward 20-40)
- DO NOT penalize for having extra skills (LLMs, AI, etc.) that the job didn't ask for

STEP 3 — MISSING SKILLS (only genuinely absent capabilities):
- A broader skill implies its sub-skills. "Full Stack Developer" covers frontend, backend, web development
- "Laravel Developer" implies PHP, MySQL, MVC. "Content Writing" implies copywriting, SEO writing, blog writing
- ONLY list a skill as missing if the job specifically requires something the candidate has ZERO evidence of
- If the job is vague (no specific tech stack listed), missingSkills should be EMPTY or just 1-2 items max

SCORE FLOORS:
- If job domain matches candidate's role → minimum score is 50, never give 0-30 unless it's a completely different field
- 0-30 = completely wrong field (e.g., doctor applying for software job)
- 40-60 = same broad domain but missing some specific things
- 65-80 = good match, candidate can do this job
- 85-100 = strong match with directly relevant skills

- Extract phone numbers as contactPhone
- Extract Upwork job URLs (upwork.com/jobs/... or upwork.com/ab/...) as upworkJobUrl
- Extract any application/apply URL (google forms, typeform, careers page, etc.) as applyUrl

Return ONLY this JSON:
{
  "score": <0-100 integer>,
  "role": "<job title>",
  "company": "<company or 'Not specified'>",
  "contactEmail": "<email or ''>",
  "contactCc": "<cc email or alternative application email if found, else ''>",
  "contactBcc": "<bcc email if found, else ''>",
  "contactPhone": "<phone or ''>",
  "upworkJobUrl": "<upwork job link or ''>",
  "applyUrl": "<any other application URL or ''>",
  "explanation": "<1-2 honest sentences about fit based on candidate's actual role and skills>",
  "matchedSkills": ["<skills from the candidate's profile that are directly or implicitly relevant>"],
  "missingSkills": ["<only genuinely absent capabilities not coverable from existing profile — keep empty [] for vague job posts>"]${duplicateFields}
}`;

    const raw = await provider.generate({
      systemPrompt, userPrompt,
      temperature: 0.2, maxTokens: 1200, apiType: "candidacy_analysis",
      jsonMode: true,
    });

    // ── Robust JSON extraction — multi-attempt ────────────────────────────
    const raw2 = raw.trim();

    // Helper: extract first balanced {...} block
    function extractJson(s: string): string {
      const start = s.indexOf("{");
      const end   = s.lastIndexOf("}");
      return (start !== -1 && end > start) ? s.slice(start, end + 1) : s;
    }

    // Attempt 1: strip code fences + extract {} + fix trailing commas
    function basicClean(s: string): string {
      return s
        .replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "")  // fences
        .replace(/,\s*([}\]])/g, "$1")                                // trailing commas
        .replace(/:\s*True\b/g, ": true").replace(/:\s*False\b/g, ": false"); // Python bools
    }

    // Attempt 2: also fix unquoted keys — only at property-name positions
    // Safe approach: use a state-machine style replace that skips string content
    function fixUnquotedKeys(s: string): string {
      // Only match identifier immediately after { or , (skips inside string values)
      return s.replace(/([{,]\s*)([a-zA-Z_]\w*)\s*(?=:)/g, (_, prefix, key) => {
        // If already preceded by a quote, skip
        return `${prefix}"${key}"`;
      });
    }

    let p: Record<string, unknown> = {};
    const attempts = [
      () => JSON.parse(raw2),
      () => JSON.parse(basicClean(raw2)),
      () => JSON.parse(basicClean(extractJson(raw2))),
      () => JSON.parse(fixUnquotedKeys(basicClean(extractJson(raw2)))),
    ];

    let parsed = false;
    for (const attempt of attempts) {
      try { p = attempt(); parsed = true; break; } catch { /* try next */ }
    }
    if (!parsed) {
      console.error("[analyzeJobCandidacyAction] All JSON parse attempts failed. Raw:", raw2.slice(0, 600));
      throw new Error("AI returned invalid JSON after all recovery attempts");
    }


    const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

    let contactEmail = str(p.contactEmail);
    if (!contactEmail) {
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const foundEmails = jobText.match(emailRegex);
      if (foundEmails && foundEmails.length > 0) {
        contactEmail = foundEmails[0];
      }
    }

    return {
      success:        true,
      score:          typeof p.score === "number" ? Math.min(Math.max(p.score, 0), 100) : 50,
      role:           str(p.role, "Unknown"),
      company:        str(p.company, "Not specified"),
      contactEmail,
      contactCc:      str(p.contactCc),
      contactBcc:     str(p.contactBcc),
      contactPhone:   str(p.contactPhone),
      upworkJobUrl:   str(p.upworkJobUrl),
      applyUrl:       str(p.applyUrl),
      explanation:    str(p.explanation),
      matchedSkills:  Array.isArray(p.matchedSkills) ? (p.matchedSkills as string[]) : [],
      missingSkills:  Array.isArray(p.missingSkills)  ? (p.missingSkills  as string[]) : [],
      isDuplicate:    hasPrior ? !!p.isDuplicate : undefined,
      duplicateJobId: str(p.duplicateJobId),
      duplicateReason: str(p.duplicateReason),
    };
  } catch (err: any) {
    console.error("[analyzeJobCandidacyAction] Failed:", err);
    return { success: false, error: err?.message || "AI candidacy analysis failed" };
  }
}
