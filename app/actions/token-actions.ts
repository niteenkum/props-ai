"use server";

import { prisma } from "../utils/prisma";

// Server-side actions for AI Expense Token Pricing Model

export interface TokenTxRow {
  id:          string;
  userEmail:   string;
  type:        "GRANT" | "PURCHASE" | "USAGE" | string;
  amount:      number;
  description: string;
  costUsd:     number; // Stores retail value (INR) for purchase/grant, or actual API cost (INR) for usage
  createdAt:    string;
}

export interface TokenStats {
  actualCostPerToken:  number;
  retailPricePerToken: number;
  totalTokensConsumed: number;
  totalApiCostInr:     number;
  totalRevenueInr:     number;
  marginInr:           number;
  marginPercent:       number;
}

/**
 * Fetch token balance and recent transactions for a user
 */
export async function getUserTokensAction(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { tokenBalance: true },
    });

    const txs = await prisma.tokenTransaction.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      success: true,
      tokenBalance: user?.tokenBalance ?? 0,
      transactions: txs.map(t => ({
        id:          t.id,
        userEmail:   t.userEmail,
        type:        t.type,
        amount:      t.amount,
        description: t.description,
        costUsd:     t.costUsd,
        createdAt:   t.createdAt.toISOString(),
      })) as TokenTxRow[],
    };
  } catch (error: any) {
    return { success: false, error: error.message, tokenBalance: 0, transactions: [] };
  }
}

/**
 * Mock purchase flow for buying token plans in Indian Rupees (₹)
 */
export async function purchaseTokenPlanAction(email: string, planName: string, tokens: number, priceInr: number) {
  try {
    // 1. Fetch user to verify they exist
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 2. Perform transaction in DB
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { tokenBalance: { increment: tokens } },
      }),
      prisma.tokenTransaction.create({
        data: {
          userEmail:   email,
          type:        "PURCHASE",
          amount:      tokens,
          description: `Purchased Plan: ${planName} (₹${priceInr})`,
          costUsd:     priceInr, // Store the purchase value
        },
      }),
    ]);

    return { success: true, newBalance: user.tokenBalance + tokens };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Superadmin action: grant tokens manually to any account
 */
export async function grantTokensAction(adminEmail: string, targetEmail: string, amount: number, description: string) {
  try {
    // 1. Verify caller is superadmin
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== "SUPERADMIN") {
      return { success: false, error: "Access denied. Requires SUPERADMIN role." };
    }

    // 2. Verify target user exists
    const target = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (!target) {
      return { success: false, error: "Target user account not found" };
    }

    // 3. Update token balance & log transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { email: targetEmail },
        data: { tokenBalance: { increment: amount } },
      }),
      prisma.tokenTransaction.create({
        data: {
          userEmail:   targetEmail,
          type:        "GRANT",
          amount:      amount,
          description: `Admin Grant: ${description}`,
          costUsd:     0, // Free grant
        },
      }),
    ]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Superadmin action: configure token costs
 */
