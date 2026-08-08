"use client";

// ─── ReplyDrawer ──────────────────────────────────────────────────────────────
// Premium 2-Panel Side-by-Side Reply Drawer (1080px):
// - Left Panel: Clean Mail Trail (shows latest recruiter message clearly + expandable older messages)
// - Right Panel: AI Copilot Prompt Bar + Direct Clean Editable Email Editor

import React, { useState, useEffect, useRef } from "react";
import {
  X, Send, Sparkles, Loader2, CheckCircle2, AlertCircle, Reply,
  MessageSquare, Copy, Check, Wand2, Bot, ChevronDown, ChevronUp, Clock
} from "lucide-react";
import {
  sendReplyEmailAction,
  generateAIReplyAction,
  type ThreadMessage,
} from "../actions/mail-actions";

// ─── Props ────────────────────────────────────────────────────────────────────
interface ReplyDrawerProps {
  isOpen:         boolean;
  onClose:        () => void;
  /** Full thread (sorted oldest→newest) */
  thread:         ThreadMessage[];
  jobId:          string;
  jobRole:        string;
  jobCompany:     string;
  userEmail:      string;
  isDark:         boolean;
  /** AI-generated draft to pre-fill (optional) */
  initialDraft?:  string;
  /** Called after a successful send so the parent can reload the thread */
  onReplySent?:   () => void;
}

// ─── Quick Suggestion Chips ───────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: "⚡ Short & Direct", prompt: "Make the reply very brief, direct, and under 4 sentences." },
  { label: "💰 Salary Expectation", prompt: "Include my salary expectations ($150k-$170k) and remote preference clearly." },
  { label: "📅 Schedule Call", prompt: "Ask to schedule a 15-min call to discuss further this week." },
  { label: "🚀 Highlight Experience", prompt: "Emphasize my experience building FLN Haryana & iScuela Learn." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function initials(email: string) {
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function Avatar({ email, size = 28 }: { email: string; size?: number }) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#22c55e"];
  const color  = colors[email.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}22`, border: `1.5px solid ${color}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 800, color,
    }}>
      {initials(email)}
    </div>
  );
}

