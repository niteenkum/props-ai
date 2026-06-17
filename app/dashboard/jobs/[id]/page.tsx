"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Check, Copy, Pencil, X, Send, Sparkles, Edit3,
  Trash2, Mail, Calendar, Tag, RefreshCw, Loader2, Zap,
  Reply, ChevronDown, ChevronUp, Plus, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../components/theme-provider";
import { useProfile } from "../../../hooks/useProfile";
import { useJobScanner } from "../../../hooks/useJobScanner";
import {
  getJobByIdAction,
  updateJobPostAction,
  deleteJobPostAction,
} from "../../../actions/db-actions";
import { analyzeAndGenerateAction } from "../../../actions/ai-actions";
import {
  getEmailThreadForJobAction,
  sendReplyEmailAction,
  type ThreadMessage,
} from "../../../actions/mail-actions";
import { cardStyle, inputStyle, labelStyle } from "../../styles";
import type { JobPost } from "../../../utils/db";
import EmailComposeDrawer from "../../EmailComposeDrawer";
import JobDrawer from "../../new/JobDrawer";
import ScheduleCallModal from "../../../components/ScheduleCallModal";
import { getJobFollowUpsAction, type FollowUpWithJob } from "../../../actions/calendar-actions";

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
  const { profile }            = useProfile(userEmail);

  // ─ Data ─────────────────────────────────────────────────────────────────────
  const [job,       setJob]       = useState<JobPost | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  // ─ Tabs ──────────────────────────────────────────────────────────────────────
  const [mainTab,     setMainTab]     = useState<"thread" | "templates" | "details">("thread");
  const [templateTab, setTemplateTab] = useState<string>("coldEmail");

  // ─ Email thread (inline tab) ──────────────────────────────────────────────────
  const [thread,       setThread]      = useState<ThreadMessage[]>([]);
  const [threadLoading,setThreadLoading] = useState(false);
  const [expandedIds,  setExpandedIds] = useState<Set<string>>(new Set());
  const [showReply,    setShowReply]   = useState(false);
  const [replyBody,    setReplyBody]   = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyState,   setReplyState]  = useState<
    null | { status: "success"; sentAt: string } | { status: "error"; message: string }
  >(null);
  const replyRef  = useRef<HTMLTextAreaElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);

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

  // ─ Book a Call modal ────────────────────────────────────────────────────────
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [jobFollowUps, setJobFollowUps]       = useState<FollowUpWithJob[]>([]);

  // ─ Job scanner (reuses the same drawer as New Scan page) ──────────────────────
  const scanner = useJobScanner(userEmail, profile);

  // ─ Load job ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || !jobId) return;
    getJobByIdAction(jobId).then(async j => {
      if (!j) { setNotFound(true); setLoading(false); return; }
      setJob(j);
      setNotes(j.notes ?? "");
      // Load existing follow-ups for this job
      getJobFollowUpsAction(userEmail, j.id).then(setJobFollowUps).catch(() => {});
      // Pre-load the job text into scanner so drawer can re-analyze it
      scanner.setPasteText(j.originalText);
      // auto-select first available template tab
      const tmpl = j.generatedTemplates ?? {};
      const first = Object.entries(tmpl).find(([, v]) => v && !v.startsWith("[Generation failed"))?.[0];
      setTemplateTab(first ?? "coldEmail");
      // Load unified thread (sent + received) and decide default tab
      const { messages } = await getEmailThreadForJobAction(userEmail, j.id);
      setThread(messages);
      if (messages.length > 0) {
        // Expand the latest message
        setExpandedIds(new Set([messages[messages.length - 1].id]));
        setMainTab("thread");
      } else {
        setMainTab("templates");
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, jobId]);

  // ─ Reload thread (unified: sent + received from Zoho) ─────────────────────────
  const loadThread = async (jobPostId: string) => {
    setThreadLoading(true);
    const { messages } = await getEmailThreadForJobAction(userEmail, jobPostId);
    setThread(messages);
    if (messages.length > 0) setExpandedIds(new Set([messages[messages.length - 1].id]));
    setThreadLoading(false);
  };

  // Reply toggle effects
  useEffect(() => {
    if (showReply) {
      setTimeout(() => replyRef.current?.focus(), 80);
      setTimeout(() => threadBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    }
  }, [showReply]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSendReply = async () => {
    if (!replyBody.trim() || !thread.length || !job) return;
    setReplySending(true);
    setReplyState(null);
    try {
      // Find the last message to reply to — prefer last sent message for inReplyTo
      const lastSent = [...thread].reverse().find(m => m.direction === "sent");
      const lastMsg = thread[thread.length - 1]; // most recent overall
      // Reply to whoever sent us the latest received message, or the last "to" from our sent
      const replyToEmail = lastMsg.direction === "received" ? lastMsg.fromEmail : lastMsg.toEmail;
      const subject = lastMsg.subject;
      const inReplyToId = lastSent?.zohoMsgId ?? "";

      const res = await sendReplyEmailAction(
        userEmail,
        job.id,
        replyToEmail,
        subject,
        replyBody.trim(),
        inReplyToId,
      );
      if (res.success) {
        setReplyState({ status: "success", sentAt: res.sentAt! });
        setReplyBody("");
        setShowReply(false);
        await loadThread(job.id);
      } else {
        setReplyState({ status: "error", message: res.error ?? "Unknown error" });
      }
    } catch (err: any) {
      setReplyState({ status: "error", message: err?.message ?? "Unexpected error" });
    } finally {
      setReplySending(false);
    }
  };

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

  // ─ Open the ThePitchly Generator drawer for this existing job ─────────────────────
  const handleOpenGeneratorDrawer = () => {
    if (!job) return;
    // Always ensure scanner has the job text (needed for proposal generation)
    scanner.setPasteText(job.originalText);

    // Cast to Prisma-enriched type (matchedSkills etc come from DB but not in local JobPost interface)
    const richJob = job as any;
    const hasStoredAnalysis = richJob.matchScore > 0 && (
      (richJob.matchedSkills?.length > 0) ||
      (richJob.matchExplanation) ||
      richJob.contactEmail ||
      richJob.contactPhone
    );

    if (hasStoredAnalysis) {
      // ✅ Use stored data → skip AI re-analysis, jump straight to analysis review
      const oldCc = richJob.tags?.find((t: string) => t.startsWith("cc:"));
      const oldBcc = richJob.tags?.find((t: string) => t.startsWith("bcc:"));

      scanner.handleOpenWithStoredData({
        score:         richJob.matchScore ?? 0,
        role:          richJob.role ?? "Unknown",
        company:       richJob.company ?? "Not specified",
        contactEmail:  richJob.contactEmail ?? "",
        contactCc:     oldCc ? oldCc.slice("cc:".length) : "",
        contactBcc:    oldBcc ? oldBcc.slice("bcc:".length) : "",
        contactPhone:  richJob.contactPhone ?? "",
        explanation:   richJob.matchExplanation ?? richJob.parsedSummary ?? "",
        matchedSkills: richJob.matchedSkills ?? [],
        missingSkills: richJob.missingSkills ?? [],
      });
    } else {
      // Fallback: run fresh AI analysis (for manually-created jobs without stored analysis)
      scanner.handleOpenDrawer();
    }
  };

  // ─ Save generated proposals back to THIS job (not create new) ─────────────────
  const handleSaveGeneratedToJob = async () => {
    if (!job || !scanner.generatedProposals || Object.keys(scanner.generatedProposals).length === 0) {
      scanner.handleCloseDrawer();
      return;
    }
    try {
      // 1. Start with existing tags, filter out existing cc and bcc tags
      let tags = (job.tags ?? []).filter(t => !t.startsWith("cc:") && !t.startsWith("bcc:"));
      
      // 2. If we have newly parsed data from scanner, append new cc/bcc tags and update contact info
      let contactEmail = job.contactEmail;
      let contactName = job.contactName;
      if (scanner.parsedJobData) {
        contactEmail = scanner.parsedJobData.contactEmail || job.contactEmail;
        contactName = scanner.parsedJobData.contactName || job.contactName;
        if (scanner.parsedJobData.contactCc) {
          tags.push(`cc:${scanner.parsedJobData.contactCc}`);
        }
        if (scanner.parsedJobData.contactBcc) {
          tags.push(`bcc:${scanner.parsedJobData.contactBcc}`);
        }
      } else {
        // Fallback: if we didn't have parsedJobData, but had cc/bcc in job.tags, keep them
        const oldCc = job.tags?.find(t => t.startsWith("cc:"));
        const oldBcc = job.tags?.find(t => t.startsWith("bcc:"));
        if (oldCc) tags.push(oldCc);
        if (oldBcc) tags.push(oldBcc);
      }

      const updated = {
        ...job,
        contactEmail,
        contactName,
        tags,
        generatedTemplates: {
          ...(job.generatedTemplates ?? {}),
          ...scanner.generatedProposals,
        },
      };
      setJob(updated);
      await updateJobPostAction(updated);
      // Switch to templates tab so user can see results
      setMainTab("templates");
      const firstKey = Object.keys(scanner.generatedProposals)[0];
      if (firstKey) setTemplateTab(firstKey);
    } catch (err) {
      console.error("Failed to save proposals to job:", err);
    } finally {
      scanner.handleCloseDrawer();
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
              {/* Contact phone + extracted URLs from AI sync */}
              {(() => {
                const richJob = job as any;
                const phone = richJob.contactPhone as string | undefined;
                const upworkTag = job.tags.find(t => t.startsWith("upwork:"));
                const applyTag  = job.tags.find(t => t.startsWith("apply:"));
                const upworkUrl = upworkTag?.slice("upwork:".length);
                const applyUrl  = applyTag?.slice("apply:".length);
                if (!phone && !upworkUrl && !applyUrl) return null;
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" }}>
                    {phone && (
                      <a href={`tel:${phone}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted-foreground)", textDecoration: "none" }}>
                        📞 {phone}
                      </a>
                    )}
                    {upworkUrl && (
                      <a href={upworkUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50,
                        background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4", color: isDark ? "#4ade80" : "#16a34a",
                        border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`, textDecoration: "none",
                      }}>
                        🔵 View Upwork Job
                      </a>
                    )}
                    {applyUrl && (
                      <a href={applyUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50,
                        background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)", color: isDark ? "#818cf8" : "#6366f1",
                        border: `1px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.3)"}`, textDecoration: "none",
                      }}>
                        🔗 Apply Now
                      </a>
                    )}
                  </div>
                );
              })()}
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.6, margin: "6px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar style={{ width: 11, height: 11 }} />
                Added {fmtDate(job.postedDate)}
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Primary: Open ThePitchly Generator Drawer */}
              <button
                onClick={handleOpenGeneratorDrawer}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
                  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <Zap style={{ width: 12, height: 12 }} />
                Generate Proposals
              </button>
              {/* Book a Call — shows status if already scheduled */}
              {(() => {
                const pendingCall = jobFollowUps.find(f => f.status === "pending");
                if (pendingCall) {
                  // Already scheduled — show the booked call info
                  const scheduledAt = new Date(pendingCall.scheduledAt);
                  const timeStr = scheduledAt.toLocaleString("en-IN", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: true,
                  });
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Scheduled badge */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                        borderRadius: 8, fontSize: 11, fontWeight: 700,
                        border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
                        background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                        color: isDark ? "#4ade80" : "#16a34a",
                      }}>
                        ✅ {timeStr}
                      </div>
                      {/* Meet link if available */}
                      {pendingCall.meetLink && (
                        <a
                          href={pendingCall.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                            borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: "none",
                            border: "1px solid rgba(99,102,241,0.3)",
                            background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                            color: isDark ? "#818cf8" : "#6366f1",
                          }}
                        >
                          🎥 Join Meet
                        </a>
                      )}
                      {/* Book another */}
                      <button
                        onClick={() => setIsCallModalOpen(true)}
                        title="Book another call"
                        style={{
                          display: "flex", alignItems: "center", gap: 5, padding: "6px 10px",
                          borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                          background: "transparent", color: "var(--muted-foreground)",
                        }}
                      >
                        + More
                      </button>
                    </div>
                  );
                }
                // No pending call — show Book a Call button
                return (
                  <button
                    onClick={() => setIsCallModalOpen(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                      borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
                      background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                      color: isDark ? "#4ade80" : "#16a34a",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    📞 Book a Call
                  </button>
                );
              })()}
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
          {/* Thread tab — shows count badge */}
          <button
            onClick={() => { setMainTab("thread"); if (job) loadThread(job.id); }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none",
              borderBottom: mainTab === "thread" ? "2px solid var(--foreground)" : "2px solid transparent",
              color: mainTab === "thread" ? "var(--foreground)" : "var(--muted-foreground)",
              marginBottom: -2, transition: "all 0.18s", whiteSpace: "nowrap",
            }}
          >
            💬 Email Thread
            {thread.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 50,
                background: mainTab === "thread"
                  ? (isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)")
                  : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"),
                color: mainTab === "thread" ? (isDark ? "#818cf8" : "#6366f1") : "var(--muted-foreground)",
              }}>
                {thread.length}
              </span>
            )}
          </button>

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
        {/* ── Email Thread tab (inline) ── */}
        {/* ════════════════════════════════════════════════════════════ */}
        {mainTab === "thread" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Thread header bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Reply style={{ width: 15, height: 15, color: isDark ? "#818cf8" : "#6366f1" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                    Email Thread
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                    {thread.length > 0
                      ? (() => {
                          const sentCount = thread.filter(m => m.direction === "sent").length;
                          const recvCount = thread.filter(m => m.direction === "received").length;
                          const lastMsg = thread[thread.length - 1];
                          return `${thread.length} message${thread.length > 1 ? "s" : ""} (${sentCount} sent${recvCount > 0 ? `, ${recvCount} received` : ""}) · Last ${lastMsg.direction === "received" ? "received" : "sent"} ${fmtRelative(lastMsg.sentAt)}`;
                        })()
                      : "No messages sent yet"}
                  </p>
                </div>
              </div>
              {/* Compose new email */}
              <button
                onClick={() => openCompose(templates["coldEmail"] ?? "")}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
                  borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                  color: "#fff", boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                <Plus style={{ width: 13, height: 13 }} />
                {thread.length > 0 ? "New Mail" : "Send First Email"}
              </button>
            </div>

            {/* Thread content card */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>

              {/* Loading skeleton */}
              {threadLoading && (
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[1,2].map(i => (
                    <div key={i} style={{
                      height: 80, borderRadius: 10,
                      background: isDark ? "rgba(255,255,255,0.03)" : "#f5f5f5",
                      animation: "threadPulse 1.5s ease infinite",
                    }} />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!threadLoading && thread.length === 0 && (
                <div style={{
                  textAlign: "center", padding: "64px 32px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Mail style={{ width: 24, height: 24, color: isDark ? "#818cf8" : "#6366f1", opacity: 0.5 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>No emails sent yet</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, opacity: 0.7 }}>
                      Send your first email using the button above — it will appear here.
                    </p>
                  </div>
                  <button
                    onClick={() => openCompose(templates["coldEmail"] ?? "")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
                      borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none",
                      background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                      color: "#fff", cursor: "pointer", boxShadow: "0 2px 14px rgba(99,102,241,0.35)",
                    }}
                  >
                    <Send style={{ width: 14, height: 14 }} />
                    Compose & Send Email
                  </button>
                </div>
              )}

              {/* Thread messages — Chat style */}
              {!threadLoading && thread.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>

                  {/* Chat area */}
                  <div style={{
                    padding: "24px 24px 16px",
                    display: "flex", flexDirection: "column", gap: 20,
                    maxHeight: 600, overflowY: "auto",
                    background: isDark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.015)",
                  }}>
                    {/* Date divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                      <div style={{ height: 1, flex: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2,
                        color: "var(--muted-foreground)", whiteSpace: "nowrap",
                        padding: "3px 12px", borderRadius: 50,
                        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                      }}>
                        {thread.length} message{thread.length > 1 ? "s" : ""} in thread
                      </span>
                      <div style={{ height: 1, flex: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                    </div>

                    {thread.map((msg) => {
                      const isSent = msg.direction === "sent";
                      const isExpanded = expandedIds.has(msg.id);
                      // Truncate body for collapsed view
                      const previewText = msg.body.length > 120 ? msg.body.slice(0, 120) + "…" : msg.body;
                      const isLong = msg.body.length > 120;

                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            flexDirection: isSent ? "row-reverse" : "row",
                            alignItems: "flex-end",
                            gap: 10,
                            maxWidth: "85%",
                            alignSelf: isSent ? "flex-end" : "flex-start",
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                            background: isSent
                              ? (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)")
                              : (isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.12)"),
                            border: `1.5px solid ${isSent
                              ? (isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.35)")
                              : (isDark ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.35)")}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800,
                            color: isSent
                              ? (isDark ? "#a5b4fc" : "#6366f1")
                              : (isDark ? "#86efac" : "#16a34a"),
                          }}>
                            {msg.fromEmail.split("@")[0].slice(0, 2).toUpperCase()}
                          </div>

                          {/* Bubble */}
                          <div
                            onClick={() => isLong && toggleExpand(msg.id)}
                            style={{
                              cursor: isLong ? "pointer" : "default",
                              padding: "12px 16px",
                              borderRadius: isSent ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                              background: isSent
                                ? (isDark
                                    ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.12))"
                                    : "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05))")
                                : (isDark ? "rgba(255,255,255,0.05)" : "#ffffff"),
                              border: `1px solid ${isSent
                                ? (isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)")
                                : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}`,
                              boxShadow: isSent
                                ? "none"
                                : (isDark ? "none" : "0 1px 4px rgba(0,0,0,0.04)"),
                              maxWidth: "100%",
                              minWidth: 120,
                              position: "relative" as const,
                            }}
                          >
                            {/* Sender name + badge */}
                            <div style={{
                              display: "flex", alignItems: "center", gap: 7,
                              marginBottom: 6,
                            }}>
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: isSent
                                  ? (isDark ? "#a5b4fc" : "#6366f1")
                                  : (isDark ? "#86efac" : "#16a34a"),
                              }}>
                                {isSent ? "You" : (msg.fromName || msg.fromEmail)}
                              </span>
                              {!isSent && (
                                <span style={{
                                  fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 50,
                                  background: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)",
                                  color: isDark ? "#4ade80" : "#16a34a",
                                  border: `1px solid ${isDark ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.2)"}`,
                                  textTransform: "uppercase" as const, letterSpacing: 0.5,
                                }}>Inbox</span>
                              )}
                            </div>

                            {/* Subject line (subtle) */}
                            <p style={{
                              fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)",
                              margin: "0 0 8px", opacity: 0.65, letterSpacing: 0.3,
                            }}>
                              {msg.subject}
                            </p>

                            {/* Body */}
                            <pre style={{
                              fontSize: 13, color: "var(--foreground)", fontFamily: "inherit",
                              whiteSpace: "pre-wrap", lineHeight: 1.65, margin: 0,
                              wordBreak: "break-word" as const,
                            }}>
                              {isExpanded || !isLong ? msg.body : previewText}
                            </pre>

                            {/* "Show more" indicator for long messages */}
                            {isLong && !isExpanded && (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: isSent ? (isDark ? "#a5b4fc" : "#6366f1") : (isDark ? "#86efac" : "#16a34a"),
                                cursor: "pointer", marginTop: 4, display: "inline-block",
                              }}>
                                Show more ↓
                              </span>
                            )}
                            {isLong && isExpanded && (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                color: isSent ? (isDark ? "#a5b4fc" : "#6366f1") : (isDark ? "#86efac" : "#16a34a"),
                                cursor: "pointer", marginTop: 4, display: "inline-block",
                              }}>
                                Show less ↑
                              </span>
                            )}

                            {/* Footer: time + delivery badge */}
                            <div style={{
                              display: "flex", alignItems: "center", gap: 6,
                              marginTop: 8, justifyContent: isSent ? "flex-end" : "flex-start",
                            }}>
                              <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>
                                {fmtTime(msg.sentAt)}
                              </span>
                              {isSent && msg.zohoMsgId && (
                                <Check style={{ width: 12, height: 12, color: isDark ? "#818cf8" : "#6366f1", strokeWidth: 2.5 }} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Reply success/error notices */}
                    {replyState?.status === "success" && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 16px", borderRadius: 10, alignSelf: "center",
                        background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
                        border: `1px solid ${isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0"}`,
                      }}>
                        <CheckCircle2 style={{ width: 14, height: 14, color: "#22c55e", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#4ade80" : "#16a34a" }}>
                          Reply sent at {new Date(replyState.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        </span>
                      </div>
                    )}
                    {replyState?.status === "error" && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 16px", borderRadius: 10, alignSelf: "center",
                        background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
                        border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fecaca"}`,
                      }}>
                        <AlertCircle style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#ef4444" }}>{replyState.message}</span>
                      </div>
                    )}

                    <div ref={threadBottomRef} />
                  </div>

                  {/* Reply compose or reply bar */}
                  {showReply ? (
                    <div style={{
                      padding: "16px 24px",
                      borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                      background: isDark ? "rgba(99,102,241,0.03)" : "rgba(99,102,241,0.02)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <Reply style={{ width: 12, height: 12, color: isDark ? "#818cf8" : "#6366f1" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#818cf8" : "#6366f1" }}>
                          Replying to {(() => {
                            const lastMsg = thread[thread.length - 1];
                            return lastMsg?.direction === "received" ? lastMsg.fromEmail : lastMsg?.toEmail ?? "";
                          })()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                        <textarea
                          ref={replyRef}
                          rows={3}
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          placeholder="Write your reply…"
                          style={{
                            flex: 1, boxSizing: "border-box" as const,
                            padding: "10px 14px", borderRadius: 12, fontSize: 13,
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                            background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                            color: "var(--foreground)", outline: "none",
                            fontFamily: "inherit", lineHeight: 1.6, resize: "vertical" as const, minHeight: 80,
                          }}
                        />
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                          <button
                            onClick={handleSendReply}
                            disabled={!replyBody.trim() || replySending}
                            style={{
                              display: "flex", alignItems: "center", gap: 7, padding: "10px 20px",
                              borderRadius: 10, fontSize: 12, fontWeight: 700, border: "none",
                              cursor: replyBody.trim() && !replySending ? "pointer" : "not-allowed",
                              background: replyBody.trim() && !replySending
                                ? "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)"
                                : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                              color: replyBody.trim() && !replySending ? "#fff" : "var(--muted-foreground)",
                              boxShadow: replyBody.trim() && !replySending ? "0 2px 12px rgba(99,102,241,0.35)" : "none",
                              transition: "all 0.2s", whiteSpace: "nowrap" as const,
                            }}
                          >
                            <Send style={{ width: 12, height: 12 }} />
                            {replySending ? "Sending…" : "Send"}
                          </button>
                          <button
                            onClick={() => { setShowReply(false); setReplyState(null); }}
                            style={{
                              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                              background: "none", color: "var(--muted-foreground)", cursor: "pointer",
                              textAlign: "center" as const,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: "12px 24px",
                      borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                      display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10,
                      background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)",
                    }}>
                      <button
                        onClick={() => { setShowReply(true); setReplyState(null); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 7, padding: "9px 22px",
                          borderRadius: 9, fontSize: 12, fontWeight: 700, border: "none",
                          cursor: "pointer",
                          background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
                          color: "#fff",
                          boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.87"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                      >
                        <Reply style={{ width: 13, height: 13 }} />
                        Reply in Thread
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <style>{`
              @keyframes threadPulse {
                0%, 100% { opacity: 0.4; }
                50%       { opacity: 0.7; }
              }
            `}</style>
          </div>
        )}

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
                        {/* View Thread — jumps to thread tab */}
                        {thread.length > 0 && (
                          <button
                            onClick={() => { setMainTab("thread"); }}
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
                            💬 View Thread ({thread.length})
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
        onClose={async () => {
          setIsComposeOpen(false);
          // Reload unified thread (sent + received) after compose closes
          if (job) {
            const { messages } = await getEmailThreadForJobAction(userEmail, job.id);
            setThread(messages);
            if (messages.length > 0) setExpandedIds(new Set([messages[messages.length - 1].id]));
          }
        }}
        job={job}
        userEmail={userEmail}
        isDark={isDark}
        initialBody={composeBody}
      />

      {/* ── ThePitchly Generator Drawer (same as New Scan page) ── */}
      <JobDrawer
        isOpen={scanner.isDrawerOpen}
        step={scanner.drawerStep}
        isDark={isDark}
        aiCandidacy={scanner.aiCandidacy}
        isCandidacyLoading={scanner.isCandidacyLoading}
        onContinueToTemplates={scanner.handleContinueToTemplates}
        duplicateState={scanner.duplicateState}
        onGoToExisting={scanner.handleGoToExistingJob}
        onContinueDespite={scanner.handleContinueDespiteDuplicate}
        onClose={scanner.handleCloseDrawer}
        selectedPlatforms={scanner.selectedPlatforms}
        onTogglePlatform={scanner.togglePlatform}
        selectedModel={scanner.selectedModel}
        availableModels={scanner.availableModels}
        onSelectModel={scanner.setSelectedModel}
        generationError={scanner.generationError}
        onGenerateProposals={scanner.handleGenerateProposals}
        generatedProposals={scanner.generatedProposals}
        parsedJobData={scanner.parsedJobData}
        activeResultTab={scanner.activeResultTab}
        onSetActiveTab={scanner.setActiveResultTab}
        onEditProposal={scanner.handleEditProposal}
        isSavingJob={false}
        onSaveAndClose={handleSaveGeneratedToJob}
        onRegenerate={handleOpenGeneratorDrawer}
      />

      {/* ── Schedule Call Modal (Google Meet via Corsair Calendar) ── */}
      <ScheduleCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        isDark={isDark}
        userEmail={userEmail}
        jobId={job.id}
        jobRole={job.role}
        jobCompany={job.company}
        defaultAttendeeEmail={job.contactEmail ?? ""}
        onBooked={async (meetLink, gcalEventUrl) => {
          console.log("[JobDetail] ✅ Call booked:", meetLink, gcalEventUrl);
          // Refresh follow-ups so the button flips to scheduled status immediately
          const updated = await getJobFollowUpsAction(userEmail, job.id);
          setJobFollowUps(updated);
        }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
