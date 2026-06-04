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
    contactEmail: string; matchScore: number; tags: string[]; parsedSummary: string;
  };
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
      matchScore:    heuristic.matchScore,
      tags:          heuristic.tags,
      parsedSummary: heuristic.parsedSummary,
      notes:         heuristic.notes,
    };

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
            tags:          aiParsed.tags?.length   ? aiParsed.tags : parsed.tags,
            parsedSummary: aiParsed.parsedSummary || parsed.parsedSummary,
          };
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
          if (attempts < 2) await new Promise(r => setTimeout(r, msg.includes("429") ? 3000 : 1000));
          else results[platform] = `[Generation failed for ${platform}. Please try again.]`;
        }
      }
      if (i < platforms.length - 1) await new Promise(r => setTimeout(r, 350));
    }

    console.log(`[generateProposalsAction] Done — ${Object.keys(results).length}/${platforms.length} generated.`);
    return {
      success: true,
      results,
      parsed: {
        role: parsed.role, company: parsed.company, contactName: parsed.contactName,
        contactEmail: parsed.contactEmail, matchScore: parsed.matchScore,
        tags: parsed.tags, parsedSummary: parsed.parsedSummary,
      },
      provider: String(providerName),
    };
  } catch (err: any) {
    console.error("[generateProposalsAction] Unexpected error:", err);
    return { success: false, error: err?.message || "Unexpected error during generation." };
  }
}

// ─── Live candidacy analysis via AI ────────────────────────────────────────
// Called by the Live Analysis Engine panel while the user is typing.
// Sends the full profile + job post to AI, returns a structured candidacy score.

export async function analyzeJobCandidacyAction(
  jobText: string,
  userEmail: string
): Promise<{
  success: boolean;
  score?: number;
  role?: string;
  company?: string;
  contactEmail?: string;
  contactPhone?: string;
  explanation?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
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

    const systemPrompt = `You are a smart job-candidacy analyzer. Given a professional profile and a job post, analyze how well the candidate fits.

CRITICAL: Output ONLY valid JSON. No markdown, no explanation, no code blocks.`;

    const userPrompt = `Analyze this candidacy and return JSON.

CANDIDATE:
- Role: ${profile.role}
- Skills: ${profile.skills.join(", ")}
${profile.resumeText ? `- Summary: ${profile.resumeText.slice(0, 300)}` : ""}
${projectSummaries ? `- Projects:\n${projectSummaries}` : ""}

JOB POST:
${jobText.slice(0, 1200)}

RULES:
- Look BEYOND exact keyword matches. "Web developer" job = match for React/Next.js/Node.js developer
- "Full Stack" role matches someone with frontend + backend skills
- Score 0 = completely wrong field, 50 = partial overlap, 85-100 = strong match
- Extract phone numbers (like 8383873071) as contactPhone

Return ONLY this JSON:
{
  "score": <0-100 integer>,
  "role": "<job title>",
  "company": "<company or 'Not specified'>",
  "contactEmail": "<email or ''>",
  "contactPhone": "<phone or ''>",
  "explanation": "<1-2 honest sentences about fit>",
  "matchedSkills": ["<candidate skill relevant to job>"],
  "missingSkills": ["<skill job needs that candidate lacks>"]
}`;

    const raw = await provider.generate({
      systemPrompt, userPrompt,
      temperature: 0.2, maxTokens: 512, apiType: "candidacy_analysis",
    });

    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const p = JSON.parse(jsonStr);
    return {
      success: true,
      score:         typeof p.score === "number" ? Math.min(Math.max(p.score, 0), 100) : 50,
      role:          p.role          || "Unknown",
      company:       p.company       || "Not specified",
      contactEmail:  p.contactEmail  || "",
      contactPhone:  p.contactPhone  || "",
      explanation:   p.explanation   || "",
      matchedSkills: Array.isArray(p.matchedSkills) ? p.matchedSkills : [],
      missingSkills: Array.isArray(p.missingSkills)  ? p.missingSkills  : [],
    };
  } catch (err: any) {
    console.error("[analyzeJobCandidacyAction] Failed:", err);
    return { success: false, error: err?.message || "AI candidacy analysis failed" };
  }
}
