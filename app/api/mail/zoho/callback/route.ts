// ─── GET /api/mail/zoho/callback ──────────────────────────────────────────
// Handles the OAuth redirect from Zoho after the user grants access.
// Flow:
//   1. Extract `code`, `state`, and `accounts-server` from URL
//   2. Use the `accounts-server` Zoho sends back (handles region auto-detection)
//   3. Exchange `code` for access_token + refresh_token
//   4. Fetch the user's Zoho accountId (needed for Mail API calls)
//   5. Upsert MailAccount row in DB
//   6. Redirect to /dashboard/mail?connected=true

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../utils/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code          = searchParams.get("code");
  const state         = searchParams.get("state");
  const error         = searchParams.get("error");

  // Zoho sends back the exact accounts-server URL for the user's region.
  // CRITICAL: We must use this for token exchange — not the env-configured region.
  // e.g. Indian accounts return "https://accounts.zoho.in"
  const accountsServer = searchParams.get("accounts-server")
    ?? `https://accounts.zoho.${process.env.ZOHO_REGION || "com"}`;

  // ── User denied access ────────────────────────────────────────────────────
  if (error) {
    console.warn("[Zoho Callback] User denied access:", error);
    return NextResponse.redirect(
      new URL("/dashboard/mail?error=access_denied", req.nextUrl.origin)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard/mail?error=missing_params", req.nextUrl.origin)
    );
  }

  // ── Decode user email from state ──────────────────────────────────────────
  let userEmail: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userEmail = decoded.email;
    if (!userEmail) throw new Error("no email in state");
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/mail?error=invalid_state", req.nextUrl.origin)
    );
  }

  const clientId     = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;
  const redirectUri  = process.env.ZOHO_REDIRECT_URI!;

  console.log(`[Zoho Callback] Using accounts-server: ${accountsServer}`);

  // ── Exchange authorization code for tokens ────────────────────────────────
  let accessToken: string;
  let refreshToken: string;
  let expiresInSec: number;

  try {
    const tokenRes = await fetch(`${accountsServer}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      console.error("[Zoho Callback] Token exchange failed:", tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard/mail?error=token_exchange_failed`, req.nextUrl.origin)
      );
    }

    accessToken  = tokenData.access_token;
    refreshToken = tokenData.refresh_token;
    expiresInSec = tokenData.expires_in ?? 3600;
  } catch (err) {
    console.error("[Zoho Callback] Token exchange error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/mail?error=token_exchange_error", req.nextUrl.origin)
    );
  }

  // ── Derive the mail API base URL from the accounts-server region ──────────
  // accounts-server: https://accounts.zoho.in → mail API: https://mail.zoho.in
  const mailBase = accountsServer.replace("accounts.zoho", "mail.zoho");

  // ── Fetch Zoho accountId and mailbox email ────────────────────────────────
  let accountEmail: string = userEmail;
  let zohoAccountId: string | undefined;

  try {
    const accountRes = await fetch(`${mailBase}/api/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    if (accountRes.ok) {
      const accountData = await accountRes.json();
      console.log("[Zoho Callback] Account data:", JSON.stringify(accountData?.data?.[0] ?? {}, null, 2));
      const firstAccount = accountData?.data?.[0];
      if (firstAccount) {
        // Zoho uses different field names — try all known variants
        zohoAccountId = String(
          firstAccount.accountId   ??
          firstAccount.accountID   ??
          firstAccount.account_id  ??
          ""
        );
        accountEmail = (
          firstAccount.primaryEmailAddress  ??
          firstAccount.emailAddress         ??
          firstAccount.mailboxAddress       ??
          firstAccount.senderAddress        ??
          firstAccount.fromAddress          ??
          userEmail
        );
      }
    } else {
      console.warn("[Zoho Callback] Could not fetch account info:", await accountRes.text());
    }
  } catch (err) {
    console.warn("[Zoho Callback] Account info fetch failed:", err);
  }

  // ── Upsert MailAccount in DB ──────────────────────────────────────────────
  const expiresAt    = new Date(Date.now() + expiresInSec * 1000);
  // Store the region-correct mail base URL so actions use the right endpoint
  const providerMeta = mailBase; // stored as zohoMailBase in zohoAccountId fallback

  try {
    await prisma.mailAccount.upsert({
      where:  { userEmail },
      create: {
        userEmail,
        provider:      "zoho",
        accountEmail,
        accessToken,
        refreshToken,
        expiresAt,
        zohoAccountId: zohoAccountId || null,
        apiBase:       mailBase,
      },
      update: {
        accountEmail,
        accessToken,
        refreshToken,
        expiresAt,
        zohoAccountId: zohoAccountId || null,
        apiBase:       mailBase,
      },
    });
  } catch (err) {
    console.error("[Zoho Callback] DB upsert failed:", err);
    return NextResponse.redirect(
      new URL("/dashboard/mail?error=db_error", req.nextUrl.origin)
    );
  }

  console.log(`[Zoho Callback] ✅ Linked ${userEmail} → ${accountEmail} via ${accountsServer}`);
  return NextResponse.redirect(
    new URL("/dashboard/mail?connected=true", req.nextUrl.origin)
  );
}
