/**
 * Gmail OAuth Connect — via Corsair SDK
 * GET /api/mail/gmail/connect?userEmail=...
 *
 * Uses Corsair's generateOAuthUrl() to build the Google OAuth URL.
 * Corsair signs the state with HMAC so we can verify it in the callback.
 */
import { NextRequest, NextResponse } from "next/server";
import { generateOAuthUrl } from "corsair/oauth";
import { corsair, seedGmailCredentials, ensureCorsairReady } from "../../../../utils/corsair";

export async function GET(req: NextRequest) {
  // Accept both ?userEmail= and ?email= (UI uses ?email=)
  const userEmail =
    req.nextUrl.searchParams.get("userEmail") ||
    req.nextUrl.searchParams.get("email");

  if (!userEmail) {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 });
  }

  try {
    // Ensure corsair_integrations row exists for gmail
    await ensureCorsairReady();
    // Seed credentials (idempotent)
    await seedGmailCredentials();

    // Corsair generates the full Google OAuth URL with scopes + signed HMAC state
    const { url } = await generateOAuthUrl(corsair, "gmail", {
      tenantId: userEmail,
      redirectUri: process.env.GMAIL_REDIRECT_URI!,
    });

    console.log(`[gmail/connect] Redirecting ${userEmail} to Google OAuth`);
    return NextResponse.redirect(url);
  } catch (err: any) {
    console.error("[gmail/connect] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
