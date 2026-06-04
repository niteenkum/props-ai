"use server";

// ─── AI Expense Analytics Actions ─────────────────────────────────────────
// Fetches AiUsageLog data, aggregated stats, and per-row records for the
// centralized expense dashboard.

import { prisma } from "../utils/prisma";

// Prisma v7 generator doesn't update client.ts/models.ts for new models;
// cast to access the AiUsageLog property (exists at runtime, stale in client.ts types).
type AnyPrisma = typeof prisma & { aiUsageLog: any };
const db = prisma as AnyPrisma;


export interface AiExpenseRow {
  id:           string;
  apiType:      string;
  category:     string;
  model:        string;
  provider:     string;
  jobPostId:    string | null;
  userEmail:    string | null;
  inputTokens:  number;
  outputTokens: number;
  totalTokens:  number;
  inputCostUsd:  number;
  outputCostUsd: number;
  totalCostUsd:  number;
  durationMs:   number;
  success:      boolean;
  errorMessage: string | null;
  createdAt:    string; // ISO string
}

export interface AiExpenseSummary {
  totalCalls:         number;
  successCalls:       number;
  failedCalls:        number;
  totalInputTokens:   number;
  totalOutputTokens:  number;
  totalTokens:        number;
  totalCostUsd:       number;
  avgLatencyMs:       number;
  byCategory: {
    category:     string;
    calls:        number;
    tokens:       number;
    costUsd:      number;
  }[];
  byApiType: {
    apiType:      string;
    calls:        number;
    tokens:       number;
    costUsd:      number;
  }[];
}

/**
 * Fetch all AI usage logs (most recent first), up to 500 rows
 */
export async function getAiExpenseLogsAction(): Promise<AiExpenseRow[]> {
  const logs = await db.aiUsageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return logs.map((l: any) => ({
    id:            l.id,
    apiType:       l.apiType,
    category:      l.category,
    model:         l.model,
    provider:      l.provider,
    jobPostId:     l.jobPostId,
    userEmail:     l.userEmail,
    inputTokens:   l.inputTokens,
    outputTokens:  l.outputTokens,
    totalTokens:   l.totalTokens,
    inputCostUsd:  l.inputCostUsd,
    outputCostUsd: l.outputCostUsd,
    totalCostUsd:  l.totalCostUsd,
    durationMs:    l.durationMs,
    success:       l.success,
    errorMessage:  l.errorMessage,
    createdAt:     l.createdAt.toISOString(),
  }));
}

/**
 * Aggregate summary stats across all logs
 */
export async function getAiExpenseSummaryAction(): Promise<AiExpenseSummary> {
  const [agg, byCategory, byApiType, total] = await Promise.all([
    db.aiUsageLog.aggregate({
      _sum:  { inputTokens: true, outputTokens: true, totalTokens: true, totalCostUsd: true, durationMs: true },
      _count: { _all: true },
    }),
    db.aiUsageLog.groupBy({
      by: ["category"],
      _sum:   { totalTokens: true, totalCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
    }),
    db.aiUsageLog.groupBy({
      by: ["apiType"],
      _sum:   { totalTokens: true, totalCostUsd: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCostUsd: "desc" } },
    }),
    db.aiUsageLog.count(),
  ]);

  const successCalls = await db.aiUsageLog.count({ where: { success: true  } });
  const failedCalls  = await db.aiUsageLog.count({ where: { success: false } });

  return {
    totalCalls:        total,
    successCalls,
    failedCalls,
    totalInputTokens:  agg._sum.inputTokens  || 0,
    totalOutputTokens: agg._sum.outputTokens || 0,
    totalTokens:       agg._sum.totalTokens  || 0,
    totalCostUsd:      agg._sum.totalCostUsd || 0,
    avgLatencyMs:
      total > 0
        ? Math.round((agg._sum.durationMs || 0) / total)
        : 0,
    byCategory: byCategory.map((r: any) => ({
      category: r.category,
      calls:    r._count._all,
      tokens:   r._sum.totalTokens  || 0,
      costUsd:  r._sum.totalCostUsd || 0,
    })),
    byApiType: byApiType.map((r: any) => ({
      apiType: r.apiType,
      calls:   r._count._all,
      tokens:  r._sum.totalTokens  || 0,
      costUsd: r._sum.totalCostUsd || 0,
    })),
  };
}
