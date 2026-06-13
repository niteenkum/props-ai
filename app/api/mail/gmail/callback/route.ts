/**
 * Gmail OAuth Callback — via Corsair SDK
 * GET /api/mail/gmail/callback?code=...&state=...
 *
 * Corsair's processOAuthCallback() exchanges the auth code for tokens
 * and stores them encrypted in Postgres. No manual token handling needed.
 * After success, redirects to /dashboard/mail with a success flash.
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
    console.error("[gmail/callback] OAuth error:", error);
    return NextResponse.redirect(new URL(`/dashboard/mail?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/mail?error=missing_params", req.url));
  }

  try {
    // Corsair verifies the HMAC state, exchanges code for tokens,
    // and stores access_token + refresh_token encrypted in its DB tables.
    const { tenantId: userEmail } = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: process.env.GMAIL_REDIRECT_URI!,
    });

    console.log(`[gmail/callback] ✅ Gmail connected for ${userEmail}`);

    // Sync to our MailAccount table so the UI knows Gmail is connected
    // Corsair stores tokens in its own encrypted tables; we just track the email
    await prisma.mailAccount.upsert({
      where: { userEmail_provider: { userEmail, provider: "gmail" } },
      update: { accountEmail: userEmail, updatedAt: new Date() },
      create: {
        userEmail,
        provider:     "gmail",
        accountEmail: userEmail,  // tenantId IS the gmail address
        accessToken:  "managed-by-corsair",  // Corsair manages tokens encrypted in DB
        refreshToken: "managed-by-corsair",
        expiresAt:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // placeholder
      },
    });

    return NextResponse.redirect(new URL("/dashboard/mail?connected=gmail", req.url));
  } catch (err: any) {
    console.error("[gmail/callback] Error:", err);
    return NextResponse.redirect(new URL(`/dashboard/mail?error=${encodeURIComponent(err.message ?? "callback_failed")}`, req.url));
  }
}