export async function configureTokenPricingAction(adminEmail: string, actualCost: number, retailPrice: number) {
  try {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== "SUPERADMIN") {
      return { success: false, error: "Access denied." };
    }

    const pricing = await prisma.tokenPricing.findFirst();
    if (pricing) {
      await prisma.tokenPricing.update({
        where: { id: pricing.id },
        data: { actualCostPerToken: actualCost, retailPricePerToken: retailPrice },
      });
    } else {
      await prisma.tokenPricing.create({
        data: { actualCostPerToken: actualCost, retailPricePerToken: retailPrice },
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get pricing settings and total system margins
 */
export async function getTokenPricingSettingsAction() {
  try {
    // 1. Fetch or create singleton pricing config
    let pricing = await prisma.tokenPricing.findFirst();
    if (!pricing) {
      pricing = await prisma.tokenPricing.create({
        data: {
          actualCostPerToken:  0.015, // default ₹0.015 per token
          retailPricePerToken: 1.0,   // default ₹1.00 per token
        },
      });
    }

    // 2. Aggregate stats
    const usageTxs = await prisma.tokenTransaction.findMany({
      where: { type: "USAGE" },
      select: { amount: true, costUsd: true },
    });

    const purchaseTxs = await prisma.tokenTransaction.findMany({
      where: { type: "PURCHASE" },
      select: { costUsd: true },
    });

    const totalTokensConsumed = Math.abs(usageTxs.reduce((sum, tx) => sum + tx.amount, 0));
    const totalApiCostInr     = usageTxs.reduce((sum, tx) => sum + tx.costUsd, 0);
    const totalRevenueInr     = purchaseTxs.reduce((sum, tx) => sum + tx.costUsd, 0);

    const marginInr     = totalRevenueInr - totalApiCostInr;
    const marginPercent = totalRevenueInr > 0 ? Math.round((marginInr / totalRevenueInr) * 100) : 0;

    return {
      success: true,
      settings: {
        actualCostPerToken:  pricing.actualCostPerToken,
        retailPricePerToken: pricing.retailPricePerToken,
        totalTokensConsumed,
        totalApiCostInr,
        totalRevenueInr,
        marginInr,
        marginPercent,
      } as TokenStats,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      settings: {
        actualCostPerToken:  0.015,
        retailPricePerToken: 1.0,
        totalTokensConsumed: 0,
        totalApiCostInr:     0,
        totalRevenueInr:     0,
        marginInr:           0,
        marginPercent:       0,
      } as TokenStats,
    };
  }
}

export interface UserStatsRow {
  email:               string;
  name:                string;
  tokenBalance:        number;
  role:                string; // Database role (SUPERADMIN or Developer)
  status:              string; // Database status (PENDING, ACTIVE, INACTIVE)
  totalCalls:          number;
  tokensConsumed:      number;
  actualCostInr:       number;
  revenueInr:          number;
}

/**
 * Superadmin action: Fetch stats grouped by user
 */
export async function getUserWiseStatsAction(adminEmail: string) {
  try {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== "SUPERADMIN") {
      return { success: false, error: "Access denied. Requires SUPERADMIN role.", stats: [] };
    }

    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        tokenBalance: true,
        role: true,
        status: true,
      }
    });

    const stats: UserStatsRow[] = [];
    for (const u of users) {
      const usageLogs = await prisma.aiUsageLog.findMany({
        where: { userEmail: u.email },
        select: { totalTokens: true, totalCostUsd: true }
      });

      const totalCalls = usageLogs.length;
      const tokensConsumed = usageLogs.reduce((sum, log) => sum + log.totalTokens, 0);
      const actualCostInr = usageLogs.reduce((sum, log) => sum + (log.totalCostUsd * 85), 0);

      const purchaseTxs = await prisma.tokenTransaction.findMany({
        where: { userEmail: u.email, type: "PURCHASE" },
        select: { costUsd: true }
      });
      const revenueInr = purchaseTxs.reduce((sum, tx) => sum + tx.costUsd, 0);

      stats.push({
        email: u.email,
        name: u.name,
        tokenBalance: u.tokenBalance,
        role: u.role,
        status: u.status,
        totalCalls,
        tokensConsumed,
        actualCostInr,
        revenueInr
      });
    }

    return { success: true, stats };
  } catch (error: any) {
    return { success: false, error: error.message, stats: [] };
  }
}

/**
 * Superadmin action: Update user role
 */
export async function updateUserRoleAction(adminEmail: string, targetEmail: string, newRole: string) {
  try {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== "SUPERADMIN") {
      return { success: false, error: "Access denied. Requires SUPERADMIN role." };
    }

    await prisma.user.update({
      where: { email: targetEmail },
      data: { role: newRole }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Superadmin action: Toggle user account status (ACTIVE vs INACTIVE)
 */
export async function toggleUserStatusAction(adminEmail: string, targetEmail: string, currentStatus: string) {
  try {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin || admin.role !== "SUPERADMIN") {
      return { success: false, error: "Access denied. Requires SUPERADMIN role." };
    }

    if (adminEmail === targetEmail) {
      return { success: false, error: "You cannot deactivate your own account!" };
    }

    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.user.update({
      where: { email: targetEmail },
      data: { status: nextStatus as any }
    });

    return { success: true, newStatus: nextStatus };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
