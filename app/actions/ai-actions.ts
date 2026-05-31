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
  try {
    const profile = await getUserProfileAction(userEmail);
    if (!profile) {
      return { success: false, error: "User profile not found. Please set up your profile first." };
    }

    // Step 1: Always run heuristic analysis first (for role, company, tags, score)
    const heuristic = analyzeJobPost(jobText, profile);

    // Step 2: Check if AI is available
    if (!isAIAvailable()) {
      // No AI provider — return heuristic results as-is
      console.log("[AI Action] No AI provider — returning heuristic results");
      return {
        success: true,
        result: heuristic,
        provider: null,
      };
    }

    // Step 3: Try AI-enhanced analysis for role/company/tags
    const aiParsed = await analyzeJobWithAI(jobText, profile);

    // Merge: prefer AI-parsed data where available, keep heuristic scores
    const parsed = {
      role: aiParsed?.role || heuristic.role,
      company: aiParsed?.company || heuristic.company,
      contactName: aiParsed?.contactName || heuristic.contactName,
      contactEmail: aiParsed?.contactEmail || heuristic.contactEmail,
      matchScore: heuristic.matchScore, // always from heuristic
      tags: aiParsed?.tags && aiParsed.tags.length > 0 ? aiParsed.tags : heuristic.tags,
      parsedSummary: aiParsed?.parsedSummary || heuristic.parsedSummary,
      notes: heuristic.notes,
    };

    // Step 4: Generate all 4 templates with AI
    const templates = await generateAllTemplates(jobText, profile, parsed);

    return {
      success: true,
      result: {
        ...parsed,
        generatedTemplates: templates,
      },
      provider: getActiveProviderName(),
    };
  } catch (error) {
    console.error("[AI Action] analyzeAndGenerateAction failed:", error);

    // Fallback to heuristic on any AI failure
    try {
      const profile = await getUserProfileAction(userEmail);
      if (profile) {
        const heuristic = analyzeJobPost(jobText, profile);
        return {
          success: true,
          result: heuristic,
          provider: null,
          error: `AI generation failed (${error instanceof Error ? error.message : "unknown"}). Using heuristic templates.`,
        };
      }
    } catch (fallbackError) {
      console.error("[AI Action] Fallback also failed:", fallbackError);
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
