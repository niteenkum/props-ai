# Corsair Integration Reference

## ⚠️ HACKATHON REQUIREMENT — Corsair MUST be used for Gmail

This project is part of the **Corsair Hackathon** (MacBook giveaway).
Gmail integration MUST go through Corsair SDK — NOT custom OAuth.

**Twitter:** x.com/corsairdotdev  
**LinkedIn:** linkedin.com/in/devrjain/  
**Discord:** discord.gg/uNgCP3mSzU

---

## ✅ What's Set Up

| Component | Status | Notes |
|-----------|--------|-------|
| `corsair@0.1.76` | ✅ Installed | via pnpm |
| `@corsair-dev/gmail@0.1.4` | ✅ Installed | Gmail plugin |
| DB Tables | ✅ Created | `corsair_integrations`, `corsair_accounts` etc. |
| Gmail client_id/secret | ✅ Stored | Encrypted via KEK in Postgres |
| OAuth connect route | ✅ Updated | `/api/mail/gmail/connect` → Corsair `generateOAuthUrl()` |
| OAuth callback route | ✅ Updated | `/api/mail/gmail/callback` → Corsair `processOAuthCallback()` |
| Inbox fetch | ✅ Updated | `fetchGmailInboxAction` → `corsair.withTenant().gmail.api.messages.list()` |
| Thread fetch | ✅ Updated | `fetchGmailThreadAction` → `corsair.withTenant().gmail.api.threads.get()` |

---

## pnpm Store Fix (if ERR_PNPM_UNEXPECTED_STORE)
```
store-dir=/Users/niteenkumar/Library/pnpm/store/v3/v11
```
Already set in `.npmrc`. If you see the error again:
```bash
CI=true pnpm install
```

---

## Architecture

```
User clicks Gmail connect
       ↓
GET /api/mail/gmail/connect?userEmail=niteen@niteen.dev
       ↓
generateOAuthUrl(corsair, "gmail", { tenantId, redirectUri })
       ↓
Google OAuth (consent screen)
       ↓
GET /api/mail/gmail/callback?code=...&state=...
       ↓
processOAuthCallback(corsair, { code, state, redirectUri })
       ↓
Corsair stores access_token + refresh_token ENCRYPTED in Postgres
(corsair_accounts table, encrypted with KEK from CORSAIR_KEK env var)
       ↓
Fetch emails: corsair.withTenant(userEmail).gmail.api.messages.list(...)
       ↓ (Corsair auto-refreshes tokens when expired)
```

---

## App Utils — corsair.ts

```ts
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";

export const corsair = createCorsair({
  plugins: [gmail()],
  multiTenancy: true,       // one Corsair tenant = one user email
  database: pool,           // pg.Pool — Corsair stores tokens here
  kek: process.env.CORSAIR_KEK!,
});
```

---

## Gmail API via Corsair

```ts
const tenant = corsair.withTenant(userEmail);

// List inbox
await tenant.gmail.api.messages.list({ maxResults: 50, labelIds: ["INBOX"] });

// Get message (metadata)
await tenant.gmail.api.messages.get({ id: msgId, format: "metadata" });

// Get full thread
await tenant.gmail.api.threads.get({ id: threadId, format: "full" });

// Send email
await tenant.gmail.api.messages.send({ raw: base64Email });

// Modify labels (mark read/unread)
await tenant.gmail.api.messages.modify({ id, addLabelIds: [], removeLabelIds: ["UNREAD"] });

// List labels
await tenant.gmail.api.labels.list({});

// Create draft
await tenant.gmail.api.drafts.create({ message: { raw: base64Email } });
```

---

## Required .env Variables

```bash
CORSAIR_KEK=aa9ed6ba...   # Already set — DO NOT CHANGE (tokens encrypted with this)
GMAIL_CLIENT_ID=573341...  # Already set
GMAIL_CLIENT_SECRET=GOCSPC... # Already set  
GMAIL_REDIRECT_URI=http://localhost:3000/api/mail/gmail/callback  # Already set
```

---

## Re-run Corsair DB Setup (if needed)

```bash
# Only needed if you wipe the database or change Gmail credentials
node --input-type=module << 'EOF'
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { Pool } from "pg";
import { setupCorsair } from "corsair/setup";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const corsair = createCorsair({ plugins: [gmail()], multiTenancy: true, database: pool, kek: process.env.CORSAIR_KEK });

await setupCorsair(corsair, {
  credentials: {
    gmail: {
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
    }
  }
});
await pool.end();
EOF
```

---

## Bonus Tasks (Hackathon)

- [ ] **Webhooks** — Corsair Gmail webhooks for real-time email delivery
- [ ] **Agent Chat** — Corsair MCP for "Send email to X" via chat
- [ ] **Email Priority AI** — LLM classifies each email as High/Medium/Low
- [ ] **Keyboard Shortcuts** — `e` archive, `r` reply, `f` forward, `#` trash
- [ ] **Advanced Search** — Corsair search API with Gmail query syntax
