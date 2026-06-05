"use client";

// ─── MailAccountPanel ─────────────────────────────────────────────────────
// Self-contained UI for the linked mail account feature.
// Renders three states: loading skeleton, not-connected, connected.
// The panel is intentionally standalone — just pass userEmail + isDark.

import React, { useState } from "react";
import {
  Mail, Link2, Unlink, RefreshCw, Send, Inbox, ChevronDown,
  CheckCircle2, AlertCircle, Loader2, ExternalLink, Clock,
  ShieldCheck, X,
} from "lucide-react";
import { useMailAccount } from "../../hooks/useMailAccount";
import type { MailMessage } from "../../actions/mail-actions";

interface MailAccountPanelProps {
  userEmail: string;
  isDark:    boolean;
}

// ─── Sub-component: Inbox message row ────────────────────────────────────

function MessageRow({ msg, isDark }: { msg: MailMessage; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(msg.receivedAt).toLocaleString("en-IN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
        background: msg.isRead
          ? "transparent"
          : (isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)"),
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            {!msg.isRead && (
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#818cf8",
                flexShrink: 0, display: "inline-block",
              }} />
            )}
            <span style={{
              fontSize: 12, fontWeight: msg.isRead ? 500 : 700,
              color: "var(--foreground)", overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {msg.subject}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: expanded ? 8 : 0 }}>
            {msg.fromName ? `${msg.fromName} ` : ""}<span style={{ fontFamily: "monospace", fontSize: 10 }}>{"<"}{msg.fromEmail}{">"}</span>
          </div>
          {expanded && msg.summary && (
            <p style={{
              fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6,
              marginTop: 6, paddingTop: 8,
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            }}>
              {msg.summary}…
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{time}</span>
          <ChevronDown style={{
            width: 12, height: 12, color: "var(--muted-foreground)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: Quick-send form ──────────────────────────────────────

function QuickSendForm({
  onSend, isSending, sendError, lastSendSuccess, onClear, isDark,
}: {
  onSend:          (to: string, subject: string, body: string) => void;
  isSending:       boolean;
  sendError:       string | null;
  lastSendSuccess: boolean;
  onClear:         () => void;
  isDark:          boolean;
}) {
  const [to,      setTo]      = useState("");
  const [subject, setSubject] = useState("");
  const [body,    setBody]    = useState("");

  const canSend = to.trim() && subject.trim() && body.trim() && !isSending;

  const handleSend = () => {
    if (!canSend) return;
    onSend(to.trim(), subject.trim(), body.trim());
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 9,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    color: "var(--foreground)", fontSize: 12, fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: 0 }}>
        Send Email
      </p>

      {lastSendSuccess && (
        <div style={{
          padding: "8px 12px", borderRadius: 8,
          background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
          border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 style={{ width: 13, height: 13, color: "#22c55e" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a" }}>Email sent successfully!</span>
          </div>
          <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 2 }}>
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
      )}

      {sendError && (
        <div style={{
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <AlertCircle style={{ width: 13, height: 13, color: "#ef4444" }} />
          <span style={{ fontSize: 12, color: "#ef4444" }}>{sendError}</span>
        </div>
      )}

      <input
        type="email" placeholder="To: recipient@email.com" value={to}
        onChange={e => setTo(e.target.value)} style={inputStyle}
      />
      <input
        type="text" placeholder="Subject" value={subject}
        onChange={e => setSubject(e.target.value)} style={inputStyle}
      />
      <textarea
        rows={5} placeholder="Email body..." value={body}
        onChange={e => setBody(e.target.value)}
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
      />

      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: canSend ? "linear-gradient(135deg, #818cf8, #6366f1)" : "var(--border)",
          color: canSend ? "#fff" : "var(--muted-foreground)",
          fontSize: 13, fontWeight: 700,
          cursor: canSend ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          boxShadow: canSend ? "0 4px 14px rgba(99,102,241,0.3)" : "none",
          transition: "all 0.2s",
        }}
      >
        {isSending
          ? <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Sending...</>
          : <><Send style={{ width: 13, height: 13 }} /> Send Email</>
        }
      </button>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────

export default function MailAccountPanel({ userEmail, isDark }: MailAccountPanelProps) {
  const mail = useMailAccount(userEmail);
  const [activeTab, setActiveTab] = useState<"inbox" | "send">("inbox");

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (mail.isLoading) {
    return (
      <div style={{
        padding: "32px 24px", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Loader2 style={{ width: 22, height: 22, color: "#818cf8", animation: "spin 1s linear infinite" }} />
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Loading mail account...</p>
      </div>
    );
  }

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!mail.mailAccount) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Hero section */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
            background: isDark
              ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))"
              : "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(129,140,248,0.05))",
            border: "1.5px solid rgba(99,102,241,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mail style={{ width: 26, height: 26, color: "#818cf8" }} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>
            Connect Your Zoho Mail
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65, margin: 0 }}>
            Link your Zoho mailbox to read job opportunities directly and send outreach proposals without leaving PropAI.
          </p>
        </div>

        {/* Permission bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: <Inbox      style={{ width: 13, height: 13 }} />, text: "Read your inbox to surface job leads" },
            { icon: <Send       style={{ width: 13, height: 13 }} />, text: "Send cold emails & proposals directly" },
            { icon: <ShieldCheck style={{ width: 13, height: 13 }} />, text: "Tokens stored securely — revoke anytime" },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
            }}>
              <span style={{ color: "#818cf8", flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Connect button */}
        <button
          onClick={mail.connect}
          style={{
            width: "100%", padding: "13px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            boxShadow: "0 4px 18px rgba(99,102,241,0.35)",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <Link2 style={{ width: 15, height: 15 }} />
          Link Zoho Mail Account
          <ExternalLink style={{ width: 12, height: 12, opacity: 0.7 }} />
        </button>

        <p style={{ fontSize: 10, textAlign: "center", color: "var(--muted-foreground)", opacity: 0.55, margin: 0 }}>
          You'll be redirected to Zoho's secure authorization page.
          Gmail & Outlook support coming soon.
        </p>
      </div>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Account badge */}
      <div style={{
        padding: "14px 16px", borderRadius: 14,
        background: isDark ? "rgba(34,197,94,0.07)" : "#f0fdf4",
        border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: isDark ? "rgba(34,197,94,0.15)" : "#dcfce7",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mail style={{ width: 18, height: 18, color: isDark ? "#4ade80" : "#16a34a" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                {mail.mailAccount.accountEmail}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                padding: "2px 7px", borderRadius: 50,
                background: isDark ? "rgba(34,197,94,0.15)" : "#dcfce7",
                color: isDark ? "#4ade80" : "#16a34a",
                border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
              }}>
                Connected
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0", textTransform: "capitalize" }}>
              {mail.mailAccount.provider} Mail
            </p>
          </div>
        </div>

        {/* Disconnect */}
        <button
          onClick={mail.disconnect}
          disabled={mail.isDisconnecting}
          title="Disconnect mail account"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 10px", borderRadius: 8,
            border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fecaca"}`,
            background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
            color: isDark ? "#f87171" : "#dc2626",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.75"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          {mail.isDisconnecting
            ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
            : <Unlink style={{ width: 12, height: 12 }} />
          }
          {mail.isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, paddingBottom: 4 }}>
        {(["inbox", "send"] as const).map(tab => {
          const active = activeTab === tab;
          const Icon   = tab === "inbox" ? Inbox : Send;
          const label  = tab === "inbox" ? "Inbox" : "Send Email";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "8px 8px 0 0",
                border: "none",
                background: active
                  ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)")
                  : "transparent",
                borderBottom: active ? "2px solid #818cf8" : "2px solid transparent",
                color: active ? "#818cf8" : "var(--muted-foreground)",
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Inbox tab ── */}
      {activeTab === "inbox" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: 0 }}>
              Recent Messages {mail.inbox.length > 0 && `(${mail.inbox.length})`}
            </p>
            <button
              onClick={mail.fetchInbox}
              disabled={mail.isFetchingInbox}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 11px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--input)",
                color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600,
                cursor: mail.isFetchingInbox ? "wait" : "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--input)"; }}
            >
              {mail.isFetchingInbox
                ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                : <RefreshCw style={{ width: 11, height: 11 }} />
              }
              {mail.isFetchingInbox ? "Loading..." : "Refresh"}
            </button>
          </div>

          {mail.inboxError && (
            <div style={{
              padding: "10px 12px", borderRadius: 8,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <AlertCircle style={{ width: 13, height: 13, color: "#ef4444" }} />
              <span style={{ fontSize: 12, color: "#ef4444" }}>{mail.inboxError}</span>
            </div>
          )}

          {mail.inbox.length === 0 && !mail.isFetchingInbox && !mail.inboxError && (
            <div style={{
              textAlign: "center", padding: "32px 0",
              color: "var(--muted-foreground)",
            }}>
              <Inbox style={{ width: 28, height: 28, margin: "0 auto 10px", opacity: 0.3 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Click Refresh to load your inbox.</p>
            </div>
          )}

          {mail.inbox.map(msg => (
            <MessageRow key={msg.messageId} msg={msg} isDark={isDark} />
          ))}
        </div>
      )}

      {/* ── Send tab ── */}
      {activeTab === "send" && (
        <QuickSendForm
          onSend={mail.sendEmail}
          isSending={mail.isSending}
          sendError={mail.sendError}
          lastSendSuccess={mail.lastSendSuccess}
          onClear={mail.clearSendStatus}
          isDark={isDark}
        />
      )}
    </div>
  );
}
