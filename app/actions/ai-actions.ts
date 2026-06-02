"use server";

// ─── AI Server Actions ─────────────────────────────────────────────────────
// All AI calls happen server-side. No API keys leak to the client.

import { isAIAvailable, generateAllTemplates, generateTemplate, analyzeJobWithAI, getActiveProviderName } from "../utils/ai/service";
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

