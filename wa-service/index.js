// ─── WhatsApp Bridge Service ─────────────────────────────────────────────────
// Uses Baileys (WhatsApp Web multi-device protocol) to link a phone, list
// groups, and fetch today's messages. Runs as a standalone Express server.
//
// Endpoints:
//   GET  /status               → { connected, phone, name }
//   GET  /qr                   → { qr: "data:image/png;base64,..." } or { connected: true }
//   POST /disconnect           → disconnect & clear session
//   GET  /groups               → [{ id, name, participantCount }]
//   GET  /messages/:groupId    → today's messages [{ sender, text, time }]
// ─────────────────────────────────────────────────────────────────────────────

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidGroup,
  extractMessageContent,
} from "@whiskeysockets/baileys";
import express from "express";
import QRCode from "qrcode";
import pino from "pino";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR  = path.join(__dirname, "sessions");
const PORT      = process.env.WA_PORT || 3002;

const logger = pino({ level: "silent" });

// ─── State ───────────────────────────────────────────────────────────────────
let sock        = null;   // Baileys socket
let currentQR   = null;   // Latest QR string (null when connected)
let isConnected = false;
let connectedPhone = null;
let connectedName  = null;

// In-memory store of today's messages per group
const todayMessages = new Map();

// Map of active sync request ID -> Array of resolve functions
const syncWaiters = new Map();

// ─── History gate: wait for messaging-history.set before serving /messages ───
let historyLoaded    = false;
const historyWaiters = [];   // resolve fns waiting for history
function markHistoryLoaded() {
  historyLoaded = true;
  while (historyWaiters.length) historyWaiters.pop()();
}
function waitForHistory(ms = 10000) {
  if (historyLoaded) return Promise.resolve();
  return new Promise(resolve => {
    const t = setTimeout(() => {
      const i = historyWaiters.indexOf(resolve);
      if (i !== -1) historyWaiters.splice(i, 1);
      resolve(); // timeout — return whatever we have
    }, ms);
    historyWaiters.push(() => { clearTimeout(t); resolve(); });
  });
}

// ─── Persistence: save/load today's messages to disk ─────────────────────────
const CACHE_FILE = path.join(__dirname, "today-cache.json");

function saveCache() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const obj   = { date: today, groups: {} };
    for (const [gid, msgs] of todayMessages.entries()) {
      obj.groups[gid] = msgs;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), "utf8");
  } catch {}
}

function loadCache() {
  try {
    const raw   = fs.readFileSync(CACHE_FILE, "utf8");
    const obj   = JSON.parse(raw);
    const today = new Date().toISOString().split("T")[0];
    if (obj.date !== today) {
      fs.unlinkSync(CACHE_FILE); // stale — new day, clear it
      return;
    }
    let total = 0;
    for (const [gid, msgs] of Object.entries(obj.groups || {})) {
      todayMessages.set(gid, msgs);
      total += msgs.length;
    }
    if (total > 0) {
      console.log(`[WA] Loaded ${total} cached messages from disk (${today})`);
      markHistoryLoaded();   // no need to wait — we have data
    }
  } catch {}
}


// ─── Helper: is timestamp today? ─────────────────────────────────────────────
function isToday(unixSeconds) {
  const msgTime = unixSeconds * 1000;
  const now = Date.now();
  
  // If the message is within the last 24 hours, count it as "today"
  const diffHrs = Math.abs(now - msgTime) / (1000 * 60 * 60);
  if (diffHrs <= 24) return true;

  // Fallback to local calendar day
  const d     = new Date(msgTime);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth()    === today.getMonth() &&
    d.getDate()     === today.getDate()
  );
}

// ─── Helper: get sender details (phone and display name) ──────────────────────
function getSenderDetails(msg) {
  try {
    const jid = msg.participant || msg.key?.participant || (msg.key?.fromMe ? sock?.user?.id : null) || msg.key?.remoteJid || "";
    const phone = jid.split("@")[0] || "";
    const formattedPhone = phone ? `+${phone}` : "";
    const name = msg.pushName || formattedPhone || "Unknown";
    return { phone: formattedPhone, name };
  } catch {
    return { phone: "", name: "Unknown" };
  }
}

