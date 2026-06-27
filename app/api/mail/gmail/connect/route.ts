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
  const flow = req.nextUrl.searchParams.get("flow");
  const isAuthFlow = flow === "auth";

  // Accept both ?userEmail= and ?email= (UI uses ?email=)
  let userEmail =
    req.nextUrl.searchParams.get("userEmail") ||
    req.nextUrl.searchParams.get("email");

  if (isAuthFlow) {
    userEmail = "auth_pending_" + Math.random().toString(36).substring(2, 15);
  }

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

    // Dynamically append Google Userinfo scopes so the callback can query profile and email
    const oauthUrl = new URL(url);
    const currentScopes = oauthUrl.searchParams.get("scope") || "";
    oauthUrl.searchParams.set("scope", `${currentScopes} email profile openid`.trim());

    console.log(`[gmail/connect] Redirecting ${userEmail} to Google OAuth with userinfo scopes`);
    return NextResponse.redirect(oauthUrl.toString());
  } catch (err: any) {
    console.error("[gmail/connect] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
