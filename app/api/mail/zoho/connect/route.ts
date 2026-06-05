// ─── GET /api/mail/zoho/connect ───────────────────────────────────────────
// Redirects the user to Zoho's OAuth consent screen.
// The user's PropAI email is encoded in `state` so the callback can link
// the new token to the right account.

import { NextRequest, NextResponse } from "next/server";

// Zoho scopes needed:
//   - ZohoMail.messages.READ  → read inbox
//   - ZohoMail.messages.CREATE → send mail
//   - ZohoMail.accounts.READ   → fetch accountId for API calls
const ZOHO_SCOPES = [
  "ZohoMail.messages.READ",
  "ZohoMail.messages.CREATE",
  "ZohoMail.accounts.READ",
].join(",");

export async function GET(req: NextRequest) {
  const clientId     = process.env.ZOHO_CLIENT_ID;
  const redirectUri  = process.env.ZOHO_REDIRECT_URI;
  const region       = process.env.ZOHO_REGION || "com";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Zoho OAuth is not configured. Add ZOHO_CLIENT_ID and ZOHO_REDIRECT_URI to .env." },
      { status: 500 }
    );
  }

  // Encode the PropAI user's email in state so the callback knows who to link
  const userEmail = req.nextUrl.searchParams.get("email") || "";
  const state     = Buffer.from(JSON.stringify({ email: userEmail })).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    scope:         ZOHO_SCOPES,
    redirect_uri:  redirectUri,
    access_type:   "offline", // we need a refresh_token
    state,
  });

  const authUrl = `https://accounts.zoho.${region}/oauth/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
