"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import type { JobPost } from "../utils/db";
import type { SentEmailRecord } from "../actions/mail-actions";
import { sendJobEmailAction, getSentEmailsForJobAction, getMailAccountAction, getUserResumeFilenameAction } from "../actions/mail-actions";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  job:       JobPost;
  userEmail: string;
  isDark:    boolean;
  /** Pre-fill the body from the selected template */
  initialBody?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractSubject(body: string): string {
  const match = body.match(/^Subject:\s*(.+)/im);
  if (match) return match[1].trim();
  return "";
}

function stripSubjectLine(body: string): string {
  return body.replace(/^Subject:\s*.+\n?/im, "").trim();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmailComposeDrawer({ isOpen, onClose, job, userEmail, isDark, initialBody = "" }: Props) {
  const [to,        setTo]       = useState(job.contactEmail ?? "");
  const [cc,        setCc]       = useState("");
  const [bcc,       setBcc]      = useState("");
  const [subject,   setSubject]  = useState("");
  const [body,      setBody]     = useState("");
  const [fromEmail, setFromEmail] = useState<string | null>(null);
  const [mailConnected, setMailConnected] = useState<boolean | null>(null); // null = loading

  const [sending,   setSending]  = useState(false);
  const [sendState, setSendState] = useState<
    | null
    | { status: "success"; zohoMsgId?: string; sentAt: string }
    | { status: "error";   message: string }
  >(null);

  const [history,      setHistory]     = useState<SentEmailRecord[]>([]);
  const [showHistory,  setShowHistory] = useState(false);
  const [attachResume, setAttachResume] = useState(false);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ── On open: pre-fill fields and load mail account ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const parsed = extractSubject(initialBody);
    setSubject(parsed);
    setBody(parsed ? stripSubjectLine(initialBody) : initialBody);
    setTo(job.contactEmail ?? "");
    setSendState(null);

    const ccTag = job.tags?.find(t => t.startsWith("cc:"));
    const bccTag = job.tags?.find(t => t.startsWith("bcc:"));
    setCc(ccTag ? ccTag.slice("cc:".length) : "");
    setBcc(bccTag ? bccTag.slice("bcc:".length) : "");

    // Default attach toggle to AI's suggestion (false if not specified)
    setAttachResume(job.suggestAttachResume ?? false);

    // Load mail account
    getMailAccountAction(userEmail).then((acc: import("../actions/mail-actions").MailAccountInfo | null) => {
      setMailConnected(!!acc);
      setFromEmail(acc?.accountEmail ?? null);
    });

    // Load resume filename (to show in attach toggle)
    getUserResumeFilenameAction(userEmail).then((fname: string | null) => {
      setResumeFilename(fname);
    });

    // Load sent history for this job
    getSentEmailsForJobAction(job.id).then((rows: SentEmailRecord[]) => {
      setHistory(rows);
      setShowHistory(rows.length > 0);
    });
  }, [isOpen, job.id, userEmail, initialBody, job.tags]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    setSendState(null);
    try {
      const res = await sendJobEmailAction(
        userEmail, job.id, to.trim(), subject.trim(), body.trim(),
        attachResume && !!resumeFilename,
        cc.trim() || undefined,
        bcc.trim() || undefined,
      );
      if (res.success) {
        setSendState({ status: "success", zohoMsgId: res.zohoMsgId, sentAt: res.sentAt! });
        // Refresh history
        getSentEmailsForJobAction(job.id).then(setHistory);
      } else {
        setSendState({ status: "error", message: res.error ?? "Unknown error" });
      }
    } catch (err: any) {
      setSendState({ status: "error", message: err?.message ?? "Unexpected error" });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const canSend = !!mailConnected && to.trim() && subject.trim() && body.trim() && !sending && sendState?.status !== "success";
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 8, fontSize: 13,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
    background: isDark ? "rgba(255,255,255,0.04)" : "#fafafa",
    color: "var(--foreground)",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1.2, color: "var(--muted-foreground)", display: "block", marginBottom: 4,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          animation: "fadeIn 0.18s ease",
        }}
      />

      {/* Drawer — 80vw, slides in from right */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1101,
        width: "80vw", maxWidth: 900,
        background: isDark ? "#0f0f0f" : "#fff",
        borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
        boxShadow: isDark ? "-8px 0 60px rgba(0,0,0,0.6)" : "-8px 0 40px rgba(0,0,0,0.12)",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
              ✉️ Compose Cold Email
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
              {job.role} · {job.company}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Provider badge */}
            {mailConnected !== null && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                background: mailConnected
                  ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4")
                  : (isDark ? "rgba(239,68,68,0.12)" : "#fef2f2"),
                color: mailConnected
                  ? (isDark ? "#4ade80" : "#16a34a")
                  : (isDark ? "#f87171" : "#dc2626"),
                border: `1px solid ${mailConnected
                  ? (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0")
                  : (isDark ? "rgba(239,68,68,0.3)" : "#fecaca")}`,
              }}>
                {mailConnected ? `🔗 Zoho · ${fromEmail ?? ""}` : "⚠️ No Mail Connected"}
              </span>
            )}
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* No mail connected warning */}
          {mailConnected === false && (
            <div style={{
              padding: "12px 16px", borderRadius: 10, marginBottom: 20,
              background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
              border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fecaca"}`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: isDark ? "#f87171" : "#dc2626", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#f87171" : "#dc2626", margin: 0 }}>
                  No mail account connected
                </p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                  Go to <strong>Mail Account</strong> in the sidebar to connect your Zoho mailbox first.
                </p>
              </div>
            </div>
          )}

          {/* Success state */}
          {sendState?.status === "success" && (
            <div style={{
              padding: "16px 20px", borderRadius: 12, marginBottom: 20,
              background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
              border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
              display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: isDark ? "#4ade80" : "#16a34a", margin: 0 }}>
                  Email sent successfully!
                </p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
                  Sent at {fmtTime(sendState.sentAt)}
                  {sendState.zohoMsgId && (
                    <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 10 }}>
                      · Zoho ID: {sendState.zohoMsgId}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {sendState?.status === "error" && (
            <div style={{
              padding: "12px 16px", borderRadius: 10, marginBottom: 20,
              background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
              border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fecaca"}`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: isDark ? "#f87171" : "#dc2626", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: isDark ? "#f87171" : "#dc2626", margin: 0 }}>
                {sendState.message}
              </p>
            </div>
          )}

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* From / To row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>From</label>
                <div style={{ ...inputStyle, opacity: 0.7, color: "var(--muted-foreground)" }}>
                  {mailConnected === null ? "Loading..." : (fromEmail ?? "—")}
                </div>
              </div>
              <div>
                <label style={labelStyle}>To</label>
                <input
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="recipient@email.com"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* CC / BCC row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Cc</label>
                <input
                  value={cc}
                  onChange={e => setCc(e.target.value)}
                  placeholder="cc@email.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Bcc</label>
                <input
                  value={bcc}
                  onChange={e => setBcc(e.target.value)}
                  placeholder="bcc@email.com"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject..."
                style={inputStyle}
              />
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>Message Body</label>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={16}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.7,
                  minHeight: 320,
                }}
              />
            </div>
            {/* Attach Resume toggle */}
            {resumeFilename && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 9,
                background: attachResume
                  ? (isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)")
                  : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"),
                border: `1px solid ${attachResume
                  ? (isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)")
                  : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => setAttachResume(v => !v)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Paperclip style={{
                    width: 14, height: 14,
                    color: attachResume ? (isDark ? "#818cf8" : "#6366f1") : "var(--muted-foreground)",
                  }} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: attachResume ? (isDark ? "#818cf8" : "#6366f1") : "var(--muted-foreground)" }}>
                        Attach Resume
                      </p>
                      {job.suggestAttachResume && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                          padding: "1px 5px", borderRadius: 4,
                          background: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)",
                          color: isDark ? "#818cf8" : "#6366f1",
                          border: `1px solid ${isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.25)"}`,
                          textTransform: "uppercase",
                        }}>AI Suggested</span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: 0, opacity: 0.8 }}>
                      {resumeFilename}
                    </p>
                  </div>
                </div>
                {/* Toggle pill */}
                <div style={{
                  width: 36, height: 20, borderRadius: 20, position: "relative", transition: "background 0.2s",
                  background: attachResume ? "#6366f1" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"),
                }}>
                  <div style={{
                    position: "absolute", top: 2, left: attachResume ? 18 : 2,
                    width: 16, height: 16, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>
            )}

          </div>

          {/* ── Sent history ─────────────────────────────────────── */}
          {history.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <button
                onClick={() => setShowHistory(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)",
                  padding: 0, marginBottom: showHistory ? 12 : 0,
                }}
              >
                <Clock style={{ width: 13, height: 13 }} />
                Sent History ({history.length})
                {showHistory
                  ? <ChevronUp style={{ width: 12, height: 12 }} />
                  : <ChevronDown style={{ width: 12, height: 12 }} />
                }
              </button>

              {showHistory && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map(h => (
                    <div key={h.id} style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: isDark ? "rgba(255,255,255,0.03)" : "#f8f8f8",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: "var(--foreground)" }}>
                          {h.subject}
                        </p>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                          {fmtTime(h.sentAt)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                          → {h.toEmail}
                        </span>
                        {h.zohoMsgId && (
                          <span style={{
                            fontSize: 9, fontFamily: "monospace",
                            color: isDark ? "#4ade80" : "#16a34a",
                            background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                            border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
                            padding: "1px 6px", borderRadius: 4,
                          }}>
                            Zoho: {h.zohoMsgId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "16px 24px",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
            background: "none", color: "var(--muted-foreground)", cursor: "pointer",
          }}>
            Cancel
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            {/* Retry button after error */}
            {sendState?.status === "error" && (
              <button onClick={() => setSendState(null)} style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                background: "none", color: "var(--foreground)", cursor: "pointer",
              }}>
                Try Again
              </button>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: "none", cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 8,
                background: canSend
                  ? "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
                  : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"),
                color: canSend ? "#fff" : "var(--muted-foreground)",
                transition: "all 0.2s",
                opacity: sending ? 0.7 : 1,
              }}
            >
              <Send style={{ width: 14, height: 14 }} />
              {sending ? "Sending..." : sendState?.status === "success" ? "Sent ✓" : "Send via Zoho"}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    </>
  );
}
