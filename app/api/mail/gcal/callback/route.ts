/**
 * Google Calendar OAuth Callback — via Corsair SDK
 * GET /api/mail/gcal/callback?code=...&state=...
 *
 * Corsair exchanges the code for tokens and stores them encrypted.
 * Redirects to /dashboard/followups on success.
 */
import { NextRequest, NextResponse } from "next/server";
import { processOAuthCallback } from "corsair/oauth";
import { corsair } from "../../../../utils/corsair";
import { prisma } from "../../../../utils/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("[gcal/callback] OAuth error:", error);
    return NextResponse.redirect(new URL(`/dashboard/followups?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/followups?error=missing_params", req.url));
  }

  try {
    const redirectUri = process.env.GCAL_REDIRECT_URI!;
    const { tenantId: userEmail } = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    });

    console.log(`[gcal/callback] ✅ Google Calendar connected for ${userEmail}`);

    // Track calendar connection in our DB
    await prisma.mailAccount.upsert({
      where: { userEmail_provider: { userEmail, provider: "googlecalendar" } },
      update: { accountEmail: userEmail, updatedAt: new Date() },
      create: {
        userEmail,
        provider:     "googlecalendar",
        accountEmail: userEmail,
        accessToken:  "managed-by-corsair",
        refreshToken: "managed-by-corsair",
        expiresAt:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.redirect(new URL("/dashboard/followups?connected=calendar", req.url));
  } catch (err: any) {
    console.error("[gcal/callback] Error:", err);
    return NextResponse.redirect(new URL(`/dashboard/followups?error=${encodeURIComponent(err.message ?? "callback_failed")}`, req.url));
  }
}