function cleanPlainText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // strip **bold**
    .replace(/\*(.*?)\*/g, "$1")     // strip *italic*
    .replace(/^#+\s+/gm, "")        // strip markdown headers
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "") // strip code blocks
    .trim();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReplyDrawer({
  isOpen, onClose, thread, jobId, jobRole, jobCompany,
  userEmail, isDark, initialDraft = "", onReplySent,
}: ReplyDrawerProps) {
  const [body,            setBody]            = useState(cleanPlainText(initialDraft));
  const [userPrompt,      setUserPrompt]      = useState("");
  const [sending,         setSending]         = useState(false);
  const [aiLoading,       setAiLoading]       = useState(false);
  const [showOlderThread,        setShowOlderThread]        = useState(false);
  const [copied,                 setCopied]                 = useState(false);
  const [cumulativeInstructions, setCumulativeInstructions] = useState<string[]>([]);

  const [sendState, setSendState] = useState<
    null | { status: "success"; sentAt: string } | { status: "error"; message: string }
  >(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const trailScrollRef = useRef<HTMLDivElement>(null);

  // Sync initialDraft
  useEffect(() => {
    if (initialDraft) setBody(cleanPlainText(initialDraft));
  }, [initialDraft]);

  // Reset or focus on open
  useEffect(() => {
    if (isOpen) {
      setSendState(null);
      setTimeout(() => textareaRef.current?.focus(), 120);
      setTimeout(() => {
        if (trailScrollRef.current) {
          trailScrollRef.current.scrollTop = trailScrollRef.current.scrollHeight;
        }
      }, 150);
    } else {
      setSendState(null);
      setSending(false);
      setAiLoading(false);
      setUserPrompt("");
      setShowOlderThread(false);
      setCumulativeInstructions([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lastMsg       = thread[thread.length - 1];
  const olderMessages = thread.slice(0, -1);
  const lastSent      = [...thread].reverse().find(m => m.direction === "sent");
  const replyTo       = lastMsg?.direction === "received" ? lastMsg.fromEmail : lastMsg?.toEmail ?? "";
  const subject       = lastMsg?.subject ?? "";
  const inReplyToId   = lastSent?.zohoMsgId ?? "";

  // ── AI Generator ────────────────────────────────────────────────────────────
  const runAIGeneration = async (customInstruction?: string) => {
    if (!thread.length || aiLoading) return;
    setAiLoading(true);
    setSendState(null);

    const promptToUse = (customInstruction || userPrompt).trim();
    if (customInstruction) setUserPrompt("");

    let updatedInstructions = [...cumulativeInstructions];
    if (promptToUse && !updatedInstructions.includes(promptToUse)) {
      updatedInstructions = [...updatedInstructions, promptToUse];
      setCumulativeInstructions(updatedInstructions);
    }

    try {
      const ctx = thread.slice(-10).map(m => ({
        direction: m.direction,
        fromEmail: m.fromEmail,
        toEmail:   m.toEmail,
        body:      m.body,
        sentAt:    m.sentAt,
      }));

      const res = await generateAIReplyAction(
        userEmail, jobRole, jobCompany, replyTo, ctx, promptToUse || undefined, undefined, updatedInstructions
      );

      if (res.success && res.reply) {
        setBody(cleanPlainText(res.reply));
        setUserPrompt("");
        setTimeout(() => textareaRef.current?.focus(), 80);
      } else {
        setSendState({ status: "error", message: res.error ?? "AI reply generation failed" });
      }
    } catch (err: any) {
      setSendState({ status: "error", message: err?.message ?? "AI reply generation failed" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Send reply ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setSendState(null);
    try {
      const res = await sendReplyEmailAction(
        userEmail, jobId, replyTo, subject, body.trim(), inReplyToId,
      );
      if (res.success) {
        setSendState({ status: "success", sentAt: res.sentAt! });
        setBody("");
        setTimeout(() => {
          onReplySent?.();
          onClose();
        }, 1200);
      } else {
        setSendState({ status: "error", message: res.error ?? "Send failed" });
      }
    } catch (err: any) {
      setSendState({ status: "error", message: err?.message ?? "Unexpected error" });
    } finally {
      setSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1200,
          background: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          animation: "rdFadeIn 0.15s ease",
        }}
      />

      {/* 2-Panel Side-by-Side Drawer (1080px wide) */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1201,
        width: "min(1080px, 95vw)",
        background: isDark ? "#0a0a0c" : "#ffffff",
        borderLeft: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"}`,
        display: "flex", flexDirection: "column",
        animation: "rdSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: isDark ? "-20px 0 90px rgba(0,0,0,0.85)" : "-10px 0 50px rgba(0,0,0,0.14)",
      }}>

        {/* ── Top Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", flexShrink: 0,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
          background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
              border: `1px solid ${isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.22)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Reply style={{ width: 16, height: 16, color: isDark ? "#818cf8" : "#6366f1" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
                Reply in Thread
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                  background: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)",
                  color: isDark ? "#c084fc" : "#7c3aed",
                  border: `1px solid ${isDark ? "rgba(168,85,247,0.25)" : "rgba(139,92,246,0.2)"}`,
                }}>
                  ✨ AI Copilot Active
                </span>
              </h2>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                To: <strong style={{ color: "var(--foreground)" }}>{replyTo}</strong> · Re: {subject.replace(/^Re:\s*/i, "").slice(0, 50)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              color: "var(--muted-foreground)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── 2-PANEL BODY LAYOUT ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── LEFT PANEL: MAIL TRAIL ── */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div style={{
            width: "48%", minWidth: 420, flexShrink: 0,
            borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
            background: isDark ? "rgba(255,255,255,0.015)" : "#fafafa",
            display: "flex", flexDirection: "column",
          }}>
            {/* Left Panel Title Bar */}
            <div style={{
              padding: "12px 20px",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff", flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 7 }}>
                <MessageSquare style={{ width: 14, height: 14, color: isDark ? "#818cf8" : "#6366f1" }} />
                Mail Trail ({thread.length} message{thread.length > 1 ? "s" : ""})
              </span>
              {olderMessages.length > 0 && (
                <button
                  onClick={() => setShowOlderThread(!showOlderThread)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: "2px 6px",
                    fontSize: 10.5, fontWeight: 600, color: isDark ? "#818cf8" : "#6366f1",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {showOlderThread ? "Hide older" : `View ${olderMessages.length} older`}
                  {showOlderThread ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                </button>
              )}
            </div>

            {/* Scrollable list of messages in thread */}
            <div
              ref={trailScrollRef}
              style={{
                flex: 1, padding: "16px 20px", overflowY: "auto",
                display: "flex", flexDirection: "column", gap: 14,
              }}
            >
              {/* 1. Older messages (rendered when expanded) */}
              {showOlderThread && olderMessages.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 4 }}>
                  {olderMessages.map((msg, idx) => {
                    const isSent = msg.direction === "sent";
                    return (
                      <div
                        key={msg.id ?? idx}
                        style={{
                          padding: "12px 14px", borderRadius: 10,
                          background: isDark
                            ? (isSent ? "rgba(99,102,241,0.04)" : "rgba(255,255,255,0.025)")
                            : (isSent ? "#f4f4fe" : "#ffffff"),
                          border: `1px solid ${isDark
                            ? (isSent ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.06)")
                            : (isSent ? "rgba(99,102,241,0.12)" : "rgba(0,0,0,0.08)")}`,
                          opacity: 0.88,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Avatar email={msg.fromEmail} size={24} />
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--foreground)" }}>
                            {msg.fromEmail}
                          </span>
                          <span style={{
                            fontSize: 9, padding: "1px 6px", borderRadius: 20, fontWeight: 700,
                            background: isSent
                              ? (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)")
                              : (isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)"),
                            color: isSent
                              ? (isDark ? "#818cf8" : "#6366f1")
                              : (isDark ? "#4ade80" : "#16a34a"),
                          }}>
                            {isSent ? "You" : "Recruiter"}
                          </span>
                          <span style={{ fontSize: 9.5, color: "var(--muted-foreground)", marginLeft: "auto" }}>
                            {fmtTime(msg.sentAt)}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 12, color: "var(--foreground)", opacity: 0.9, margin: 0,
                          lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>
                          {msg.body.trim()}
                        </p>
                      </div>
                    );
                  })}
                  <div style={{ borderBottom: `1px stroke ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, margin: "4px 0" }} />
                </div>
              )}

              {/* Collapsed indicator if older messages exist & not expanded */}
              {!showOlderThread && olderMessages.length > 0 && (
                <div
                  onClick={() => setShowOlderThread(true)}
                  style={{
                    padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    border: `1px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600,
                  }}
                >
                  <Clock style={{ width: 12, height: 12 }} />
                  {olderMessages.length} older message{olderMessages.length > 1 ? "s" : ""} in thread (click to expand)
                </div>
              )}

              {/* 2. LATEST MESSAGE (ALWAYS EXPANDED AND VISIBLE AT THE TOP) */}
              {lastMsg && (() => {
                const isSent = lastMsg.direction === "sent";
                return (
                  <div
                    style={{
                      padding: "16px", borderRadius: 12,
                      background: isDark
                        ? (isSent ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.035)")
                        : (isSent ? "#f4f4fe" : "#ffffff"),
                      border: `1.5px solid ${isDark
                        ? (isSent ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)")
                        : (isSent ? "rgba(99,102,241,0.2)" : "rgba(0,0,0,0.1)")}`,
                      boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <Avatar email={lastMsg.fromEmail} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>
                            {lastMsg.fromEmail}
                          </span>
                          <span style={{
                            fontSize: 9.5, padding: "1px 7px", borderRadius: 20, fontWeight: 700,
                            background: isSent
                              ? (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)")
                              : (isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)"),
                            color: isSent
                              ? (isDark ? "#818cf8" : "#6366f1")
                              : (isDark ? "#4ade80" : "#16a34a"),
                          }}>
                            {isSent ? "You" : "Latest Recruiter Message"}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                          {fmtTime(lastMsg.sentAt)}
                        </span>
                      </div>
                    </div>

                    <p style={{
                      fontSize: 12.5, color: "var(--foreground)", opacity: 0.95, margin: 0,
                      lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {lastMsg.body.trim()}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* ── RIGHT PANEL: AI BOT COPILOT & EMAIL EDITOR ── */}
          {/* ════════════════════════════════════════════════════════════ */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: isDark ? "#0c0c0e" : "#ffffff",
          }}>

            {/* AI Controls Bar (Top of Right Panel) */}
            <div style={{
              padding: "14px 20px 10px", flexShrink: 0,
              background: isDark ? "rgba(139,92,246,0.03)" : "rgba(139,92,246,0.02)",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {/* AI Input Form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  runAIGeneration();
                }}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", borderRadius: 10,
                  border: `1.5px solid ${isDark ? "rgba(168,85,247,0.35)" : "rgba(139,92,246,0.3)"}`,
                  background: isDark ? "rgba(0,0,0,0.25)" : "#ffffff",
                  boxShadow: isDark ? "0 2px 10px rgba(0,0,0,0.2)" : "0 2px 6px rgba(139,92,246,0.05)",
                }}>
                  <Bot style={{ width: 15, height: 15, color: isDark ? "#c084fc" : "#7c3aed", flexShrink: 0 }} />
                  <input
                    type="text"
                    value={userPrompt}
                    onChange={e => setUserPrompt(e.target.value)}
                    placeholder="Instruct AI to draft or refine reply (e.g. 'Ask for $150k salary')..."
                    disabled={aiLoading}
                    style={{
                      flex: 1, border: "none", outline: "none", background: "transparent",
                      fontSize: 12.5, color: "var(--foreground)", fontFamily: "inherit",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={aiLoading}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, border: "none",
                    background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                    color: "#ffffff", cursor: aiLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 10px rgba(124,58,237,0.3)", opacity: aiLoading ? 0.7 : 1,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  {aiLoading
                    ? <Loader2 style={{ width: 13, height: 13, animation: "rdSpin 0.9s linear infinite" }} />
                    : <Wand2 style={{ width: 13, height: 13 }} />
                  }
                  {aiLoading ? "AI Writing..." : "Generate AI Reply"}
                </button>
              </form>

              {/* Quick AI Suggestion Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.6, marginRight: 2 }}>
                  Quick Chips:
                </span>
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => runAIGeneration(s.prompt)}
                    disabled={aiLoading}
                    style={{
                      fontSize: 10.5, fontWeight: 600, padding: "4px 9px", borderRadius: 6,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.1)"}`,
                      background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                      color: "var(--foreground)", cursor: aiLoading ? "not-allowed" : "pointer",
                      transition: "all 0.15s", opacity: aiLoading ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!aiLoading) e.currentTarget.style.borderColor = isDark ? "#c084fc" : "#7c3aed"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.1)"; }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Response Textarea Editor */}
            <div style={{
              flex: 1, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10,
              overflowY: "auto", position: "relative",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted-foreground)" }}>
                  Email Reply Draft (Editable)
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6,
                    fontSize: 11, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                    background: "none", color: "var(--muted-foreground)", cursor: "pointer",
                  }}
                >
                  {copied ? <Check style={{ width: 12, height: 12, color: "#22c55e" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              {/* Cumulative Instructions Indicator Banner */}
              {cumulativeInstructions.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
                  padding: "8px 12px", borderRadius: 8, fontSize: 11.5,
                  background: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
                  border: `1px solid ${isDark ? "rgba(168,85,247,0.3)" : "rgba(139,92,246,0.2)"}`,
                  color: isDark ? "#c084fc" : "#7c3aed", fontWeight: 600,
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1 }}>
                    <Sparkles style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <span>Active AI Instructions ({cumulativeInstructions.length}):</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {cumulativeInstructions.map((inst, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: 10.5, padding: "2px 7px", borderRadius: 4,
                              background: isDark ? "rgba(0,0,0,0.3)" : "#ffffff",
                              border: `1px solid ${isDark ? "rgba(168,85,247,0.4)" : "rgba(139,92,246,0.25)"}`,
                            }}
                          >
                            #{idx + 1}: "{inst}"
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCumulativeInstructions([])}
                    title="Clear cumulative instructions"
                    style={{
                      background: "none", border: "none", cursor: "pointer", fontSize: 10.5,
                      color: isDark ? "#f472b6" : "#e11d48", fontWeight: 700, padding: 0, flexShrink: 0,
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                id="reply-drawer-textarea"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Type your email reply here or use the AI Bot prompt above..."
                style={{
                  flex: 1, width: "100%", boxSizing: "border-box",
                  padding: "16px", borderRadius: 10, fontSize: 13.5,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.11)"}`,
                  background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
                  color: "var(--foreground)", outline: "none",
                  fontFamily: "inherit", lineHeight: 1.7,
                  resize: "none", minHeight: 300,
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.11)"; }}
              />

              {/* Status notifications */}
              {sendState?.status === "success" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8,
                  background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                  border: `1px solid ${isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0"}`,
                }}>
                  <CheckCircle2 style={{ width: 15, height: 15, color: "#22c55e", flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a" }}>
                    Reply sent successfully at {new Date(sendState.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              )}
              {sendState?.status === "error" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8,
                  background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
                  border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fecaca"}`,
                }}>
                  <AlertCircle style={{ width: 15, height: 15, color: "#ef4444", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#ef4444" }}>{sendState.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "14px 24px", flexShrink: 0,
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
        }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            {body.trim().split(/\s+/).filter(Boolean).length} words · Fully editable
          </span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                background: "none", color: "var(--muted-foreground)", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              id="reply-drawer-send-btn"
              onClick={handleSend}
              disabled={!body.trim() || sending}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none",
                cursor: body.trim() && !sending ? "pointer" : "not-allowed",
                background: body.trim() && !sending
                  ? "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
                  : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"),
                color: body.trim() && !sending ? "#fff" : "var(--muted-foreground)",
                opacity: sending ? 0.75 : 1,
                boxShadow: body.trim() && !sending ? "0 2px 14px rgba(99,102,241,0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              {sending
                ? <Loader2 style={{ width: 13, height: 13, animation: "rdSpin 0.9s linear infinite" }} />
                : <Send style={{ width: 13, height: 13 }} />
              }
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rdSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes rdFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rdSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