// ─── Helper: extract text from a message (handles ephemeral & view-once) ──────
function getMessageText(msg) {
  if (!msg || !msg.message) return null;
  const content = extractMessageContent(msg.message);
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    content?.documentMessage?.caption ||
    null
  );
}

// ─── Connect to WhatsApp ──────────────────────────────────────────────────────
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version }          = await fetchLatestBaileysVersion();

  console.log(`[WA] Connecting with Baileys v${version.join(".")}`);

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser:           ["Props AI", "Chrome", "1.0"],
    syncFullHistory:   true,   // ask WA to send recent message history on connect
    shouldSyncHistoryMessage: () => true,  // accept all history
  });

  // ── History sync: capture messages WA sends on connect ─────────────────────
  sock.ev.on("messaging-history.set", ({ messages: histMsgs, isLatest, progress, peerDataRequestSessionId }) => {
    console.log(`[WA] messaging-history.set fired: ${histMsgs?.length || 0} msgs, isLatest=${isLatest}, progress=${progress}, sessionId=${peerDataRequestSessionId}`);
    
    if (!histMsgs || histMsgs.length === 0) {
      // If history is empty but it's an on-demand request, resolve waiters
      if (peerDataRequestSessionId && syncWaiters.has(peerDataRequestSessionId)) {
        const list = syncWaiters.get(peerDataRequestSessionId);
        syncWaiters.delete(peerDataRequestSessionId);
        for (const resolve of list) resolve();
      }
      if (isLatest) {
        markHistoryLoaded();
      }
      return;
    }

    let captured = 0;
    for (const msg of histMsgs) {
      try {
        const jid = msg.key?.remoteJid || "";
        const ts  = Number(msg.messageTimestamp);
        if (!isJidGroup(jid)) continue;
        if (!isToday(ts)) continue;
        if (msg.message?.protocolMessage) continue;
        if (msg.message?.reactionMessage) continue;
        const text = getMessageText(msg);
        if (!text) continue;
        const { phone, name } = getSenderDetails(msg);
        const entry = {
          id:         msg.key.id,
          sender:     phone,
          senderName: name,
          text,
          timestamp:  ts,
        };
        if (!todayMessages.has(jid)) todayMessages.set(jid, []);
        const arr = todayMessages.get(jid);
        const existing = arr.find(m => m.id === entry.id);
        if (!existing) {
          arr.push(entry);
          captured++;
        } else if (existing.senderName !== entry.senderName) {
          existing.sender = entry.sender;
          existing.senderName = entry.senderName;
          captured++;
        }
      } catch {}
    }
    console.log(`[WA] messaging-history.set → stored ${captured} new today-messages (total across all groups)`);
    
    if (captured > 0) saveCache();

    // If it's an on-demand request, resolve the waiters
    if (peerDataRequestSessionId && syncWaiters.has(peerDataRequestSessionId)) {
      const list = syncWaiters.get(peerDataRequestSessionId);
      syncWaiters.delete(peerDataRequestSessionId);
      for (const resolve of list) resolve();
    }

    // Only unblock initial history gate on the final batch
    if (isLatest) {
      console.log(`[WA] History sync fully loaded`);
      markHistoryLoaded();
    }
  });

  // ── QR Code ──────────────────────────────────────────────────────────────
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("[WA] QR code generated — waiting for scan...");
      currentQR   = qr;
      isConnected = false;
    }

    if (connection === "open") {
      console.log("[WA] ✅ Connected!");
      isConnected    = true;
      currentQR      = null;
      connectedPhone = sock.user?.id?.split(":")[0] || null;
      connectedName  = sock.user?.name || sock.user?.notify || null;
      // Reset history gate so we wait for fresh sync
      historyLoaded = false;
      // Give WA 12s to push history; if it doesn't, we unblock anyway
      setTimeout(() => { if (!historyLoaded) { console.log("[WA] History timeout — unblocking"); markHistoryLoaded(); } }, 12000);
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WA] Connection closed (code ${statusCode}). Reconnect: ${shouldReconnect}`);

      if (statusCode === DisconnectReason.loggedOut) {
        // Clear session files so QR shows fresh
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        connectedPhone = null;
        connectedName  = null;
      }

      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      }
    }
  });

  // ── Save credentials ──────────────────────────────────────────────────────
  sock.ev.on("creds.update", saveCreds);

  // ── Capture ALL group messages (new + history sync) ─────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // 🔍 RAW DEBUG — log every event regardless of type
    console.log(`[WA DEBUG] messages.upsert fired — type="${type}", count=${messages.length}`);
    for (const msg of messages) {
      const jid  = msg.key?.remoteJid || "?";
      const ts   = Number(msg.messageTimestamp);
      const keys = msg.message ? Object.keys(msg.message) : [];
      console.log(`  → jid=${jid} | ts=${ts} | isGroup=${isJidGroup(jid)} | isToday=${isToday(ts)} | msgKeys=${keys.join(",")}`);
    }

    if (type !== "notify" && type !== "append") return;

    let captured = 0;
    for (const msg of messages) {
      try {
        if (!isJidGroup(msg.key.remoteJid)) continue;
        if (!isToday(Number(msg.messageTimestamp))) continue;
        if (msg.message?.protocolMessage) continue;
        if (msg.message?.reactionMessage) continue;

        const text = getMessageText(msg);
        if (!text) continue;

        const groupId = msg.key.remoteJid;
        const { phone, name } = getSenderDetails(msg);
        const entry = {
          id:         msg.key.id,
          sender:     phone,
          senderName: name,
          text,
          timestamp:  Number(msg.messageTimestamp),
        };

        if (!todayMessages.has(groupId)) todayMessages.set(groupId, []);
        const arr = todayMessages.get(groupId);
        const existing = arr.find(m => m.id === entry.id);
        if (!existing) {
          arr.push(entry);
          captured++;
          console.log(`  ✅ Stored: "${text.slice(0,60)}" from ${entry.senderName} in ${groupId.split("@")[0]}`);
        } else if (existing.senderName !== entry.senderName) {
          existing.sender = entry.sender;
          existing.senderName = entry.senderName;
          captured++;
          console.log(`  🔄 Updated sender for: "${text.slice(0,60)}" to ${entry.senderName}`);
        }
      } catch (err) {
        console.error(`  ❌ Error processing msg:`, err.message);
      }
    }
    if (captured > 0) {
      console.log(`[WA] Captured ${captured} new today-message(s) via ${type}`);
    }
  });
}

// ─── Express API ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS for Next.js dev
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── GET /status ───────────────────────────────────────────────────────────────
app.get("/status", (req, res) => {
  res.json({
    connected:    isConnected,
    phone:        connectedPhone,
    name:         connectedName,
    hasQR:        !!currentQR,
  });
});

// ── GET /qr ───────────────────────────────────────────────────────────────────
app.get("/qr", async (req, res) => {
  if (isConnected) {
    return res.json({ connected: true, qr: null });
  }
  if (!currentQR) {
    return res.json({ connected: false, qr: null, waiting: true });
  }
  try {
    const dataUrl = await QRCode.toDataURL(currentQR, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    res.json({ connected: false, qr: dataUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

// ── POST /disconnect ──────────────────────────────────────────────────────────
app.post("/disconnect", async (req, res) => {
  try {
    if (sock) await sock.logout();
  } catch {}
  isConnected    = false;
  currentQR      = null;
  connectedPhone = null;
  connectedName  = null;
  todayMessages.clear();
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  // Reconnect to show QR again
  setTimeout(connectToWhatsApp, 1000);
  res.json({ ok: true });
});

// ── GET /groups ───────────────────────────────────────────────────────────────
app.get("/groups", async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }
  try {
    const allChats = await sock.groupFetchAllParticipating();
    const groups   = Object.values(allChats).map((g) => ({
      id:               g.id,
      name:             g.subject || "Unnamed Group",
      participantCount: g.participants?.length || 0,
      description:      g.desc || "",
    }));
    // Sort by name
    groups.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ groups });
  } catch (err) {
    console.error("[WA] /groups error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /messages/:groupId ────────────────────────────────────────────────────
// Returns today's messages for a group.
// Strategy:
//  1. Check in-memory todayMessages (populated from live messages.upsert events)
//  2. If empty, try sock.loadMessages() which reads from Baileys local store
//  3. Return whatever we have — no unreliable fetchMessageHistory peer requests
app.get("/messages/:groupId", async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }
  const groupId = decodeURIComponent(req.params.groupId);
  console.log(`[WA] /messages/:groupId called for ${groupId}`);

  // Block until initial history sync completes (or 12s timeout)
  await waitForHistory(12000);

  // ── Step 1: Check in-memory store ──────────────────────────────────────────
  let existing = todayMessages.get(groupId) || [];
  console.log(`[WA] In-memory messages for group: ${existing.length}`);

  // ── Step 2: If empty, pull from Baileys local message store ────────────────
  if (existing.length === 0) {
    try {
      console.log(`[WA] Trying sock.loadMessages() for group: ${groupId}`);
      // Load last 200 messages from Baileys store (populated on connect via syncFullHistory)
      const stored = await sock.loadMessages(groupId, 200);
      console.log(`[WA] sock.loadMessages returned ${stored?.messages?.length ?? 0} messages`);

      if (stored?.messages?.length > 0) {
        let captured = 0;
        for (const msg of stored.messages) {
          try {
            const ts = Number(msg.messageTimestamp);
            if (!isToday(ts)) continue;
            if (msg.message?.protocolMessage) continue;
            if (msg.message?.reactionMessage) continue;
            const text = getMessageText(msg);
            if (!text) continue;
            const { phone, name } = getSenderDetails(msg);
            const entry = {
              id:         msg.key.id,
              sender:     phone,
              senderName: name,
              text,
              timestamp:  ts,
            };
            if (!todayMessages.has(groupId)) todayMessages.set(groupId, []);
            const arr = todayMessages.get(groupId);
            if (!arr.find(m => m.id === entry.id)) {
              arr.push(entry);
              captured++;
            }
          } catch {}
        }
        if (captured > 0) {
          console.log(`[WA] loadMessages → stored ${captured} today-messages for ${groupId.split("@")[0]}`);
          saveCache();
        }
        existing = todayMessages.get(groupId) || [];
      }
    } catch (err) {
      console.warn(`[WA] sock.loadMessages() failed: ${err.message}`);

      // ── Step 3: Fallback — try fetchMessageHistory (peer request) ────────────
      // This is unreliable on multi-device but worth one attempt
      try {
        console.log(`[WA] Fallback: fetchMessageHistory for group: ${groupId}`);
        const oldestMsgKey = { id: "", fromMe: false, remoteJid: groupId };
        const requestId = await sock.fetchMessageHistory(100, oldestMsgKey, Date.now());
        console.log(`[WA] Sent history request ID: ${requestId}, waiting up to 6s...`);

        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            syncWaiters.delete(requestId);
            console.log(`[WA] fetchMessageHistory timeout for ${requestId}`);
            resolve();
          }, 6000);

          if (!syncWaiters.has(requestId)) syncWaiters.set(requestId, []);
          syncWaiters.get(requestId).push(() => { clearTimeout(timeout); resolve(); });
        });

        existing = todayMessages.get(groupId) || [];
      } catch (err2) {
        console.warn(`[WA] fetchMessageHistory also failed: ${err2.message}`);
      }
    }
  }

  // ── Return ──────────────────────────────────────────────────────────────────
  const sorted = [...existing].sort((a, b) => b.timestamp - a.timestamp);
  console.log(`[WA] /messages returning ${sorted.length} messages for ${groupId.split("@")[0]}`);
  res.json({ groupId, date: new Date().toISOString().split("T")[0], count: sorted.length, messages: sorted });
});


// ── GET /debug ────────────────────────────────────────────────────────────────
// Shows all groups that have captured messages (useful for debugging)
app.get("/debug", (req, res) => {
  const summary = {};
  for (const [gid, msgs] of todayMessages.entries()) {
    summary[gid] = msgs.length;
  }
  res.json({ connected: isConnected, groups: summary, totalGroups: todayMessages.size });
});




// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[WA Service] Running on http://localhost:${PORT}`);
  console.log(`[WA Service] Endpoints: GET /status, /qr, /groups, /messages/:groupId`);
  loadCache();           // restore today's messages from disk (instant on restart)
  connectToWhatsApp();
});
