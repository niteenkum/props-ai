"use client";

/**
 * PropBot AI — Editable draft email card.
 * Shown when Gemini generates an email draft for user review.
 */

import React, { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import type { DraftEmail } from "../../actions/chat-actions";

interface DraftEmailCardProps {
  draft: DraftEmail;
  onSend: (draft: DraftEmail) => Promise<void>;
}

export default function DraftEmailCard({ draft, onSend }: DraftEmailCardProps) {
  const [editDraft, setEditDraft] = useState<DraftEmail>(draft);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState("");

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

  if (sent) {
    return (
      <div style={{ ...styles.card, borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)" }}>
        <div style={styles.sentMsg}>
          <CheckCircle2 size={20} color="#22c55e" />
          Email sent successfully via Gmail!
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>✉️</span>
        <span style={styles.headerTitle}>Review & Send</span>
        <span style={styles.headerBadge}>Gmail Draft</span>
      </div>

      <div style={styles.fields}>
        <Field
          label="To"
          value={editDraft.to}
          onChange={(v) => setEditDraft({ ...editDraft, to: v })}
        />
        {editDraft.cc !== undefined && (
          <Field
            label="CC"
            value={editDraft.cc ?? ""}
            onChange={(v) => setEditDraft({ ...editDraft, cc: v })}
          />
        )}
        <Field
          label="Subject"
          value={editDraft.subject}
          onChange={(v) => setEditDraft({ ...editDraft, subject: v })}
        />
        <div style={styles.field}>
          <label style={styles.label}>Body</label>
          <textarea
            style={{ ...styles.input, minHeight: 120, resize: "vertical" as const }}
            value={editDraft.body}
            onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
          />
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <button
        id="propbot-send-email-btn"
        style={{ ...styles.sendBtn, opacity: sending ? 0.7 : 1 }}
        onClick={handleSend}
        disabled={sending}
      >
        <Send size={14} />
        {sending ? "Sending…" : "Send via Gmail"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: { fontSize: 18 },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--foreground)",
    flex: 1,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: "rgba(124,58,237,0.15)",
    color: "#7c3aed",
    padding: "2px 8px",
    borderRadius: 20,
    border: "1px solid rgba(124,58,237,0.25)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--muted-foreground)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  input: {
    background: "var(--input)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "var(--foreground)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
    transition: "opacity 0.2s",
  },
  error: {
    fontSize: 12,
    color: "#ef4444",
    margin: 0,
  },
  sentMsg: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 600,
    color: "#22c55e",
    padding: "8px 0",
    justifyContent: "center",
  },
};
