"use client";

/**
 * PropBot AI — Editable draft email card (Premium Redesign).
 * Highlights [placeholders] in amber and warns user before sending.
 */

import React, { useState, useMemo } from "react";
import { Send, CheckCircle2, ChevronDown, ChevronUp, Edit3, X, AlertTriangle } from "lucide-react";
import type { DraftEmail } from "../../actions/chat-actions";

interface DraftEmailCardProps {
  draft: DraftEmail;
  onSend: (draft: DraftEmail) => Promise<void>;
}

// ── Extract [placeholder] tokens from text ──
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\[([^\]]+)\]/g) ?? [];
  return [...new Set(matches)]; // deduplicate
}

// ── Render text with [placeholder] highlighted ──
function HighlightedBody({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\[[^\]]+\]$/.test(part)) {
          return (
            <mark key={i} style={{
              background: "linear-gradient(135deg, #fef3c7, #fde68a)",
              color: "#92400e",
              fontWeight: 700,
              fontStyle: "italic",
              padding: "1px 6px",
              borderRadius: 5,
              border: "1px solid #fbbf24",
              fontSize: "0.95em",
              boxShadow: "0 1px 4px rgba(251,191,36,0.2)",
            }}>
              {part}
            </mark>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default function DraftEmailCard({ draft, onSend }: DraftEmailCardProps) {
  const [editDraft, setEditDraft] = useState<DraftEmail>(draft);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState("");
  const [editing, setEditing]     = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);

  // Detect unfilled placeholders in entire draft (to, subject, body)
  const placeholders = useMemo(() => {
    const all = [editDraft.to, editDraft.subject, editDraft.body ?? ""].join(" ");
    return extractPlaceholders(all);
  }, [editDraft]);

  const hasPlaceholders = placeholders.length > 0;

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      await onSend(editDraft);
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // ── Sent state ──
  if (sent) {
    return (
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 16px" }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
            flexShrink: 0,
          }}>
            <CheckCircle2 size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Email sent! 🎉</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Delivered to <strong>{editDraft.to}</strong> via Gmail
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Body preview ──
  const bodyLines   = (editDraft.body ?? "").split("\n").filter(Boolean);
  const previewLines = bodyLines.slice(0, 4).join("\n");

  return (
    <div style={s.card}>

      {/* ── Top header bar ── */}
      <div style={s.topBar}>
        <div style={s.topBarLeft}>
          <div style={s.iconBubble}>✉️</div>
          <div>
            <div style={s.cardTitle}>Email Draft</div>
            <div style={s.cardSub}>
              {hasPlaceholders
                ? <span style={{ color: "#d97706", fontWeight: 600 }}>⚠ {placeholders.length} field{placeholders.length > 1 ? "s" : ""} need review</span>
                : "Ready to send via Gmail"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            style={{ ...s.iconBtn, color: editing ? "#7c3aed" : "#94a3b8" }}
            title={editing ? "Done editing" : "Edit draft"}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? <X size={14} /> : <Edit3 size={14} />}
          </button>
          <span style={s.gmailBadge}>Gmail</span>
        </div>
      </div>

      {/* ── Placeholder warning banner ── */}
      {hasPlaceholders && (
        <div style={s.warningBanner}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Fill in before sending:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {placeholders.map((p, i) => (
                <span key={i} style={s.placeholderTag}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Meta fields (To / Subject) ── */}
      <div style={s.metaBlock}>
        <MetaRow
          label="To"
          value={editDraft.to}
          editing={editing}
          onChange={(v) => setEditDraft({ ...editDraft, to: v })}
        />
        {editDraft.cc !== undefined && (
          <MetaRow
            label="CC"
            value={editDraft.cc ?? ""}
            editing={editing}
            onChange={(v) => setEditDraft({ ...editDraft, cc: v })}
          />
        )}
        <div style={s.divider} />
        <MetaRow
          label="Subject"
          value={editDraft.subject}
          editing={editing}
          onChange={(v) => setEditDraft({ ...editDraft, subject: v })}
          bold
        />
      </div>

      {/* ── Body preview / edit ── */}
      <div style={s.bodyBlock}>
        {editing ? (
          <textarea
            style={s.bodyTextarea}
            value={editDraft.body}
            onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
            rows={10}
            autoFocus
          />
        ) : (
          <>
            <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              <HighlightedBody text={bodyExpanded ? (editDraft.body ?? "") : previewLines} />
              {!bodyExpanded && bodyLines.length > 4 && "…"}
            </div>
            {bodyLines.length > 4 && (
              <button
                style={s.expandBtn}
                onClick={() => setBodyExpanded((v) => !v)}
              >
                {bodyExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {bodyExpanded ? "Collapse" : `Show full email (${bodyLines.length} lines)`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={s.errorBanner}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Send button ── */}
      <div style={{ position: "relative" }}>
        <button
          id="propbot-send-email-btn"
          style={{
            ...s.sendBtn,
            opacity: sending ? 0.75 : 1,
            background: hasPlaceholders
              ? "linear-gradient(135deg, #d97706, #b45309)"
              : "linear-gradient(135deg, #7c3aed, #4f46e5)",
          }}
          onClick={handleSend}
          disabled={sending}
        >
          <Send size={14} />
          {sending
            ? "Sending…"
            : hasPlaceholders
            ? `Send anyway (${placeholders.length} unfilled)`
            : "Send via Gmail"}
        </button>
      </div>

    </div>
  );
}

// ── Inline meta row ──
function MetaRow({
  label, value, editing, onChange, bold,
}: {
  label: string; value: string; editing: boolean;
  onChange: (v: string) => void; bold?: boolean;
}) {
  const hasPlaceholder = /\[[^\]]+\]/.test(value);
  return (
    <div style={{ display: "flex", alignItems: editing ? "flex-start" : "center", gap: 10, minHeight: 32 }}>
      <span style={s.metaLabel}>{label}</span>
      {editing ? (
        <input
          style={s.metaInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <span style={{
          fontSize: 13,
          color: bold ? "var(--foreground)" : "var(--foreground)",
          opacity: bold ? 1 : 0.85,
          fontWeight: bold ? 600 : 400,
          flex: 1,
          fontStyle: hasPlaceholder ? "italic" : "normal",
        }}>
          {value
            ? <HighlightedBody text={value} />
            : <em style={{ color: "#94a3b8" }}>—</em>}
        </span>
      )}
    </div>
  );
}

// ── Styles ──
const s: Record<string, React.CSSProperties> = {
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02)",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--email-topbar-bg, linear-gradient(135deg, #faf5ff, #f0f9ff))",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  iconBubble: {
    width: 36, height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #7c3aed15, #4f46e515)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--foreground)",
    lineHeight: 1.3,
  },
  cardSub: {
    fontSize: 10.5,
    color: "#94a3b8",
    fontWeight: 500,
    marginTop: 1,
  },
  gmailBadge: {
    fontSize: 9.5,
    fontWeight: 700,
    background: "rgba(234,67,53,0.1)",
    color: "#ea4335",
    padding: "3px 8px",
    borderRadius: 20,
    border: "1px solid rgba(234,67,53,0.2)",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },
  iconBtn: {
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "5px 7px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "all 0.15s",
  },
  warningBanner: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "var(--warning-banner-bg, linear-gradient(135deg, #fffbeb, #fef3c7))",
    borderBottom: "1px solid var(--warning-banner-border, #fde68a)",
    padding: "10px 16px",
    color: "var(--warning-banner-text, #92400e)",
    fontSize: 12,
    fontWeight: 500,
  },
  placeholderTag: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)",
    color: "#92400e",
    border: "1px solid #fbbf24",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    fontStyle: "italic",
    display: "inline-block",
  },
  metaBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 16px",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    width: 52,
    flexShrink: 0,
    paddingTop: 2,
  },
  metaInput: {
    flex: 1,
    background: "var(--input)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    color: "var(--foreground)",
    outline: "none",
    fontFamily: "inherit",
  },
  divider: {
    height: 1,
    background: "rgba(0,0,0,0.05)",
    margin: "4px 0",
  },
  bodyBlock: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(0,0,0,0.04)",
  },
  bodyTextarea: {
    width: "100%",
    background: "var(--input)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    color: "var(--foreground)",
    lineHeight: 1.7,
    resize: "vertical" as const,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  },
  expandBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    background: "transparent",
    border: "none",
    color: "#7c3aed",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "none",
    borderRadius: "0 0 15px 15px",
    padding: "13px 20px",
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 -2px 12px rgba(124,58,237,0.1)",
    transition: "opacity 0.2s, background 0.3s",
    letterSpacing: "0.02em",
    width: "100%",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "var(--error-banner-bg, #fef2f2)",
    color: "var(--error-banner-text, #dc2626)",
    fontSize: 12,
    fontWeight: 500,
    padding: "8px 16px",
    borderTop: "1px solid var(--error-banner-border, #fee2e2)",
  },
};
