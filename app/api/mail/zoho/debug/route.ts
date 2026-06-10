// ─── GET /api/mail/zoho/debug?email=... ───────────────────────────────────────
// Diagnostic endpoint — shows exactly what Zoho returns at each step.
// REMOVE THIS BEFORE PRODUCTION.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../utils/prisma";

export async function GET(req: NextRequest) {
  const userEmail = req.nextUrl.searchParams.get("email");
  if (!userEmail) {
    return NextResponse.json({ error: "Pass ?email=you@example.com" }, { status: 400 });
  }

  const log: Record<string, any> = {};

  // 1. DB row
  const account = await prisma.mailAccount.findUnique({ where: { userEmail } });
  if (!account) {
    return NextResponse.json({ error: "No mail account linked in DB for this email." });
  }
  log.db = {
    provider:      account.provider,
    accountEmail:  account.accountEmail,
    zohoAccountId: account.zohoAccountId,
    apiBase:       account.apiBase,
    expiresAt:     account.expiresAt,
    isExpired:     new Date() >= account.expiresAt,
    hasAccessToken:  !!account.accessToken,
    hasRefreshToken: !!account.refreshToken,
  };

  let token = account.accessToken;

  // 2. Refresh if expired
  if (log.db.isExpired) {
    log.tokenRefresh = { attempted: true };
    try {
      const authBase = (account.apiBase ?? `https://mail.zoho.${process.env.ZOHO_REGION || "com"}`)
        .replace("mail.zoho", "accounts.zoho");

      const r = await fetch(`${authBase}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: account.refreshToken,
          client_id:     process.env.ZOHO_CLIENT_ID!,
          client_secret: process.env.ZOHO_CLIENT_SECRET!,
          grant_type:    "refresh_token",
        }),
      });
      const d = await r.json();
      log.tokenRefresh.status = r.status;
      log.tokenRefresh.response = d;
      if (d.access_token) token = d.access_token;
    } catch (e: any) {
      log.tokenRefresh.error = e?.message;
    }
  }

  const apiBase = account.apiBase ?? `https://mail.zoho.${process.env.ZOHO_REGION || "com"}`;
  const accountId = account.zohoAccountId;

  // 3. Accounts API
  try {
    const r = await fetch(`${apiBase}/api/accounts`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const text = await r.text();
    log.accountsApi = { status: r.status, body: tryParse(text) };
  } catch (e: any) {
    log.accountsApi = { error: e?.message };
  }

  if (!accountId) {
    log.warning = "zohoAccountId not in DB — can't call folders/messages APIs";
    return NextResponse.json(log, { status: 200 });
  }

  // 4. Folders API
  try {
    const r = await fetch(`${apiBase}/api/accounts/${accountId}/folders`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const text = await r.text();
    const parsed = tryParse(text);
    log.foldersApi = {
      status: r.status,
      folderCount: parsed?.data?.length ?? "?",
      folders: parsed?.data?.map((f: any) => ({
        name: f.folderName,
        id:   f.folderId ?? f.folderID ?? f.id,
        path: f.folderPath,
      })) ?? parsed,
    };
  } catch (e: any) {
    log.foldersApi = { error: e?.message };
  }

  // 5. Messages/view (try raw with no folderId first — see what error we get)
  try {
    const r = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages/view?limit=5`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    const text = await r.text();
    log.messagesViewNoFolder = { status: r.status, body: tryParse(text) };
  } catch (e: any) {
    log.messagesViewNoFolder = { error: e?.message };
  }

  // 6. Messages/search (no filter)
  try {
    const r = await fetch(
      `${apiBase}/api/accounts/${accountId}/messages/search?limit=5`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    const text = await r.text();
    log.messagesSearch = { status: r.status, body: tryParse(text) };
  } catch (e: any) {
    log.messagesSearch = { error: e?.message };
  }

  return NextResponse.json(log, { status: 200 });
}

function tryParse(text: string) {
  try { return JSON.parse(text); } catch { return text; }
}
