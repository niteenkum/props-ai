"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Reply, Plus } from "lucide-react";
import type { SentEmailRecord } from "../actions/mail-actions";
import { getSentEmailsForJobAction, sendReplyEmailAction } from "../actions/mail-actions";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  jobPostId: string;
  jobRole:   string;
  jobCompany:string;
  toEmail:   string;
  userEmail: string;
  isDark:    boolean;
  /** Whether to open in "new mail" mode (opens EmailComposeDrawer parent) */
  onNewMail: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}
function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function initials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ email, isDark, size = 32 }: { email: string; isDark: boolean; size?: number }) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#22c55e"];
  const color  = colors[email.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}22`, border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, color,
    }}>
      {initials(email)}
    </div>
  );
}

// ─── Thread message bubble ────────────────────────────────────────────────────
function ThreadMessage({ msg, isDark, expanded, onToggle }: {
  msg: SentEmailRecord; isDark: boolean; expanded: boolean; onToggle: () => void;
}) {
  const isMine = true; // All SentEmail records are outgoing from us
  return (
    <div style={{ display: "flex", gap: 12, padding: "0 0 4px" }}>
      <Avatar email={msg.fromEmail} isDark={isDark} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer", marginBottom: expanded ? 12 : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
              {msg.fromEmail}
            </span>
            {isMine && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 50,
                background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                color: isDark ? "#818cf8" : "#6366f1",
                border: `1px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"}`,
              }}>You</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
              {fmtRelative(msg.sentAt)}
            </span>
            {expanded
              ? <ChevronUp style={{ width: 13, height: 13, color: "var(--muted-foreground)" }} />
              : <ChevronDown style={{ width: 13, height: 13, color: "var(--muted-foreground)" }} />
            }
          </div>
        </div>

        {/* Collapsed preview */}
        {!expanded && (
          <p
            onClick={onToggle}
            style={{
              fontSize: 12, color: "var(--muted-foreground)", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              cursor: "pointer", opacity: 0.7,
            }}
          >
            {msg.subject} — {msg.body.slice(0, 80)}…
          </p>
        )}

        {/* Expanded body */}
        {expanded && (
          <div style={{
            background: isDark ? "rgba(255,255,255,0.02)" : "#f8f8f8",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
            borderRadius: 10, padding: "16px 18px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", margin: "0 0 10px", letterSpacing: 0.5 }}>
              {msg.subject}
            </p>
            <pre style={{
              fontSize: 13, color: "var(--foreground)", fontFamily: "inherit",
              whiteSpace: "pre-wrap", lineHeight: 1.75, margin: 0,
            }}>
              {msg.body}
            </pre>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}` }}>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                → {msg.toEmail} · {fmtTime(msg.sentAt)}
              </span>
              {msg.zohoMsgId && (
                <span style={{
                  fontSize: 9, fontFamily: "monospace", padding: "1px 6px", borderRadius: 4,
                  background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                  color: isDark ? "#4ade80" : "#16a34a",
                  border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
                }}>
                  Zoho ✓
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmailThreadDrawer({
  isOpen, onClose, jobPostId, jobRole, jobCompany,
  toEmail, userEmail, isDark, onNewMail,
}: Props) {
  const [thread,       setThread]      = useState<SentEmailRecord[]>([]);
  const [loading,      setLoading]     = useState(true);
  const [expandedIds,  setExpandedIds] = useState<Set<string>>(new Set());

  // Reply state
  const [showReply,    setShowReply]   = useState(false);
  const [replyBody,    setReplyBody]   = useState("");
  const [sending,      setSending]     = useState(false);
  const [sendState,    setSendState]   = useState<
    null | { status: "success"; sentAt: string } | { status: "error"; message: string }
  >(null);

  const replyRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load thread ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSendState(null);
    setShowReply(false);
    setReplyBody("");
    getSentEmailsForJobAction(jobPostId).then(rows => {
      setThread(rows);
      // Expand the latest message by default
      if (rows.length > 0) setExpandedIds(new Set([rows[0].id]));
      setLoading(false);
    });
  }, [isOpen, jobPostId]);

  // Auto-focus reply textarea
  useEffect(() => {
    if (showReply) {
      setTimeout(() => replyRef.current?.focus(), 80);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    }
  }, [showReply]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Send reply ──────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyBody.trim() || !thread.length) return;
    setSending(true);
    setSendState(null);
    try {
      const latest      = thread[0]; // Most recent sent message
      const subject     = latest.subject;
      const inReplyToId = latest.zohoMsgId ?? "";
      // ✅ Use the actual toEmail from the sent record — not the job prop.
      // The user may have edited the "To" field in the compose drawer,
      // so we always reply to whoever the last message actually went to.
      const replyTo     = latest.toEmail;

      const res = await sendReplyEmailAction(
        userEmail,
        jobPostId,
        replyTo,
        subject,
        replyBody.trim(),
        inReplyToId,
      );

      if (res.success) {
        setSendState({ status: "success", sentAt: res.sentAt! });
        setReplyBody("");
        setShowReply(false);
        // Reload thread
        const rows = await getSentEmailsForJobAction(jobPostId);
        setThread(rows);
        if (rows.length > 0) setExpandedIds(new Set([rows[0].id]));
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

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: 10, fontSize: 13,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
    background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
    color: "var(--foreground)", outline: "none",
    fontFamily: "inherit", lineHeight: 1.7, resize: "vertical",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)",
          backdropFilter: "blur(3px)",
          animation: "fadeIn 0.18s ease",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1101,
        width: "72vw", maxWidth: 860,
        background: isDark ? "#0c0c0e" : "#fff",
        borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)"}`,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
        boxShadow: isDark ? "-12px 0 80px rgba(0,0,0,0.7)" : "-8px 0 48px rgba(0,0,0,0.12)",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px", flexShrink: 0,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Reply style={{ width: 15, height: 15, color: isDark ? "#818cf8" : "#6366f1" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                  Email Thread
                </h2>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                  {jobRole} · {jobCompany}
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* New Mail button */}
            <button
              onClick={() => { onClose(); setTimeout(onNewMail, 80); }}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1px solid ${isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)"}`,
                background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                color: isDark ? "#818cf8" : "#6366f1", cursor: "pointer",
              }}
            >
              <Plus style={{ width: 13, height: 13 }} />
              New Mail
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>

        {/* ── Thread Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Thread count badge */}
          {!loading && thread.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                height: 1, flex: 1,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2,
                color: "var(--muted-foreground)", whiteSpace: "nowrap",
              }}>
                {thread.length} message{thread.length > 1 ? "s" : ""}
              </span>
              <div style={{ height: 1, flex: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2].map(i => (
                <div key={i} style={{
                  height: 80, borderRadius: 12,
                  background: isDark ? "rgba(255,255,255,0.03)" : "#f5f5f5",
                  animation: "pulse 1.5s ease infinite",
                  opacity: 0.6,
                }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && thread.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted-foreground)" }}>
              <Reply style={{ width: 36, height: 36, opacity: 0.2, margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>No messages yet</p>
              <p style={{ fontSize: 12, margin: "4px 0 0", opacity: 0.6 }}>Send the first email using the button above.</p>
            </div>
          )}

          {/* Messages — newest first, with divider between each */}
          {!loading && thread.map((msg, idx) => (
            <div key={msg.id}>
              <ThreadMessage
                msg={msg}
                isDark={isDark}
                expanded={expandedIds.has(msg.id)}
                onToggle={() => toggleExpand(msg.id)}
              />
              {idx < thread.length - 1 && (
                <div style={{
                  margin: "16px 0 16px 48px",
                  borderTop: `1px dashed ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)"}`,
                }} />
              )}
            </div>
          ))}

          {/* Success toast */}
          {sendState?.status === "success" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginTop: 16,
              padding: "12px 16px", borderRadius: 10,
              background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
              border: `1px solid ${isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0"}`,
            }}>
              <CheckCircle2 style={{ width: 15, height: 15, color: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a" }}>
                Reply sent at {new Date(sendState.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
            </div>
          )}

          {/* Error */}
          {sendState?.status === "error" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginTop: 16,
              padding: "12px 16px", borderRadius: 10,
              background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
              border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fecaca"}`,
            }}>
              <AlertCircle style={{ width: 15, height: 15, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#ef4444" }}>{sendState.message}</span>
            </div>
          )}

          {/* Reply compose box (inline) */}
          {showReply && (
            <div style={{
              marginTop: 20, padding: "18px 20px", borderRadius: 14,
              background: isDark ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.03)",
              border: `1px solid ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.18)"}`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: isDark ? "#818cf8" : "#6366f1", margin: "0 0 12px" }}>
                Replying to {thread[0]?.toEmail ?? toEmail}
              </p>
              <textarea
                ref={replyRef}
                rows={8}
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Write your reply here..."
                style={{ ...inputStyle, minHeight: 160 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <button
                  onClick={() => { setShowReply(false); setSendState(null); }}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                    background: "none", color: "var(--muted-foreground)", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendReply}
                  disabled={!replyBody.trim() || sending}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 22px",
                    borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none",
                    cursor: replyBody.trim() && !sending ? "pointer" : "not-allowed",
                    background: replyBody.trim() && !sending
                      ? "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
                      : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"),
                    color: replyBody.trim() && !sending ? "#fff" : "var(--muted-foreground)",
                    opacity: sending ? 0.7 : 1, transition: "all 0.2s",
                    boxShadow: replyBody.trim() && !sending ? "0 2px 12px rgba(99,102,241,0.35)" : "none",
                  }}
                >
                  <Send style={{ width: 13, height: 13 }} />
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Footer — Reply button ── */}
        {!showReply && (
          <div style={{
            padding: "16px 28px",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)", flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {thread.length > 0 ? `Last sent ${fmtRelative(thread[0].sentAt)}` : "No messages sent yet"}
            </span>
            <button
              onClick={() => { setShowReply(true); setSendState(null); }}
              disabled={thread.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none",
                cursor: thread.length > 0 ? "pointer" : "not-allowed",
                background: thread.length > 0
                  ? "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
                  : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"),
                color: thread.length > 0 ? "#fff" : "var(--muted-foreground)",
                boxShadow: thread.length > 0 ? "0 2px 14px rgba(99,102,241,0.4)" : "none",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (thread.length > 0) e.currentTarget.style.opacity = "0.87"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              <Reply style={{ width: 14, height: 14 }} />
              Reply in Thread
            </button>
          </div>
        )}

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes pulse  {
            0%, 100% { opacity: 0.4; }
            50%       { opacity: 0.7; }
          }
        `}</style>
      </div>
    </>
  );
}
