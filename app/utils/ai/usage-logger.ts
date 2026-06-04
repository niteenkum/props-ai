// ─── AI Usage Logger ──────────────────────────────────────────────────────
// Call logAiUsage() after any Gemini API call to record token usage + cost.
// Gemini 2.5 Flash pricing (as of 2025):
//   Input:  $0.075 / 1M tokens
//   Output: $0.30  / 1M tokens

import { prisma } from "../prisma";

// Prisma v7 generator doesn't update client.ts/models.ts for new models;
// the type lives in index.d.ts. We cast to `any` here to bypass the stale
// client.ts type — at runtime the AiUsageLog table works perfectly.
type AnyPrisma = typeof prisma & { aiUsageLog: any };
const db = prisma as AnyPrisma;

export type AiApiType =
  | "pdf_parse"
  | "job_analysis"
  | "content_cold_email"
  | "content_proposal"
  | "content_linkedin"
  | "content_cover_letter";

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

// Gemini 2.5 Flash pricing per 1M tokens (USD)
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash":   { input: 0.075,  output: 0.30  },
  "gemini-1.5-flash":   { input: 0.075,  output: 0.30  },
  "gemini-1.5-pro":     { input: 3.50,   output: 10.50 },
  "gemini-2.0-flash":   { input: 0.10,   output: 0.40  },
};

function getCostPerToken(model: string) {
  const key = Object.keys(PRICING).find(k => model.toLowerCase().includes(k));
  return PRICING[key || "gemini-2.5-flash"];
}

export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    const pricing      = getCostPerToken(params.model);
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
    case "content_linkedin":    return "formalizing";
    case "content_cold_email":
    case "content_proposal":
    case "content_cover_letter":return "content_writing";
  }
}
