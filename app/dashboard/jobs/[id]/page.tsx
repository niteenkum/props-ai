"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Check, Copy, Pencil, X, Send, Sparkles, Edit3,
  Trash2, Mail, Calendar, Tag, RefreshCw, RotateCcw, Loader2,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../components/theme-provider";
import {
  getJobByIdAction,
  updateJobPostAction,
  deleteJobPostAction,
} from "../../../actions/db-actions";
import { analyzeAndGenerateAction } from "../../../actions/ai-actions";
import { cardStyle, inputStyle, labelStyle } from "../../styles";
import type { JobPost } from "../../../utils/db";
import EmailComposeDrawer from "../../EmailComposeDrawer";
import EmailThreadDrawer from "../../EmailThreadDrawer";

// ── Platform tab metadata ─────────────────────────────────────────────────────
const PLATFORM_META: Record<string, { label: string; icon: string }> = {
  coldEmail:   { label: "Cold Email",       icon: "✉️" },
  proposal:    { label: "Upwork Proposal",  icon: "🔵" },
  linkedin:    { label: "LinkedIn Message", icon: "🔗" },
  coverLetter: { label: "Cover Letter",     icon: "📄" },
  whatsapp:    { label: "WhatsApp Message", icon: "💬" },
  freelancer:  { label: "Freelancer Bid",   icon: "⚡" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getScoreColor(s: number) {
  return s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
}
function getScoreBg(s: number, dark: boolean) {
  if (s >= 80) return dark ? "rgba(34,197,94,0.12)"  : "#f0fdf4";
  if (s >= 60) return dark ? "rgba(245,158,11,0.12)" : "#fffbeb";
  return dark ? "rgba(239,68,68,0.12)" : "#fef2f2";
}
function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "Generated":    return { background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" };
    case "Sent":         return { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" };
    case "Interviewing": return { background: "#fdf4ff", color: "#9333ea", border: "1px solid #e9d5ff" };
    case "Declined":     return { background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" };
    default:             return { background: "#fafafa", color: "#888",    border: "1px solid #eee" };
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function JobDetailPage() {
  const router     = useRouter();
  const params     = useParams();
  const jobId      = params?.id as string;

  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  // ─ Data ─────────────────────────────────────────────────────────────────────
  const [job,       setJob]       = useState<JobPost | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  // ─ Tabs ──────────────────────────────────────────────────────────────────────
  const [mainTab,     setMainTab]     = useState<"templates" | "details">("templates");
  const [templateTab, setTemplateTab] = useState<string>("coldEmail");

  // ─ Edit template ─────────────────────────────────────────────────────────────
  const [editingKey,  setEditingKey]  = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // ─ Notes ─────────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");

  // ─ Copy states ───────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ─ Regenerate ────────────────────────────────────────────────────────────────
  const [regenerating, setRegenerating] = useState(false);

  // ─ Compose drawer ────────────────────────────────────────────────────────────
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeBody,   setComposeBody]   = useState("");

  // ─ Thread drawer ─────────────────────────────────────────────────────────────
  const [isThreadOpen,  setIsThreadOpen]  = useState(false);

  // ─ Load job ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !jobId) return;
    getJobByIdAction(jobId).then(j => {
      if (!j) { setNotFound(true); setLoading(false); return; }
      setJob(j);
      setNotes(j.notes ?? "");
      // auto-select first available template tab
      const tmpl = j.generatedTemplates ?? {};
      const first = Object.entries(tmpl).find(([, v]) => v && !v.startsWith("[Generation failed"))?.[0];
      setTemplateTab(first ?? "coldEmail");
      setLoading(false);
    });
  }, [isReady, jobId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNotes = async () => {
    if (!job) return;
    const updated = { ...job, notes };
    setJob(updated);
    await updateJobPostAction(updated);
  };

  const handleStatusChange = async (status: JobPost["status"]) => {
    if (!job) return;
    const updated = { ...job, status };
    setJob(updated);
    await updateJobPostAction(updated);
  };

  const startEditing = (key: string, text: string) => {
    setEditingKey(key);
    setEditingText(text);
  };

  const cancelEditing = () => { setEditingKey(null); setEditingText(""); };

  const saveEditing = async () => {
    if (!job || !editingKey) return;
    const updated = {
      ...job,
      generatedTemplates: { ...(job.generatedTemplates ?? {}), [editingKey]: editingText },
    };
    setJob(updated);
    setEditingKey(null);
    setEditingText("");
    await updateJobPostAction(updated);
  };

  const handleDelete = async () => {
    if (!job) return;
    if (!confirm("Delete this job scan? This cannot be undone.")) return;
    await deleteJobPostAction(job.id);
    router.push("/dashboard");
  };

  const handleRegenerate = async () => {
    if (!job) return;
    setRegenerating(true);
    try {
      const result = await analyzeAndGenerateAction(job.originalText, userEmail);
      if (result.success && result.result) {
        const updated = { ...job, generatedTemplates: result.result.generatedTemplates };
        setJob(updated);
        await updateJobPostAction(updated);
      }
    } finally {
      setRegenerating(false);
    }
  };

  const openCompose = (body: string) => { setComposeBody(body); setIsComposeOpen(true); };

  // ── Loading / not found ───────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12, color: "var(--muted-foreground)" }}>
      <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 14 }}>Loading job details...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFound || !job) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 64, textAlign: "center" }}>
      <Sparkles style={{ width: 40, height: 40, color: "var(--border)" }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)" }}>Job not found</p>
      <button onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 8, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", cursor: "pointer", fontSize: 13 }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Dashboard
      </button>
    </div>
  );

  const templates = job.generatedTemplates ?? {};
  const availableTabs = Object.entries(templates)
    .filter(([, v]) => v && !v.startsWith("[Generation failed"))
    .map(([key]) => ({ key, ...PLATFORM_META[key] ?? { label: key, icon: "📄" } }));

  const templateText = templates[templateTab] ?? "";
  const isEmail      = templateTab === "coldEmail";
  const isEditing    = editingKey === templateTab;

  return (
    <>
      {/* ── Page wrapper ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Breadcrumb / Back ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
              borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
              background: "none", color: "var(--muted-foreground)", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <ArrowLeft style={{ width: 13, height: 13 }} />
            All Jobs
          </button>
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.4 }}>/</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>{job.role}</span>
        </div>

        {/* ── Hero card ── */}
        <div style={{
          ...cardStyle,
          padding: "24px 28px",
          background: isDark
            ? "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(0,0,0,0) 100%)"
            : "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(255,255,255,0) 100%)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              {/* Badges row */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, padding: "3px 12px", borderRadius: 50, fontWeight: 700,
                  background: getScoreBg(job.matchScore, isDark),
                  color: getScoreColor(job.matchScore),
                  border: `1px solid ${getScoreColor(job.matchScore)}33`,
                }}>
                  {job.matchScore}% Fit
                </span>
                <span style={{ ...getStatusStyle(job.status), padding: "3px 12px", borderRadius: 50, fontSize: 11, fontWeight: 600 }}>
                  {job.status}
                </span>
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", margin: "0 0 8px" }}>
                {job.role}
              </h1>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
                Company: <strong style={{ color: "var(--foreground)" }}>{job.company}</strong>
                {job.contactName && <> · Recruiter: <strong style={{ color: "var(--foreground)" }}>{job.contactName}</strong></>}
                {job.contactEmail && <> · <Mail style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} /><span>{job.contactEmail}</span></>}
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6, margin: "6px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar style={{ width: 11, height: 11 }} />
                Added {fmtDate(job.postedDate)}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: regenerating ? "not-allowed" : "pointer",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                  background: "none", color: "var(--muted-foreground)", opacity: regenerating ? 0.6 : 1,
                }}
              >
                {regenerating ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 12, height: 12 }} />}
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "#fecaca"}`,
                  background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2", color: "#ef4444",
                }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
                Delete
              </button>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 16 }}>
            <Tag style={{ width: 12, height: 12, color: "var(--muted-foreground)", marginTop: 3 }} />
            {job.tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 50,
                background: "var(--input)", color: "var(--muted-foreground)", border: "1px solid var(--border)",
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* ── Main Tab Bar ── */}
        <div style={{
          display: "flex", gap: 0,
          borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
        }}>
          {(["templates", "details"] as const).map(t => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              style={{
                padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "none", border: "none",
                borderBottom: mainTab === t ? "2px solid var(--foreground)" : "2px solid transparent",
                color: mainTab === t ? "var(--foreground)" : "var(--muted-foreground)",
                marginBottom: -2,
                transition: "all 0.18s",
              }}
            >
              {t === "templates" ? "🤖 AI Templates" : "📋 Job Details"}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── AI Templates tab ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {mainTab === "templates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Platform sub-tabs */}
            <div style={{
              display: "flex", gap: 0, flexWrap: "wrap",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
              marginBottom: 20,
            }}>
              {availableTabs.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "10px 0", opacity: 0.7 }}>
                  No templates generated yet
                </span>
              ) : availableTabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTemplateTab(t.key); setEditingKey(null); }}
                  style={{
                    padding: "9px 18px 11px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", background: "none", border: "none",
                    borderBottom: templateTab === t.key ? "2px solid var(--foreground)" : "2px solid transparent",
                    color: templateTab === t.key ? "var(--foreground)" : "var(--muted-foreground)",
                    marginBottom: -1, whiteSpace: "nowrap", transition: "all 0.15s",
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Template content area */}
            {!templateText ? (
              <div style={{
                ...cardStyle, padding: 48, textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minHeight: 280, justifyContent: "center",
              }}>
                <Sparkles style={{ width: 32, height: 32, color: "var(--border)" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--muted-foreground)", margin: 0 }}>Template not generated</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.7, margin: 0 }}>Click Regenerate to build all outreach scripts.</p>
                <button onClick={handleRegenerate} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Regenerate All
                </button>
              </div>
            ) : (
              <div style={{
                ...cardStyle,
                padding: 24, display: "flex", flexDirection: "column", gap: 16,
                border: `1px solid ${isEditing ? (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") : "var(--border)"}`,
                transition: "border-color 0.2s",
              }}>
                {/* Toolbar row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--muted-foreground)", fontFamily: "monospace" }}>
                    {isEditing ? "✏️ Editing" : "Ready for outreach"}
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!isEditing ? (
                      <button
                        onClick={() => startEditing(templateTab, templateText)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                          borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                          background: "transparent", color: "var(--muted-foreground)",
                        }}
                      >
                        <Pencil style={{ width: 11, height: 11 }} />
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cancelEditing}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`, background: "transparent", color: "var(--muted-foreground)" }}
                        >
                          <X style={{ width: 11, height: 11 }} /> Cancel
                        </button>
                        <button
                          onClick={saveEditing}
                          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 16px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: "var(--primary)", color: "var(--primary-foreground)" }}
                        >
                          <Check style={{ width: 11, height: 11 }} /> Save
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%", minHeight: 420, boxSizing: "border-box",
                      background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                      borderRadius: 8, padding: "16px",
                      outline: "none", resize: "vertical",
                      fontFamily: "inherit", fontSize: 13, lineHeight: 1.75,
                      color: "var(--foreground)",
                    }}
                  />
                ) : (
                  <pre style={{
                    fontSize: 13, color: "var(--foreground)", fontFamily: "inherit",
                    whiteSpace: "pre-wrap", lineHeight: 1.75, margin: 0,
                    minHeight: 200,
                  }}>
                    {templateText}
                  </pre>
                )}

                {/* Footer actions */}
                {!isEditing && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    paddingTop: 16, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
                    flexWrap: "wrap", gap: 10,
                  }}>
                  {/* Copy button */}
                    <button
                      onClick={() => handleCopy(templateText)}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                        borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: copied ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : "transparent",
                        color: copied ? (isDark ? "#4ade80" : "#16a34a") : "var(--muted-foreground)",
                        border: `1px solid ${copied ? (isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)")}`,
                        transition: "all 0.2s",
                      }}
                    >
                      {copied ? <><Check style={{ width: 13, height: 13 }} /><span>Copied!</span></> : <><Copy style={{ width: 13, height: 13 }} /><span>Copy</span></>}
                    </button>

                    {/* Cold email action buttons */}
                    {isEmail && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {/* View Thread — shows only when status is Sent and we have a to-email */}
                        {job.status === "Sent" && job.contactEmail && (
                          <button
                            onClick={() => setIsThreadOpen(true)}
                            style={{
                              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
                              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                              border: `1px solid ${isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)"}`,
                              background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                              color: isDark ? "#818cf8" : "#6366f1",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.12)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)"; }}
                          >
                            💬 View Thread
                          </button>
                        )}

                        {/* Send via Zoho */}
                        <button
                          onClick={() => openCompose(templateText)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "9px 24px",
                            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                            border: "none",
                            background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                            color: "#fff",
                            boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                        >
                          <Send style={{ width: 14, height: 14 }} />
                          {job.status === "Sent" ? "Send New Mail" : "Send via Zoho"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* ── Job Details tab ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {mainTab === "details" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>

            {/* Left: original text + notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={cardStyle}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 12px" }}>
                  Original Job Post
                </h3>
                <div style={{
                  background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
                  borderRadius: 10, padding: 16, maxHeight: 320, overflowY: "auto",
                }}>
                  <pre style={{ fontSize: 12, color: "var(--foreground)", opacity: 0.85, whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>
                    {job.originalText}
                  </pre>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Edit3 style={{ width: 13, height: 13, color: "var(--muted-foreground)" }} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1.2, margin: 0 }}>
                    Workspace Notes
                  </h3>
                </div>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add salary ranges, follow-up strategies, interview prep notes..."
                  style={{ ...inputStyle, resize: "none", width: "100%", boxSizing: "border-box" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e  => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <button
                    onClick={handleSaveNotes}
                    style={{ padding: "7px 18px", borderRadius: 7, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Right: metadata + status + delete */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Status changer */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 12px" }}>
                  Outreach State
                </h3>
                <select
                  value={job.status}
                  onChange={e => handleStatusChange(e.target.value as JobPost["status"])}
                  style={{ ...inputStyle, cursor: "pointer", width: "100%" }}
                >
                  {["Draft", "Generated", "Sent", "Interviewing", "Declined"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Tags detail */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 12px" }}>
                  Extracted Tech Tags
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {job.tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 50, background: "var(--input)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{tag}</span>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div style={{
                ...cardStyle,
                border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#fecaca"}`,
                background: isDark ? "rgba(239,68,68,0.03)" : "#fff8f8",
              }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 12px" }}>
                  Danger Zone
                </h3>
                <button
                  onClick={handleDelete}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 0", borderRadius: 8, border: "1px solid #fecaca", background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  <Trash2 style={{ width: 13, height: 13 }} />
                  Delete This Scan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Email Compose Drawer (80% width overlay) ── */}
      <EmailComposeDrawer
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        job={job}
        userEmail={userEmail}
        isDark={isDark}
        initialBody={composeBody}
      />

      {/* ── Email Thread Drawer ── */}
      <EmailThreadDrawer
        isOpen={isThreadOpen}
        onClose={() => setIsThreadOpen(false)}
        jobPostId={job.id}
        jobRole={job.role}
        jobCompany={job.company}
        toEmail={job.contactEmail ?? ""}
        userEmail={userEmail}
        isDark={isDark}
        onNewMail={() => openCompose(templates["coldEmail"] ?? "")}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
