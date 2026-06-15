// ─── AI Usage Logger ──────────────────────────────────────────────────────
// Call logAiUsage() after any Gemini or Claude API call to record token usage + cost.
//
// Gemini 2.5 Flash pricing (as of 2025):
//   Input:  $0.075 / 1M tokens  |  Output: $0.30  / 1M tokens
//
// Anthropic Claude pricing (as of 2025):
//   Haiku 4.5:  $0.80  input / $4.00  output per 1M tokens
//   Sonnet 4.5: $3.00  input / $15.00 output per 1M tokens
//   Opus 4.5:   $15.00 input / $75.00 output per 1M tokens
//   3.5 Haiku:  $0.80  input / $4.00  output per 1M tokens
//   3.5 Sonnet: $3.00  input / $15.00 output per 1M tokens

import { prisma } from "../prisma";

// Prisma v7 generator doesn't update client.ts/models.ts for new models;
// the type lives in index.d.ts. We cast to `any` here to bypass the stale
// client.ts type — at runtime the AiUsageLog table works perfectly.
type AnyPrisma = typeof prisma & { aiUsageLog: any };
const db = prisma as AnyPrisma;

export type AiApiType =
  | "pdf_parse"
  | "job_analysis"
  | "candidacy_analysis"
  | "content_cold_email"
  | "content_proposal"
  | "content_linkedin"
  | "content_cover_letter"
  | "email_classification";

export type AiCategory =
  | "pdf_reading"
  | "job_analysis"
  | "content_writing"
  | "formalizing";

interface LogAiUsageParams {
  apiType:       AiApiType;
  category:      AiCategory;
  model:         string;
  provider?:     string;
  jobPostId?:    string;
  userEmail?:    string;
  inputTokens:   number;
  outputTokens:  number;
  durationMs:    number;
  success?:      boolean;
  errorMessage?: string;
}

// Pricing per 1M tokens (USD) — Gemini + Anthropic Claude
const PRICING: Record<string, { input: number; output: number }> = {
  // ── Gemini ──────────────────────────────────────────────────────────────
  "gemini-2.5-flash":          { input: 0.075,  output: 0.30   },
  "gemini-1.5-flash":          { input: 0.075,  output: 0.30   },
  "gemini-1.5-pro":            { input: 3.50,   output: 10.50  },
  "gemini-2.0-flash":          { input: 0.10,   output: 0.40   },

  // ── Anthropic Claude 4 family ────────────────────────────────────────────
  "claude-haiku-4":            { input: 0.80,   output: 4.00   },  // Haiku 4.x
  "claude-sonnet-4":           { input: 3.00,   output: 15.00  },  // Sonnet 4.x
  "claude-opus-4":             { input: 15.00,  output: 75.00  },  // Opus 4.x

  // ── Anthropic Claude 3.5 family ─────────────────────────────────────────
  "claude-3-5-haiku":          { input: 0.80,   output: 4.00   },  // 3.5 Haiku
  "claude-3-5-sonnet":         { input: 3.00,   output: 15.00  },  // 3.5 Sonnet
  "claude-3-opus":             { input: 15.00,  output: 75.00  },  // 3 Opus
};

// Default fallback pricing per provider
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  gemini:    { input: 0.075, output: 0.30  },  // assume Flash
  anthropic: { input: 3.00,  output: 15.00 },  // assume Sonnet
  claude:    { input: 3.00,  output: 15.00 },
  openai:    { input: 2.50,  output: 10.00 },  // assume GPT-4o
};

function getCostPerToken(model: string, provider?: string) {
  const modelLower = model.toLowerCase();
  const key = Object.keys(PRICING).find(k => modelLower.includes(k));
  if (key) return PRICING[key];
  // Fall back to provider-level default
  const providerKey = (provider || "gemini").toLowerCase();
  return DEFAULT_PRICING[providerKey] ?? DEFAULT_PRICING["gemini"];
}

export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    const pricing      = getCostPerToken(params.model, params.provider);
    const totalTokens  = params.inputTokens + params.outputTokens;
    const inputCostUsd  = (params.inputTokens  / 1_000_000) * pricing.input;
    const outputCostUsd = (params.outputTokens / 1_000_000) * pricing.output;
    const totalCostUsd  = inputCostUsd + outputCostUsd;

    await db.aiUsageLog.create({
      data: {
        apiType:      params.apiType,
        category:     params.category,
        model:        params.model,
        provider:     params.provider || "gemini",
        jobPostId:    params.jobPostId || null,
        userEmail:    params.userEmail || null,
        inputTokens:  params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens,
        inputCostUsd,
        outputCostUsd,
        totalCostUsd,
        durationMs:   params.durationMs,
        success:      params.success ?? true,
        errorMessage: params.errorMessage || null,
      },
    });
  } catch (err) {
    // Never let logging failures break the main flow
    console.error("[AI Usage Logger] Failed to log usage:", err);
  }
}

export function categoryForApiType(apiType: AiApiType): AiCategory {
  switch (apiType) {
    case "pdf_parse":           return "pdf_reading";
    case "job_analysis":        return "job_analysis";
    case "candidacy_analysis":  return "job_analysis";
    case "email_classification":return "job_analysis";
    case "content_linkedin":    return "formalizing";
    case "content_cold_email":
    case "content_proposal":
    case "content_cover_letter":return "content_writing";
  }
}
