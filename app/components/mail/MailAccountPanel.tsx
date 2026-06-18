"use client";

// ─── MailAccountPanel ─────────────────────────────────────────────────────────
// Revamped: Category tabs, paginated inbox, premium UI, send form.

import React, { useState, useCallback, useRef } from "react";
import {
  Mail, Link2, Unlink, RefreshCw, Send, Inbox, CheckCircle2, AlertCircle,
  Loader2, ExternalLink, ShieldCheck, X, Star, Tag, Users, Briefcase,
  ChevronLeft, ChevronRight, Clock, Eye, EyeOff, Zap, Filter,
  Bold, Italic, Underline, List, AlignLeft, Paperclip, Smile,
  Maximize2, Minimize2, ChevronDown, AtSign, Trash2, FileText,
} from "lucide-react";
import { useMailAccount } from "../../hooks/useMailAccount";
import {
  getEmailThreadAction,
  sendThreadReplyAction,
  fetchGmailThreadAction,
  sendGmailNewAction,
  gmailMarkAsReadAction,
  gmailToggleStarAction,
  gmailTrashAction,
  gmailSearchAction,
  zohoToggleStarAction,
  type MailMessage,
  type ThreadMessage,
  type GmailSearchFilters,
  type GmailSearchResult,
} from "../../actions/mail-actions";

// ─── Provider Badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: "zoho" | "gmail" | string }) {
  const isGmail = provider === "gmail";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 7px", borderRadius: 20, fontSize: 9.5, fontWeight: 700,
      letterSpacing: 0.3, flexShrink: 0,
      background: isGmail ? "rgba(234,67,53,0.09)" : "rgba(245,158,11,0.09)",
      border:     `1px solid ${isGmail ? "rgba(234,67,53,0.28)" : "rgba(245,158,11,0.28)"}`,
      color:      isGmail ? "#ea4335" : "#d97706",
    }}>
      {isGmail ? "Gmail" : "Zoho"}
    </span>
  );
}

// ─── Gmail Advanced Search Panel ─────────────────────────────────────────────
function GmailSearchPanel({
  userEmail,
  isDark,
  onClose,
}: {
  userEmail: string;
  isDark: boolean;
  onClose: () => void;
}) {
  const [from,       setFrom]       = useState("");
  const [subject,    setSubject]    = useState("");
  const [rawQuery,   setRawQuery]   = useState("");
  const [dateAfter,  setDateAfter]  = useState("");
  const [dateBefore, setDateBefore] = useState("");
  const [hasAttach,  setHasAttach]  = useState(false);
  const [isUnread,   setIsUnread]   = useState<boolean | undefined>(undefined);
  const [isStarred,  setIsStarred]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [results,    setResults]    = useState<GmailSearchResult[] | null>(null);
  const [queryUsed,  setQueryUsed]  = useState("");
  const [error,      setError]      = useState("");
  const [page,       setPage]       = useState(1);
  const RESULTS_PER_PAGE = 8;

  // Live query preview
  const buildPreview = () => {
    const p: string[] = [];
    if (from.trim())         p.push(`from:${from.trim()}`);
    if (subject.trim())      p.push(`subject:${subject.trim()}`);
    if (hasAttach)           p.push("has:attachment");
    if (isUnread === true)   p.push("is:unread");
    if (isUnread === false)  p.push("is:read");
    if (isStarred)           p.push("is:starred");
    if (dateAfter.trim())    p.push(`after:${dateAfter}`);
    if (dateBefore.trim())   p.push(`before:${dateBefore}`);
    if (rawQuery.trim())     p.push(rawQuery.trim());
    return p.join(" ") || "in:inbox";
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setResults(null);
    setPage(1);
    const filters: GmailSearchFilters = {
      from: from || undefined,
      subject: subject || undefined,
      hasAttachment: hasAttach || undefined,
      isUnread,
      isStarred: isStarred || undefined,
      dateAfter: dateAfter || undefined,
      dateBefore: dateBefore || undefined,
      rawQuery: rawQuery || undefined,
    };
    const res = await gmailSearchAction(userEmail, filters);
    setLoading(false);
    if (!res.success) {
      setError(res.error ?? "Search failed.");
    } else {
      setResults(res.results ?? []);
      setQueryUsed(res.query ?? "");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const,
    padding: "7px 10px", borderRadius: 8, fontSize: 12,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
    color: "var(--foreground)", outline: "none", fontFamily: "inherit",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4, display: "block",
  };
  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600,
    cursor: "pointer", border: active
      ? `1.5px solid ${isDark ? "#818cf8" : "#6366f1"}`
      : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
    background: active
      ? (isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.09)")
      : "transparent",
    color: active ? (isDark ? "#818cf8" : "#6366f1") : "var(--muted-foreground)",
    transition: "all 0.15s",
    userSelect: "none" as const,
  });

  const pageItems = results ? results.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE) : [];
  const totalPages = results ? Math.ceil(results.length / RESULTS_PER_PAGE) : 0;

  return (
    <div style={{
      marginBottom: 18,
      border: `1.5px solid ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.18)"}`,
      borderRadius: 14,
      overflow: "hidden",
      background: isDark ? "rgba(15,15,30,0.7)" : "#f8f8ff",
      boxShadow: "0 4px 24px rgba(99,102,241,0.09)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 16px",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
        background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)" }}>Gmail Advanced Search</span>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 50,
            background: isDark ? "rgba(234,67,53,0.18)" : "rgba(234,67,53,0.09)",
            color: isDark ? "#f87171" : "#dc2626",
            border: `1px solid ${isDark ? "rgba(234,67,53,0.3)" : "rgba(234,67,53,0.2)"}`,
          }}>via Corsair</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", display: "flex", padding: 4, borderRadius: 6,
          }}
        ><X size={14} /></button>
      </div>

      {/* Filters */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Row 1: From + Subject */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>From</label>
            <input
              style={inputStyle} value={from} placeholder="user@gmail.com"
              onChange={e => setFrom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div>
            <label style={labelStyle}>Subject contains</label>
            <input
              style={inputStyle} value={subject} placeholder="invoice, proposal…"
              onChange={e => setSubject(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
        </div>

        {/* Row 2: Date range */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>After date</label>
            <input type="date" style={inputStyle} value={dateAfter} onChange={e => setDateAfter(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Before date</label>
            <input type="date" style={inputStyle} value={dateBefore} onChange={e => setDateBefore(e.target.value)} />
          </div>
        </div>

        {/* Row 3: Toggle chips */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.06em", alignSelf: "center", marginRight: 2 }}>Filters</span>
          <button style={chipStyle(isUnread === true)} onClick={() => setIsUnread(isUnread === true ? undefined : true)}>📬 Unread</button>
          <button style={chipStyle(isUnread === false)} onClick={() => setIsUnread(isUnread === false ? undefined : false)}>✉️ Read</button>
          <button style={chipStyle(hasAttach)} onClick={() => setHasAttach(!hasAttach)}>📎 Has attachment</button>
          <button style={chipStyle(isStarred)} onClick={() => setIsStarred(!isStarred)}>⭐ Starred</button>
        </div>

        {/* Row 4: Raw query + search button */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Raw query (Gmail syntax)</label>
            <input
              style={inputStyle} value={rawQuery}
              placeholder="e.g. has:attachment larger:5M"
              onChange={e => setRawQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              alignSelf: "flex-end",
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 18px", borderRadius: 9,
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff", fontSize: 12.5, fontWeight: 700,
              border: "none", cursor: loading ? "wait" : "pointer",
              boxShadow: "0 3px 12px rgba(99,102,241,0.35)",
              transition: "opacity 0.15s",
              opacity: loading ? 0.7 : 1,
              whiteSpace: "nowrap" as const,
            }}
          >
            {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <span>🔍</span>}
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Query preview */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 8,
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" as const, flexShrink: 0 }}>Gmail q:</span>
          <code style={{
            fontSize: 11, color: isDark ? "#a5b4fc" : "#4f46e5",
            fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
          }}>{buildPreview()}</code>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 12, color: "#ef4444",
          }}>
            <AlertCircle size={13} /> {error}
          </div>
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div style={{
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          padding: "12px 16px",
        }}>
          {/* Results header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--foreground)" }}>
              {results.length === 0 ? "No results found" : `${results.length} result${results.length !== 1 ? "s" : ""} for`}
            </span>
            {queryUsed && (
              <code style={{
                fontSize: 10, color: isDark ? "#818cf8" : "#6366f1",
                background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)",
                padding: "2px 7px", borderRadius: 6,
                maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                display: "block",
              }}>{queryUsed}</code>
            )}
          </div>

          {results.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted-foreground)" }}>
              <EyeOff size={28} style={{ margin: "0 auto 8px", opacity: 0.2, display: "block" }} />
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>No emails match your search</p>
              <p style={{ fontSize: 11, margin: 0, opacity: 0.6 }}>Try different filters or a broader query.</p>
            </div>
          )}

          {pageItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pageItems.map((r) => (
                <div key={r.messageId} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "9px 12px", borderRadius: 10,
                  background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
                  transition: "background 0.15s",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, #ea4335, #c5221f)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff",
                  }}>
                    {(r.fromName || r.fromEmail || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: r.isRead ? 500 : 800, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {r.fromName || r.fromEmail.split("@")[0]}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>
                        {new Date(r.receivedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: r.isRead ? 500 : 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 1 }}>
                      {r.subject}
                    </div>
                    {r.snippet && (
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: 2 }}>
                        {r.snippet}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" as const }}>
                      {!r.isRead && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 50, background: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)", color: isDark ? "#818cf8" : "#6366f1" }}>NEW</span>}
                      {r.isStarred && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 50, background: "rgba(245,158,11,0.12)", color: "#d97706" }}>⭐ STARRED</span>}
                      {r.labels.includes("IMPORTANT") && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 50, background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>IMPORTANT</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ background: "none", border: "none", cursor: page === 1 ? "default" : "pointer", opacity: page === 1 ? 0.3 : 1, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}
              ><ChevronLeft size={13} /> Prev</button>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ background: "none", border: "none", cursor: page === totalPages ? "default" : "pointer", opacity: page === totalPages ? 0.3 : 1, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600 }}
              >Next <ChevronRight size={13} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const PAGE_SIZE = 8;

type Category =
  | "all"
  | "unread"
  | "starred"
  | "jobs"
  | "people"
  | "updates"
  | "interview_call"
  | "freelance_opportunity"
  | "remote_opportunity"
  | "rejection"
  | "offer_letter"
  | "general";

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "all",                   label: "All Mail",    icon: <Inbox        size={13} />, desc: "Everything" },
  { id: "unread",                label: "Unread",      icon: <Eye          size={13} />, desc: "Unread only" },
  { id: "starred",               label: "Starred",     icon: <Star         size={13} />, desc: "Marked important" },
  { id: "interview_call",        label: "Interviews",  icon: <Clock        size={13} />, desc: "Interview calls & invites" },
  { id: "freelance_opportunity",  label: "Freelance",   icon: <Zap          size={13} />, desc: "Freelance opportunities" },
  { id: "remote_opportunity",     label: "Remote",      icon: <Link2        size={13} />, desc: "Remote opportunities" },
  { id: "offer_letter",          label: "Offers",      icon: <CheckCircle2 size={13} />, desc: "Offer letters" },
  { id: "rejection",             label: "Rejections",  icon: <X            size={13} />, desc: "Application rejections" },
  { id: "jobs",                  label: "Jobs",        icon: <Briefcase    size={13} />, desc: "Other job updates" },
  { id: "people",                label: "People",      icon: <Users        size={13} />, desc: "Personal updates" },
  { id: "updates",               label: "Updates",     icon: <Tag          size={13} />, desc: "Newsletters & updates" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classifyMessage(msg: MailMessage): Category[] {
  const cats: Category[] = ["all"];
  if (!msg.isRead) cats.push("unread");

  // If AI classification exists in database, map it directly
  if (msg.emailType) {
    cats.push(msg.emailType as Category);
    // Backward compat mapping: if it is interview, freelance, remote, rejection, or offer,
    // we also count it under "jobs" folder
    if (["interview_call", "freelance_opportunity", "remote_opportunity", "rejection", "offer_letter"].includes(msg.emailType)) {
      cats.push("jobs");
    }
    return cats;
  }

  const subjectLower  = (msg.subject  ?? "").toLowerCase();
  const fromLower     = (msg.fromEmail ?? "").toLowerCase();
  const summaryLower  = (msg.summary  ?? "").toLowerCase();

  const jobKeywords   = ["job", "position", "vacancy", "hiring", "role", "opportunity",
                          "career", "offer", "apply", "application", "interview", "recruiter"];
  const updateKeywords = ["notification", "alert", "noreply", "no-reply", "newsletter",
                           "unsubscribe", "invoice", "receipt", "verify", "confirm", "account",
                           "update", "linkedin", "github", "google", "facebook", "twitter"];

  const isJob    = jobKeywords.some(k => subjectLower.includes(k) || summaryLower.includes(k));
  const isUpdate = updateKeywords.some(k => fromLower.includes(k) || subjectLower.includes(k));

  if (isJob)    cats.push("jobs");
  else if (isUpdate) cats.push("updates");
  else          cats.push("people");

  return cats;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function getInitials(name: string, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f59e0b", "#22c55e", "#3b82f6", "#ef4444",
];

function avatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── AvatarBubble ─────────────────────────────────────────────────────────────

function AvatarBubble({ name, email, size = 36 }: { name: string; email: string; size?: number }) {
  const color = avatarColor(email);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}18`, border: `1.5px solid ${color}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color, letterSpacing: -0.5,
    }}>
      {getInitials(name, email)}
    </div>
  );
}

// ─── MessageRow ───────────────────────────────────────────────────────────────

// ─── Email Type Badge ─────────────────────────────────────────────────────────

function getEmailTypeBadge(type?: string, isDark?: boolean) {
  if (!type || type === "general") return null;

  let label = "";
  let bg = "";
  let border = "";
  let color = "";

  switch (type) {
    case "interview_call":
      label = "Interview Call";
      bg = isDark ? "rgba(139, 92, 246, 0.12)" : "rgba(139, 92, 246, 0.08)";
      border = isDark ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.2)";
      color = isDark ? "#c084fc" : "#7c3aed";
      break;
    case "freelance_opportunity":
      label = "Freelance Opp";
      bg = isDark ? "rgba(20, 184, 166, 0.12)" : "rgba(20, 184, 166, 0.08)";
      border = isDark ? "rgba(20, 184, 166, 0.3)" : "rgba(20, 184, 166, 0.2)";
      color = isDark ? "#2dd4bf" : "#0d9488";
      break;
    case "remote_opportunity":
      label = "Remote Opp";
      bg = isDark ? "rgba(59, 130, 246, 0.12)" : "rgba(59, 130, 246, 0.08)";
      border = isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)";
      color = isDark ? "#60a5fa" : "#2563eb";
      break;
    case "rejection":
      label = "Rejection";
      bg = isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)";
      border = isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)";
      color = isDark ? "#f87171" : "#dc2626";
      break;
    case "offer_letter":
      label = "Offer Letter";
      bg = isDark ? "rgba(34, 197, 94, 0.12)" : "rgba(34, 197, 94, 0.08)";
      border = isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.2)";
      color = isDark ? "#4ade80" : "#16a34a";
      break;
  }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700,
      background: bg, border: `1px solid ${border}`, color,
      marginLeft: 6, verticalAlign: "middle", whiteSpace: "nowrap"
    }}>
      {label}
    </span>
  );
}

// ─── MessageRow ───────────────────────────────────────────────────────────────

function MessageRow({
  msg, isDark, isStarred, onToggleStar, onClick, onTrash,
}: {
  msg: MailMessage;
  isDark: boolean;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
  onClick: () => void;
  onTrash?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const color = avatarColor(msg.fromEmail);

  return (
    <div
      style={{
        borderRadius: 12, position: "relative",
        border: `1px solid ${
          !msg.isRead
            ? (isDark ? `${color}30` : `${color}20`)
            : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)")
        }`,
        background: !msg.isRead
          ? (isDark ? `${color}08` : `${color}05`)
          : (isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)"),
        cursor: "pointer",
        transition: "all 0.18s ease",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        setHovered(true);
        (e.currentTarget as HTMLDivElement).style.borderColor = isDark
          ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)";
        (e.currentTarget as HTMLDivElement).style.background = isDark
          ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)";
      }}
      onMouseLeave={e => {
        setHovered(false);
        (e.currentTarget as HTMLDivElement).style.borderColor = !msg.isRead
          ? (isDark ? `${color}30` : `${color}20`)
          : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)");
        (e.currentTarget as HTMLDivElement).style.background = !msg.isRead
          ? (isDark ? `${color}08` : `${color}05`)
          : (isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)");
      }}
    >
      <div
        onClick={onClick}
        style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}
      >
        {/* Avatar */}
        <AvatarBubble name={msg.fromName} email={msg.fromEmail} size={36} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            {/* Left: unread dot + sender name + AI Category badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
              {!msg.isRead && (
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: color, flexShrink: 0,
                }} />
              )}
              <span style={{
                fontSize: 12.5, fontWeight: msg.isRead ? 500 : 700,
                color: "var(--foreground)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 160,
              }}>
                {msg.fromName || msg.fromEmail.split("@")[0]}
              </span>
              {getEmailTypeBadge(msg.emailType, isDark)}
            </div>

            {/* Right: time → on hover shows icon actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {/* Time — hide on hover so icons have space */}
              {!hovered && (
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                  {fmtTime(msg.receivedAt)}
                </span>
              )}
              {/* Provider Badge — always visible */}
              {msg.provider && <ProviderBadge provider={msg.provider} />}
              {/* Trash icon — only for Gmail, only on hover */}
              {hovered && onTrash && msg.provider === "gmail" && (
                <button
                  onClick={e => { e.stopPropagation(); onTrash(msg.messageId); }}
                  title="Move to Trash"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 3, color: "#ef4444",
                    display: "flex", alignItems: "center",
                    borderRadius: 4,
                    transition: "all 0.15s",
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
              {/* Star toggle — always visible, dim when unstarred */}
              <button
                onClick={e => { e.stopPropagation(); onToggleStar(msg.messageId); }}
                title={isStarred ? "Unstar" : "Star"}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 3,
                  color: isStarred ? "#f59e0b" : "var(--muted-foreground)",
                  opacity: isStarred ? 1 : (hovered ? 0.7 : 0.35),
                  display: "flex", alignItems: "center",
                  transition: "all 0.15s",
                }}
              >
                <Star size={13} fill={isStarred ? "#f59e0b" : "none"} />
              </button>
            </div>
          </div>

          {/* Subject */}
          <p style={{
            fontSize: 12, fontWeight: msg.isRead ? 400 : 600,
            color: "var(--foreground)", margin: "1px 0 2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            opacity: msg.isRead ? 0.7 : 1,
          }}>
            {msg.subject}
          </p>

          {/* Preview / AI Summary + Sentiment */}
          {!expanded && (msg.aiSummary || msg.summary) && (
            <p style={{
              fontSize: 11, color: msg.aiSummary ? "var(--foreground)" : "var(--muted-foreground)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              margin: 0, opacity: msg.aiSummary ? 0.9 : 0.75,
              fontWeight: msg.aiSummary ? 500 : 400,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {/* Sentiment dot */}
              {msg.sentiment && (
                <span
                  title={`Sentiment: ${msg.sentiment}`}
                  style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0, display: "inline-block",
                    background:
                      msg.sentiment === "positive" ? "#22c55e" :
                      msg.sentiment === "negative" ? "#ef4444" :
                      "#94a3b8",
                    boxShadow:
                      msg.sentiment === "positive" ? "0 0 4px rgba(34,197,94,0.5)" :
                      msg.sentiment === "negative" ? "0 0 4px rgba(239,68,68,0.5)" : "none",
                  }}
                />
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {msg.aiSummary ? `✨ ${msg.aiSummary}` : msg.summary}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && msg.summary && (
        <div style={{
          padding: "0 14px 14px 60px",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
          marginTop: 0,
        }}>
          <p style={{
            fontSize: 12, color: "var(--muted-foreground)",
            lineHeight: 1.7, margin: "12px 0 8px",
          }}>
            {msg.summary}…
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 10, color: "var(--muted-foreground)",
              fontFamily: "monospace", opacity: 0.6,
            }}>
              from: {msg.fromEmail}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QuickSendForm ────────────────────────────────────────────────────────────

function QuickSendForm({
  onSendZoho, onSendGmail, isSending, sendError, lastSendSuccess, onClear, isDark,
  hasGmail, hasZoho,
}: {
  onSendZoho:  (to: string, subject: string, body: string, cc?: string, bcc?: string) => void;
  onSendGmail: (to: string, subject: string, body: string, cc?: string, bcc?: string) => void;
  isSending:       boolean;
  sendError:       string | null;
  lastSendSuccess: boolean;
  onClear:         () => void;
  isDark:          boolean;
  hasGmail:        boolean;
  hasZoho:         boolean;
}) {
  const [to,       setTo]       = useState("");
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [cc,       setCc]       = useState("");
  const [bcc,      setBcc]      = useState("");
  const [showCc,   setShowCc]   = useState(false);
  const [showBcc,  setShowBcc]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [attachments, setAttachments] = useState<{name:string;size:number;data:string;type:string}[]>([]);
  // Default to gmail if available, else zoho
  const [provider, setProvider] = useState<"gmail"|"zoho">(hasGmail ? "gmail" : "zoho");
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const canSend = to.trim() && subject.trim() && body.trim() && !isSending;

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(f => {
      const r = new FileReader();
      r.onload = ev => setAttachments(p => [...p, { name: f.name, size: f.size, type: f.type, data: (ev.target?.result as string).split(",")[1] ?? "" }]);
      r.readAsDataURL(f);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const applyFmt = (tag: string) => {
    const el = bodyRef.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const m: Record<string,string> = { bold:"**", italic:"_", underline:"__" };
    const mark = m[tag] ?? "";
    setBody(v => v.slice(0,s) + mark + v.slice(s,e) + mark + v.slice(e));
    setTimeout(() => { el.focus(); el.setSelectionRange(s+mark.length, e+mark.length); }, 0);
  };

  const handleSend = () => {
    if (!canSend) return;
    const ccVal  = showCc  ? cc.trim()  : undefined;
    const bccVal = showBcc ? bcc.trim() : undefined;
    if (provider === "gmail") {
      onSendGmail(to.trim(), subject.trim(), body.trim(), ccVal, bccVal);
    } else {
      onSendZoho(to.trim(), subject.trim(), body.trim(), ccVal, bccVal);
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, background: "transparent", border: "none", outline: "none",
    fontSize: 13, color: "var(--foreground)", fontFamily: "inherit",
  };
  const divider = <div style={{ width: 1, height: 14, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", margin: "0 3px" }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={handleAttach} />

      {/* ── Success / Error ── */}
      {lastSendSuccess && (
        <div style={{ padding:"10px 14px", borderRadius:10, background: isDark?"rgba(34,197,94,0.08)":"#f0fdf4", border:`1px solid ${isDark?"rgba(34,197,94,0.25)":"#bbf7d0"}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <CheckCircle2 size={13} style={{ color:"#22c55e" }} />
            <span style={{ fontSize:12, fontWeight:600, color: isDark?"#4ade80":"#16a34a" }}>Email sent successfully!</span>
          </div>
          <button onClick={onClear} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:2 }}><X size={12}/></button>
        </div>
      )}
      {sendError && (
        <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.25)", display:"flex", alignItems:"center", gap:7 }}>
          <AlertCircle size={13} style={{ color:"#ef4444" }} />
          <span style={{ fontSize:12, color:"#ef4444" }}>{sendError}</span>
        </div>
      )}

      {/* ── Provider Selector ── */}
      {(hasGmail || hasZoho) && (
        <div style={{ display:"flex", gap:6, marginBottom:2 }}>
          {hasGmail && (
            <button
              onClick={() => setProvider("gmail")}
              style={{
                flex:1, padding:"9px 0", borderRadius:10, cursor:"pointer",
                fontWeight:700, fontSize:12.5, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background: provider==="gmail"
                  ? "linear-gradient(135deg, #ea4335 0%, #c5221f 100%)"
                  : (isDark ? "rgba(234,67,53,0.07)" : "rgba(234,67,53,0.05)"),
                color: provider==="gmail" ? "#fff" : "#ea4335",
                border: provider==="gmail" ? "none" : "1.5px solid rgba(234,67,53,0.3)",
                boxShadow: provider==="gmail" ? "0 4px 14px rgba(234,67,53,0.25)" : "none",
                transition:"all 0.15s",
              }}
            >
              {/* Gmail icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.909 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="currentColor"/>
              </svg>
              Send via Gmail
              {provider==="gmail" && <span style={{ fontSize:9, background:"rgba(255,255,255,0.2)", padding:"1px 5px", borderRadius:4 }}>Corsair</span>}
            </button>
          )}
          {hasZoho && (
            <button
              onClick={() => setProvider("zoho")}
              style={{
                flex:1, padding:"9px 0", borderRadius:10, cursor:"pointer",
                fontWeight:700, fontSize:12.5, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background: provider==="zoho"
                  ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                  : (isDark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.05)"),
                color: provider==="zoho" ? "#fff" : "#f59e0b",
                border: provider==="zoho" ? "none" : "1.5px solid rgba(245,158,11,0.3)",
                boxShadow: provider==="zoho" ? "0 4px 14px rgba(245,158,11,0.25)" : "none",
                transition:"all 0.15s",
              }}
            >
              <Mail size={14}/>
              Send via Zoho
            </button>
          )}
        </div>
      )}

      {/* ── Composer Card ── */}
      <div style={{
        borderRadius:14,
        border:`1.5px solid ${provider==="gmail" ? "rgba(234,67,53,0.25)" : "rgba(245,158,11,0.25)"}`,
        background: isDark ? "rgba(16,16,28,0.95)" : "#fff",
        boxShadow: expanded ? "0 8px 40px rgba(0,0,0,0.12)" : "0 2px 12px rgba(0,0,0,0.06)",
        overflow:"hidden", transition:"all 0.2s ease",
      }}>
        {/* To */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:"var(--muted-foreground)", width:40, flexShrink:0 }}>To</span>
          <input type="email" placeholder="recipient@example.com" value={to} onChange={e=>setTo(e.target.value)} style={inputStyle} />
          <div style={{ display:"flex", gap:4 }}>
            {!showCc  && <button onClick={()=>setShowCc(true)}  style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, background:"transparent", color:"var(--muted-foreground)", cursor:"pointer", fontWeight:600 }}>CC</button>}
            {!showBcc && <button onClick={()=>setShowBcc(true)} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, background:"transparent", color:"var(--muted-foreground)", cursor:"pointer", fontWeight:600 }}>BCC</button>}
          </div>
        </div>
        {/* CC */}
        {showCc && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:"var(--muted-foreground)", width:40, flexShrink:0 }}>CC</span>
            <input placeholder="cc@example.com" value={cc} onChange={e=>setCc(e.target.value)} style={inputStyle} />
            <button onClick={()=>{setShowCc(false);setCc("");}} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex" }}><X size={13}/></button>
          </div>
        )}
        {/* BCC */}
        {showBcc && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}` }}>
            <span style={{ fontSize:11, fontWeight:700, color:"var(--muted-foreground)", width:40, flexShrink:0 }}>BCC</span>
            <input placeholder="bcc@example.com" value={bcc} onChange={e=>setBcc(e.target.value)} style={inputStyle} />
            <button onClick={()=>{setShowBcc(false);setBcc("");}} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex" }}><X size={13}/></button>
          </div>
        )}
        {/* Subject */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}` }}>
          <span style={{ fontSize:11, fontWeight:700, color:"var(--muted-foreground)", width:40, flexShrink:0 }}>Sub</span>
          <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} style={inputStyle} />
        </div>
        {/* Body */}
        <textarea
          ref={bodyRef}
          rows={expanded ? 12 : 6}
          placeholder={`Compose your email...\n\nTip: Select text and use formatting tools below`}
          value={body}
          onChange={e=>setBody(e.target.value)}
          style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", border:"none", background:"transparent", color:"var(--foreground)", fontSize:13.5, fontFamily:"inherit", lineHeight:1.65, outline:"none", resize:"none", display:"block" }}
          onKeyDown={e=>{ if(e.key==="Enter" && e.ctrlKey){ e.preventDefault(); handleSend(); } }}
        />
        {/* Attachments */}
        {attachments.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"0 14px 10px" }}>
            {attachments.map((a,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px 3px 6px", borderRadius:6, background: isDark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)", fontSize:11 }}>
                <FileText size={11} style={{ color:"#6366f1" }}/>
                <span style={{ maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</span>
                <span style={{ color:"var(--muted-foreground)", fontSize:10 }}>({(a.size/1024).toFixed(0)}KB)</span>
                <button onClick={()=>setAttachments(p=>p.filter((_,j)=>j!==i))} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", display:"flex", padding:0 }}><X size={11}/></button>
              </div>
            ))}
          </div>
        )}
        {/* Toolbar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderTop:`1px solid ${isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"}`, background: isDark?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.012)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:1 }}>
            <button onClick={()=>applyFmt("bold")}      title="Bold"      style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}><Bold size={13}/></button>
            <button onClick={()=>applyFmt("italic")}    title="Italic"    style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}><Italic size={13}/></button>
            <button onClick={()=>applyFmt("underline")} title="Underline" style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}><Underline size={13}/></button>
            {divider}
            <button onClick={()=>fileRef.current?.click()} title="Attach" style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}><Paperclip size={13}/></button>
            <button onClick={()=>setBody(t=>t+"😊")}      title="Emoji"  style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}><Smile size={13}/></button>
            {divider}
            <button onClick={()=>setExpanded(e=>!e)} title={expanded?"Collapse":"Expand"} style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}>
              {expanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {body.length > 0 && <span style={{ fontSize:10, color:"var(--muted-foreground)", opacity:0.5 }}>{body.length} chars</span>}
            {(to||subject||body) && (
              <button onClick={()=>{setTo("");setSubject("");setBody("");setCc("");setBcc("");setAttachments([]);}} title="Discard" style={{ background:"transparent", border:"none", cursor:"pointer", color:"var(--muted-foreground)", padding:"4px 6px", borderRadius:5, display:"flex" }}><Trash2 size={13}/></button>
            )}
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                padding:"7px 20px", borderRadius:8, border:"none",
                background: canSend
                  ? (provider==="gmail"
                    ? "linear-gradient(135deg, #ea4335 0%, #c5221f 100%)"
                    : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)")
                  : (isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"),
                color: canSend ? "#fff" : "var(--muted-foreground)",
                cursor: canSend ? "pointer" : "not-allowed",
                display:"flex", alignItems:"center", gap:6,
                fontSize:12.5, fontWeight:700,
                boxShadow: canSend ? "0 4px 14px rgba(0,0,0,0.2)" : "none",
                transition:"all 0.15s",
              }}
            >
              {isSending
                ? <><Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/> Sending...</>
                : <><Send size={13}/> Send</>
              }
            </button>
          </div>
        </div>
      </div>

      <p style={{ fontSize:11, color:"var(--muted-foreground)", textAlign:"center", opacity:0.6, margin:0 }}>
        {provider === "gmail"
          ? "✦ Sending via Gmail · Powered by Corsair"
          : "✦ Sending via Zoho Mail"}
        &nbsp;·&nbsp;Ctrl+Enter to send
      </p>
    </div>
  );
}

// ─── CategoryBadge ────────────────────────────────────────────────────────────

function CategoryBadge({ count, isDark }: { count: number; isDark: boolean }) {
  if (!count) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 50,
      background: isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)",
      color: isDark ? "#818cf8" : "#6366f1",
      border: `1px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"}`,
      minWidth: 18, textAlign: "center",
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page, total, pageSize, onChange, isDark,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
  isDark: boolean;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const btnStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 8, border: "none",
    fontSize: 12, fontWeight: active ? 700 : 500, cursor: disabled ? "default" : "pointer",
    background: active
      ? "linear-gradient(135deg, #818cf8, #6366f1)"
      : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
    color: active ? "#fff" : (disabled ? "var(--muted-foreground)" : "var(--foreground)"),
    opacity: disabled ? 0.4 : 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
    boxShadow: active ? "0 2px 10px rgba(99,102,241,0.3)" : "none",
  });

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== -1) {
      pages.push(-1); // ellipsis
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 16 }}>
      <button
        style={btnStyle(false, page === 1)}
        onClick={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft size={13} />
      </button>

      {pages.map((p, i) =>
        p === -1 ? (
          <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "0 2px" }}>…</span>
        ) : (
          <button key={p} style={btnStyle(p === page)} onClick={() => onChange(p)}>
            {p}
          </button>
        )
      )}

      <button
        style={btnStyle(false, page === totalPages)}
        onClick={() => page < totalPages && onChange(page + 1)}
        disabled={page === totalPages}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MailAccountPanelProps {
  userEmail: string;
  isDark:    boolean;
  mode?:     "all" | "inbox" | "connections";
}

export default function MailAccountPanel({ userEmail, isDark, mode = "all" }: MailAccountPanelProps) {
  const mail = useMailAccount(userEmail);
  const { isZohoConnected, isGmailConnected, connectZoho, connectGmail } = mail;

  const [activeTab,   setActiveTab]   = useState<"inbox" | "send">("inbox");
  const [category,    setCategory]    = useState<Category>("all");
  const [page,        setPage]        = useState(1);
  const [starred,     setStarred]     = useState<Set<string>>(new Set());
  const [localRead,   setLocalRead]   = useState<Set<string>>(new Set()); // optimistic read tracking
  const [trashed,     setTrashed]     = useState<Set<string>>(new Set()); // optimistically hidden trashed msgs
  const [search,      setSearch]      = useState("");
  const [showAdvSearch, setShowAdvSearch] = useState(false); // Gmail advanced search panel

  const [selectedMail, setSelectedMail] = useState<MailMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [isFetchingThread, setIsFetchingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [gmailThreadId, setGmailThreadId] = useState<string | null>(null); // actual Gmail thread ID
  const [showCC, setShowCC]       = useState(false);
  const [showBCC, setShowBCC]     = useState(false);
  const [ccValue, setCcValue]     = useState("");
  const [bccValue, setBccValue]   = useState("");
  const [attachments, setAttachments] = useState<{name:string;size:number;type:string;data:string}[]>([]);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [replyError, setReplyError] = useState<string|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  // ── Fetch Thread ───────────────────────────────────────────────────────────
  const handleSelectMail = async (msg: MailMessage) => {
    setSelectedMail(msg);
    setIsFetchingThread(true);
    setThreadError(null);
    setThreadMessages([]);
    setGmailThreadId(null);
    try {
      let res: { success: boolean; messages?: ThreadMessage[]; error?: string; threadId?: string };

      if (msg.provider === "gmail") {
        // Gmail message — use Gmail thread API
        res = await fetchGmailThreadAction(userEmail, msg.messageId);
        if (res.threadId) setGmailThreadId(res.threadId); // store actual Gmail thread ID for sending

        // Auto mark-as-read via Corsair (fire-and-forget, non-blocking)
        if (!msg.isRead && !localRead.has(msg.messageId)) {
          gmailMarkAsReadAction(userEmail, msg.messageId).then(r => {
            if (r.success) setLocalRead(prev => new Set(prev).add(msg.messageId));
          });
        }
      } else {
        // Zoho message — use Zoho thread search
        res = await getEmailThreadAction(userEmail, msg.messageId, msg.subject, msg.fromEmail);
      }

      if (res.success && res.messages) {
        setThreadMessages(res.messages);
      } else {
        setThreadError(res.error ?? "Failed to load thread conversation.");
      }
    } catch (err: any) {
      setThreadError(err?.message ?? "An error occurred.");
    } finally {
      setIsFetchingThread(false);
    }
  };

  // ── Handle file attachment ─────────────────────────────────────────────────
  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1] ?? "";
        setAttachments(prev => [...prev, { name: file.name, size: file.size, type: file.type, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Format text helper ─────────────────────────────────────────────────────
  const applyFormat = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const sel   = replyText.slice(start, end);
    const markers: Record<string, string> = { bold: "**", italic: "_", underline: "__" };
    const m = markers[tag] ?? "";
    const newText = replyText.slice(0, start) + m + sel + m + replyText.slice(end);
    setReplyText(newText);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + m.length, end + m.length); }, 0);
  };

  // ── Send Thread Reply ──────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!selectedMail || !replyText.trim()) return;
    setIsSendingReply(true);
    setReplyError(null);
    try {
      const lastMsg   = threadMessages.length > 0 ? threadMessages[threadMessages.length - 1] : null;
      // For Gmail: use rfc822MsgId for In-Reply-To, gmailThreadId for thread grouping
      // For Zoho:  use zohoMsgId as before
      const replyToId = selectedMail.provider === "gmail"
        ? (lastMsg?.rfc822MsgId || lastMsg?.zohoMsgId || selectedMail.messageId)
        : (lastMsg?.zohoMsgId || selectedMail.messageId);

      console.log("[MailAccountPanel] Replying to", selectedMail.fromEmail, "via", selectedMail.provider, "threadId:", gmailThreadId);
      const res = await sendThreadReplyAction(
        userEmail,
        selectedMail.fromEmail,
        selectedMail.subject,
        replyText,
        replyToId,
        selectedMail.provider as "zoho" | "gmail",
        gmailThreadId ?? undefined,  // pass actual Gmail thread ID
      );

      if (res.success) {
        const newMsg: ThreadMessage = {
          id: res.zohoMsgId ?? Math.random().toString(),
          direction: "sent",
          fromEmail: userEmail,
          fromName: "You",
          toEmail: selectedMail.fromEmail,
          subject: selectedMail.subject.toLowerCase().startsWith("re:") ? selectedMail.subject : `Re: ${selectedMail.subject}`,
          body: replyText,
          sentAt: new Date().toISOString(),
          zohoMsgId: res.zohoMsgId,
        };
        setThreadMessages(prev => [...prev, newMsg]);
        setReplyText("");
        setAttachments([]);
        setCcValue(""); setBccValue("");
        setShowCC(false); setShowBCC(false);
        setComposerExpanded(false);
      } else {
        setReplyError(res.error ?? "Failed to send reply.");
      }
    } catch (err: any) {
      setReplyError(err?.message ?? "Failed to send reply.");
    } finally {
      setIsSendingReply(false);
    }
  };


  // ── Toggle star (Gmail + Zoho: sync to respective APIs) ──────────────────
  const toggleStar = useCallback((id: string) => {
    const willStar = !starred.has(id);
    // Optimistic update immediately
    setStarred(prev => {
      const next = new Set(prev);
      willStar ? next.add(id) : next.delete(id);
      return next;
    });
    const revert = () => setStarred(prev => {
      const next = new Set(prev);
      willStar ? next.delete(id) : next.add(id);
      return next;
    });
    const msg = mail.inbox.find(m => m.messageId === id);
    if (msg?.provider === "gmail") {
      // Gmail: sync via Corsair messages.modify
      gmailToggleStarAction(userEmail, id, willStar).catch(revert);
    } else if (msg?.provider === "zoho") {
      // Zoho: sync via updatemessage setFlag/removeFlag API
      zohoToggleStarAction(userEmail, id, willStar).catch(revert);
    }
  }, [starred, mail.inbox, userEmail]);

  // ── Trash Gmail message ──────────────────────────────────────────
  const handleTrash = useCallback(async (messageId: string) => {
    // Optimistically hide from UI right away
    setTrashed(prev => new Set(prev).add(messageId));
    // Close thread pane if this mail was open
    if (selectedMail?.messageId === messageId) {
      setSelectedMail(null);
      setThreadMessages([]);
    }
    // Call Gmail trash API via Corsair
    const r = await gmailTrashAction(userEmail, messageId);
    if (!r.success) {
      // Revert the optimistic hide on failure
      setTrashed(prev => { const n = new Set(prev); n.delete(messageId); return n; });
    }
  }, [userEmail, selectedMail]);

  // ── Filter messages ────────────────────────────────────────────────────────
  const filteredMessages = mail.inbox.filter(msg => {
    if (trashed.has(msg.messageId)) return false;   // hide optimistically trashed
    const cats = classifyMessage(msg);
    const isInCat = category === "starred" ? starred.has(msg.messageId) : cats.includes(category);
    if (!isInCat) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(q) ||
      msg.fromEmail.toLowerCase().includes(q) ||
      msg.fromName.toLowerCase().includes(q) ||
      (msg.summary ?? "").toLowerCase().includes(q)
    );
  // Apply localRead override so opened Gmail mails show as read immediately
  }).map(msg => localRead.has(msg.messageId) ? { ...msg, isRead: true } : msg);

  const totalPages  = Math.ceil(filteredMessages.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const pageItems   = filteredMessages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when category/search changes
  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setPage(1);
  };
  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  // ── Category counts ────────────────────────────────────────────────────────
  const countFor = (cat: Category) => {
    if (cat === "starred") return mail.inbox.filter(m => starred.has(m.messageId)).length;
    return mail.inbox.filter(m => classifyMessage(m).includes(cat)).length;
  };
  const unreadCount = mail.inbox.filter(m => !m.isRead).length;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (mail.isLoading) {
    return (
      <div style={{ padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Loader2 size={22} style={{ color: "#818cf8", animation: "spin 1s linear infinite" }} />
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Loading mail account…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not connected (or partially connected) ─────────────────────────────
  if (!isZohoConnected && !isGmailConnected) {
    if (mode === "inbox") {
      return (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 18px",
            background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.06)",
            border: "1.5px solid rgba(99,102,241,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(99,102,241,0.12)",
          }}>
            <Mail size={28} style={{ color: "#818cf8" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: "0 0 8px" }}>
            No Mail Account Linked
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65, margin: "0 0 20px" }}>
            You need to link a Zoho or Gmail account in your mail settings before you can view messages or send outreach.
          </p>
          <a href="/dashboard/mail/settings" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 10,
            background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            textDecoration: "none", boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
          }}>
            Go to Mail Settings
          </a>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Hero */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 18px",
            background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.06))",
            border: "1.5px solid rgba(99,102,241,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 30px rgba(99,102,241,0.12)",
          }}>
            <Mail size={28} style={{ color: "#818cf8" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--foreground)", margin: "0 0 8px" }}>
            Connect Your Mailbox
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.65, margin: 0 }}>
            Link your mail account to read job leads and send outreach directly from ThePitchly.
          </p>
        </div>

        {/* Permission bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: <Inbox size={13} />,       text: "Read your inbox to surface job leads" },
            { icon: <Send size={13} />,        text: "Send cold emails & proposals directly" },
            { icon: <ShieldCheck size={13} />, text: "Tokens stored securely — revoke anytime" },
            { icon: <Zap size={13} />,         text: "Category-smart inbox organisation" },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
            }}>
              <span style={{ color: "#818cf8", flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Two provider connect cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

          {/* Gmail Card */}
          <button
            onClick={connectGmail}
            style={{
              padding: "16px 12px", borderRadius: 14, cursor: "pointer",
              background: isDark
                ? "linear-gradient(135deg, rgba(234,67,53,0.12), rgba(234,67,53,0.04))"
                : "linear-gradient(135deg, rgba(234,67,53,0.07), rgba(234,67,53,0.02))",
              border: `1.5px solid ${isDark ? "rgba(234,67,53,0.3)" : "rgba(234,67,53,0.2)"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(234,67,53,0.18)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Gmail icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #ea4335, #c5221f)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 12px rgba(234,67,53,0.35)",
            }}>
              <Mail size={20} style={{ color: "#fff" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", margin: "0 0 2px" }}>
                Google Gmail
              </p>
              <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: 0 }}>
                Connect Gmail inbox
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 8,
              background: "linear-gradient(135deg, #ea4335, #c5221f)",
              color: "#fff", fontSize: 11.5, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(234,67,53,0.3)",
            }}>
              <Link2 size={11} /> Link Gmail
            </div>
          </button>

          {/* Zoho Card */}
          <button
            onClick={connectZoho}
            style={{
              padding: "16px 12px", borderRadius: 14, cursor: "pointer",
              background: isDark
                ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))"
                : "linear-gradient(135deg, rgba(245,158,11,0.07), rgba(245,158,11,0.02))",
              border: `1.5px solid ${isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.2)"}`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(245,158,11,0.18)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Zoho icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 12px rgba(245,158,11,0.35)",
            }}>
              <Mail size={20} style={{ color: "#fff" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "var(--foreground)", margin: "0 0 2px" }}>
                Zoho Mail
              </p>
              <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: 0 }}>
                Connect Zoho inbox
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 8,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff", fontSize: 11.5, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}>
              <Link2 size={11} /> Link Zoho
            </div>
          </button>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Email body renderer ─────────────────────────────────────────────────────
  // Converts raw email text to readable JSX:
  //   • [label](url)  → clickable link showing only label
  //   • bare https:// → "🔗 hostname" pill button
  //   • Paragraphs split on double-newline, single newlines kept as <br/>
  const renderEmailBody = (text: string, isSent: boolean) => {
    if (!text) return null;

    const linkColor  = isSent ? "rgba(255,255,255,0.9)" : "#6366f1";
    const linkBg     = isSent ? "rgba(255,255,255,0.15)" : (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)");
    const linkBorder = isSent ? "rgba(255,255,255,0.3)"  : (isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.22)");

    const linkStyle: React.CSSProperties = {
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "1px 8px", borderRadius: 6, margin: "0 2px",
      background: linkBg, border: `1px solid ${linkBorder}`,
      color: linkColor, fontSize: 11, fontWeight: 600,
      textDecoration: "none", whiteSpace: "nowrap",
      verticalAlign: "middle",
    };

    const paragraphs = text.split(/\n{2,}/);

    return paragraphs.map((para, pi) => {
      const lines = para.split(/\n/);

      const renderedLines = lines.map((line, li) => {
        const parts: React.ReactNode[] = [];
        // Combined regex: [label](url) OR bare url
        const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s\]\[)]+)/g;
        let last = 0;
        let m: RegExpExecArray | null;

        while ((m = re.exec(line)) !== null) {
          if (m.index > last) parts.push(line.slice(last, m.index));

          if (m[1] && m[2]) {
            // [label](url) format
            parts.push(
              <a key={`${pi}-${li}-${m.index}`} href={m[2]} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {m[1]}
              </a>
            );
          } else if (m[3]) {
            // bare URL
            let label = "Open Link";
            try { label = new URL(m[3]).hostname.replace(/^www\./, ""); } catch {}
            parts.push(
              <a key={`${pi}-${li}-${m.index}`} href={m[3]} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                🔗 {label}
              </a>
            );
          }
          last = m.index + m[0].length;
        }
        if (last < line.length) parts.push(line.slice(last));

        return (
          <span key={`${pi}-${li}`}>
            {parts.length > 0 ? parts : line}
            {li < lines.length - 1 && <br />}
          </span>
        );
      });

      return (
        <p key={`p-${pi}`} style={{ margin: pi === 0 ? 0 : "10px 0 0", lineHeight: 1.7 }}>
          {renderedLines}
        </p>
      );
    });
  };

  // ── Connected ──────────────────────────────────────────────────────────────
  if (selectedMail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 450 }}>
        {/* Thread Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          paddingBottom: 14,
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          marginBottom: 14,
        }}>
          <button
            onClick={() => setSelectedMail(null)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              color: "#818cf8", fontSize: 13, fontWeight: 700,
              padding: "4px 8px", borderRadius: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          <AvatarBubble name={selectedMail.fromName} email={selectedMail.fromEmail} size={38} />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
              fontSize: 13.5, fontWeight: 700, color: "var(--foreground)", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }}>
              {selectedMail.fromName || selectedMail.fromEmail.split("@")[0]}
            </h4>
            <p style={{
              fontSize: 11, color: "var(--muted-foreground)", margin: "1px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
            }}>
              {selectedMail.subject}
            </p>
          </div>
        </div>

        {/* Thread Body (Messages Area) */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 400,
          minHeight: 300,
          background: isDark ? "rgba(0, 0, 0, 0.15)" : "rgba(0, 0, 0, 0.025)",
          borderRadius: 12,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
          marginBottom: 14,
        }}>
          {isFetchingThread && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 200, gap: 10, padding: 20 }}>
              <Loader2 size={24} style={{ color: "#818cf8", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Loading conversation thread...</span>
            </div>
          )}

          {threadError && (
            <div style={{ padding: "20px", textAlign: "center", color: "#ef4444", fontSize: 13 }}>
              <AlertCircle size={20} style={{ margin: "0 auto 8px" }} />
              <p>{threadError}</p>
            </div>
          )}

          {!isFetchingThread && !threadError && threadMessages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 200, padding: 20 }}>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>No messages found in this thread.</p>
            </div>
          )}

          {!isFetchingThread && !threadError && threadMessages.map((msg, index) => {
            const isSent = msg.direction === "sent";
            const bubbleColor = isSent 
              ? (isDark ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)")
              : (isDark ? "#1f2937" : "#f3f4f6");
            const textColor = isSent ? "#ffffff" : "var(--foreground)";
            const alignSelf = isSent ? "flex-end" : "flex-start";
            
            return (
              <div 
                key={msg.id || index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignSelf,
                  maxWidth: "80%",
                  alignItems: isSent ? "flex-end" : "flex-start",
                }}
              >
                {/* Bubble */}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 16,
                  borderTopRightRadius: isSent ? 4 : 16,
                  borderTopLeftRadius: isSent ? 16 : 4,
                  background: bubbleColor,
                  color: textColor,
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}>
                  {/* Rendered body */}
                  <div style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                    {renderEmailBody(msg.body, isSent)}
                  </div>
                </div>
                {/* Timestamp */}
                <span style={{ 
                  fontSize: 9.5, 
                  color: "var(--muted-foreground)", 
                  marginTop: 4, 
                  padding: "0 4px",
                  opacity: 0.8
                }}>
                  {fmtTime(msg.sentAt)}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Premium Mail Composer ── */}
        <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleAttachFile} />
        <div style={{
          borderRadius: composerExpanded ? 16 : 14,
          border: `1.5px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)"}`,
          background: isDark ? "rgba(20,20,35,0.95)" : "#fff",
          boxShadow: composerExpanded ? "0 8px 40px rgba(99,102,241,0.18)" : "0 2px 12px rgba(0,0,0,0.08)",
          transition: "all 0.2s ease",
          overflow: "hidden",
        }}>

          {/* ── Header: To / CC / BCC ── */}
          <div style={{ padding: "8px 14px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
            {/* To */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showCC || showBCC ? 4 : 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", width: 28, flexShrink: 0 }}>To</span>
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--foreground)", fontWeight: 500 }}>{selectedMail.fromEmail}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {!showCC && <button onClick={() => setShowCC(true)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", fontWeight: 600 }}>CC</button>}
                {!showBCC && <button onClick={() => setShowBCC(true)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", fontWeight: 600 }}>BCC</button>}
              </div>
            </div>
            {/* CC */}
            {showCC && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", width: 28, flexShrink: 0 }}>CC</span>
                <input value={ccValue} onChange={e => setCcValue(e.target.value)} placeholder="Add CC recipients..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12.5, color: "var(--foreground)" }} />
                <button onClick={() => { setShowCC(false); setCcValue(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={13} /></button>
              </div>
            )}
            {/* BCC */}
            {showBCC && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", width: 28, flexShrink: 0 }}>BCC</span>
                <input value={bccValue} onChange={e => setBccValue(e.target.value)} placeholder="Add BCC recipients..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12.5, color: "var(--foreground)" }} />
                <button onClick={() => { setShowBCC(false); setBccValue(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}><X size={13} /></button>
              </div>
            )}
          </div>

          {/* ── Subject (read-only, shows Re: prefix) ── */}
          <div style={{ padding: "5px 14px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", width: 50, flexShrink: 0 }}>Subject</span>
            <span style={{ fontSize: 12.5, color: "var(--foreground)", opacity: 0.8 }}>
              {selectedMail.subject.toLowerCase().startsWith("re:") ? selectedMail.subject : `Re: ${selectedMail.subject}`}
            </span>
          </div>

          {/* ── Body textarea ── */}
          <textarea
            ref={textareaRef}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={`Write your reply to ${selectedMail.fromName || selectedMail.fromEmail}...\n\nTip: Shift+Enter for new line, Enter to send`}
            rows={composerExpanded ? 10 : 4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: "none",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 13.5,
              fontFamily: "inherit",
              lineHeight: 1.6,
              outline: "none",
              resize: "none",
              display: "block",
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />

          {/* ── Attachments preview ── */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 14px 8px" }}>
              {attachments.map((a, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "3px 8px 3px 6px", borderRadius: 6,
                  background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                  border: `1px solid ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)"}`,
                  fontSize: 11, color: "var(--foreground)",
                }}>
                  <FileText size={11} style={{ color: "#6366f1" }} />
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>({(a.size/1024).toFixed(0)}KB)</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 0 }}><X size={11} /></button>
                </div>
              ))}
            </div>
          )}

          {/* ── Error ── */}
          {replyError && (
            <div style={{ margin: "0 14px 8px", padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={13} /> {replyError}
            </div>
          )}

          {/* ── Bottom toolbar ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 10px",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
            background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          }}>
            {/* Left: Format tools */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {([
                { icon: <Bold size={14} />, label: "Bold", action: () => applyFormat("bold") },
                { icon: <Italic size={14} />, label: "Italic", action: () => applyFormat("italic") },
                { icon: <Underline size={14} />, label: "Underline", action: () => applyFormat("underline") },
              ] as const).map((tool, i) => (
                <button key={i} onClick={tool.action} title={tool.label} style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--muted-foreground)", padding: "4px 6px", borderRadius: 5,
                  display: "flex", alignItems: "center",
                  transition: "background 0.12s",
                }}>
                  {tool.icon}
                </button>
              ))}
              <div style={{ width: 1, height: 16, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", margin: "0 4px" }} />
              {/* Attach file */}
              <button onClick={() => fileInputRef.current?.click()} title="Attach file" style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--muted-foreground)", padding: "4px 6px", borderRadius: 5,
                display: "flex", alignItems: "center",
              }}>
                <Paperclip size={14} />
              </button>
              {/* Emoji */}
              <button title="Emoji" onClick={() => setReplyText(t => t + " 😊")} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--muted-foreground)", padding: "4px 6px", borderRadius: 5,
                display: "flex", alignItems: "center",
              }}>
                <Smile size={14} />
              </button>
              {/* Expand */}
              <button onClick={() => setComposerExpanded(e => !e)} title={composerExpanded ? "Collapse" : "Expand"} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--muted-foreground)", padding: "4px 6px", borderRadius: 5,
                display: "flex", alignItems: "center",
              }}>
                {composerExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>

            {/* Right: char count + Discard + Send */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {replyText.length > 0 && (
                <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>{replyText.length} chars</span>
              )}
              {replyText.trim() && (
                <button onClick={() => { setReplyText(""); setAttachments([]); setReplyError(null); }} title="Discard" style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--muted-foreground)", padding: "4px 6px", borderRadius: 5,
                  display: "flex", alignItems: "center", fontSize: 11, gap: 3,
                }}>
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={handleSendReply}
                disabled={isSendingReply || !replyText.trim()}
                style={{
                  padding: "7px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: replyText.trim() && !isSendingReply
                    ? "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)"
                    : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"),
                  color: replyText.trim() && !isSendingReply ? "#fff" : "var(--muted-foreground)",
                  cursor: replyText.trim() && !isSendingReply ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 12.5, fontWeight: 700,
                  boxShadow: replyText.trim() && !isSendingReply ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {isSendingReply ? (
                  <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending...</>
                ) : (
                  <><Send size={13} /> Send</>  
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  if (mode === "connections") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Render each linked account */}
        {mail.mailAccounts.map(acct => {
          const hasError = !!(mail.providerErrors ?? {})[acct.provider];

          return (
            <div key={acct.provider} style={{
              padding: "12px 14px", borderRadius: 12,
              background: hasError
                ? (isDark ? "rgba(245,158,11,0.07)" : "rgba(254,243,199,0.6)")
                : (isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4"),
              border: `1px solid ${hasError
                ? (isDark ? "rgba(245,158,11,0.28)" : "#fde68a")
                : (isDark ? "rgba(34,197,94,0.18)" : "#bbf7d0")}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Provider icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: acct.provider === "gmail"
                    ? "linear-gradient(135deg, #ea4335, #c5221f)"
                    : "linear-gradient(135deg, #f59e0b, #d97706)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: acct.provider === "gmail"
                    ? "0 2px 8px rgba(234,67,53,0.35)"
                    : "0 2px 8px rgba(245,158,11,0.35)",
                }}>
                  <Mail size={16} style={{ color: "#fff" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                      {acct.accountEmail}
                    </span>
                    {hasError ? (
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                        padding: "2px 6px", borderRadius: 50,
                        background: isDark ? "rgba(245,158,11,0.18)" : "#fef3c7",
                        color: isDark ? "#fbbf24" : "#92400e",
                        border: `1px solid ${isDark ? "rgba(245,158,11,0.35)" : "#fde68a"}`,
                      }}>
                        ⚠ Token Expired
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                        padding: "2px 6px", borderRadius: 50,
                        background: isDark ? "rgba(34,197,94,0.15)" : "#dcfce7",
                        color: isDark ? "#4ade80" : "#16a34a",
                        border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
                      }}>
                        Connected
                      </span>
                    )}
                    <ProviderBadge provider={acct.provider} />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "1px 0 0", textTransform: "capitalize" }}>
                    {hasError ? "Session expired — please reconnect" : `${acct.provider} Mail`}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {hasError && (
                  <button
                    onClick={() => {
                      mail.dismissProviderError(acct.provider);
                      window.location.href = acct.provider === "gmail"
                        ? `/api/mail/gmail/connect?email=${encodeURIComponent(userEmail)}`
                        : `/api/mail/zoho/connect?email=${encodeURIComponent(userEmail)}`;
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 11px", borderRadius: 8,
                      border: `1px solid ${isDark ? "rgba(245,158,11,0.35)" : "#fde68a"}`,
                      background: isDark ? "rgba(245,158,11,0.12)" : "#fef3c7",
                      color: isDark ? "#fbbf24" : "#92400e",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    🔗 Reconnect
                  </button>
                )}
                <button
                  onClick={() => mail.disconnect(acct.provider as "zoho" | "gmail")}
                  disabled={mail.isDisconnecting}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 11px", borderRadius: 8,
                    border: `1px solid ${isDark ? "rgba(239,68,68,0.28)" : "#fecaca"}`,
                    background: isDark ? "rgba(239,68,68,0.07)" : "#fef2f2",
                    color: isDark ? "#f87171" : "#dc2626",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.72"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {mail.isDisconnecting ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Unlink size={11} />}
                  Disconnect
                </button>
              </div>
            </div>
          );
        })}

        {/* Show "Add Gmail" if Gmail not yet linked */}
        {!isGmailConnected && (
          <button
            onClick={connectGmail}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "11px 14px", borderRadius: 12, cursor: "pointer",
              border: `1.5px dashed ${isDark ? "rgba(234,67,53,0.35)" : "rgba(234,67,53,0.3)"}`,
              background: isDark ? "rgba(234,67,53,0.05)" : "rgba(234,67,53,0.03)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderStyle = "solid";
              e.currentTarget.style.background = isDark ? "rgba(234,67,53,0.09)" : "rgba(234,67,53,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderStyle = "dashed";
              e.currentTarget.style.background = isDark ? "rgba(234,67,53,0.05)" : "rgba(234,67,53,0.03)";
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #ea4335, #c5221f)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(234,67,53,0.3)",
            }}>
              <Mail size={14} style={{ color: "#fff" }} />
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                Link Google Gmail
              </p>
              <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: 0 }}>
                Add your Gmail inbox to unified feed
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 7,
              background: "linear-gradient(135deg, #ea4335, #c5221f)",
              color: "#fff", fontSize: 11, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(234,67,53,0.3)",
              flexShrink: 0,
            }}>
              <Link2 size={10} /> Link Gmail
            </div>
          </button>
        )}

        {/* Show "Add Zoho" if Zoho not yet linked */}
        {!isZohoConnected && (
          <button
            onClick={connectZoho}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "11px 14px", borderRadius: 12, cursor: "pointer",
              border: `1.5px dashed ${isDark ? "rgba(245,158,11,0.35)" : "rgba(245,158,11,0.3)"}`,
              background: isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderStyle = "solid";
              e.currentTarget.style.background = isDark ? "rgba(245,158,11,0.09)" : "rgba(245,158,11,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderStyle = "dashed";
              e.currentTarget.style.background = isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)";
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}>
              <Mail size={14} style={{ color: "#fff" }} />
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                Link Zoho Mail
              </p>
              <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: 0 }}>
                Add your Zoho inbox to unified feed
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 7,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff", fontSize: 11, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
              flexShrink: 0,
            }}>
              <Link2 size={10} /> Link Zoho
            </div>
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Linked Accounts + Add Provider ── */}
      {mode !== "inbox" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>

        {/* Render each linked account */}
        {mail.mailAccounts.map(acct => {
          const hasError = !!(mail.providerErrors ?? {})[acct.provider];

          return (
            <div key={acct.provider} style={{
              padding: "12px 14px", borderRadius: 12,
              background: hasError
                ? (isDark ? "rgba(245,158,11,0.07)" : "rgba(254,243,199,0.6)")
                : (isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4"),
              border: `1px solid ${hasError
                ? (isDark ? "rgba(245,158,11,0.28)" : "#fde68a")
                : (isDark ? "rgba(34,197,94,0.18)" : "#bbf7d0")}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Provider icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: acct.provider === "gmail"
                    ? "linear-gradient(135deg, #ea4335, #c5221f)"
                    : "linear-gradient(135deg, #f59e0b, #d97706)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: acct.provider === "gmail"
                    ? "0 2px 8px rgba(234,67,53,0.35)"
                    : "0 2px 8px rgba(245,158,11,0.35)",
                }}>
                  <Mail size={16} style={{ color: "#fff" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                      {acct.accountEmail}
                    </span>
                    {hasError ? (
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                        padding: "2px 6px", borderRadius: 50,
                        background: isDark ? "rgba(245,158,11,0.18)" : "#fef3c7",
                        color: isDark ? "#fbbf24" : "#92400e",
                        border: `1px solid ${isDark ? "rgba(245,158,11,0.35)" : "#fde68a"}`,
                      }}>
                        ⚠ Token Expired
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                        padding: "2px 6px", borderRadius: 50,
                        background: isDark ? "rgba(34,197,94,0.15)" : "#dcfce7",
                        color: isDark ? "#4ade80" : "#16a34a",
                        border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
                      }}>
                        Connected
                      </span>
                    )}
                    <ProviderBadge provider={acct.provider} />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "1px 0 0", textTransform: "capitalize" }}>
                    {hasError ? "Session expired — please reconnect" : `${acct.provider} Mail`}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {hasError && (
                  <button
                    onClick={() => {
                      mail.dismissProviderError(acct.provider);
                      window.location.href = acct.provider === "gmail"
                        ? `/api/mail/gmail/connect?email=${encodeURIComponent(userEmail)}`
                        : `/api/mail/zoho/connect?email=${encodeURIComponent(userEmail)}`;
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 11px", borderRadius: 8,
                      border: `1px solid ${isDark ? "rgba(245,158,11,0.35)" : "#fde68a"}`,
                      background: isDark ? "rgba(245,158,11,0.12)" : "#fef3c7",
                      color: isDark ? "#fbbf24" : "#92400e",
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    🔗 Reconnect
                  </button>
                )}
                <button
                  onClick={() => mail.disconnect(acct.provider as "zoho" | "gmail")}
                  disabled={mail.isDisconnecting}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 11px", borderRadius: 8,
                    border: `1px solid ${isDark ? "rgba(239,68,68,0.28)" : "#fecaca"}`,
                    background: isDark ? "rgba(239,68,68,0.07)" : "#fef2f2",
                    color: isDark ? "#f87171" : "#dc2626",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.72"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {mail.isDisconnecting ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Unlink size={11} />}
                  Disconnect
                </button>
              </div>
            </div>
          );
        })}



        {/* Show "Add Gmail" if Gmail not yet linked */}
        {!isGmailConnected && (
          <button
            onClick={connectGmail}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "11px 14px", borderRadius: 12, cursor: "pointer",
              border: `1.5px dashed ${isDark ? "rgba(234,67,53,0.35)" : "rgba(234,67,53,0.3)"}`,
              background: isDark ? "rgba(234,67,53,0.05)" : "rgba(234,67,53,0.03)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderStyle = "solid";
              e.currentTarget.style.background = isDark ? "rgba(234,67,53,0.09)" : "rgba(234,67,53,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderStyle = "dashed";
              e.currentTarget.style.background = isDark ? "rgba(234,67,53,0.05)" : "rgba(234,67,53,0.03)";
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #ea4335, #c5221f)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(234,67,53,0.3)",
            }}>
              <Mail size={14} style={{ color: "#fff" }} />
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                Link Google Gmail
              </p>
              <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: 0 }}>
                Add your Gmail inbox to unified feed
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 7,
              background: "linear-gradient(135deg, #ea4335, #c5221f)",
              color: "#fff", fontSize: 11, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(234,67,53,0.3)",
              flexShrink: 0,
            }}>
              <Link2 size={10} /> Link Gmail
            </div>
          </button>
        )}

        {/* Show "Add Zoho" if Zoho not yet linked */}
        {!isZohoConnected && (
          <button
            onClick={connectZoho}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "11px 14px", borderRadius: 12, cursor: "pointer",
              border: `1.5px dashed ${isDark ? "rgba(245,158,11,0.35)" : "rgba(245,158,11,0.3)"}`,
              background: isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderStyle = "solid";
              e.currentTarget.style.background = isDark ? "rgba(245,158,11,0.09)" : "rgba(245,158,11,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderStyle = "dashed";
              e.currentTarget.style.background = isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)";
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
            }}>
              <Mail size={14} style={{ color: "#fff" }} />
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                Link Zoho Mail
              </p>
              <p style={{ fontSize: 10.5, color: "var(--muted-foreground)", margin: 0 }}>
                Add your Zoho inbox to unified feed
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 7,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#fff", fontSize: 11, fontWeight: 700,
              boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
              flexShrink: 0,
            }}>
              <Link2 size={10} /> Link Zoho
            </div>
          </button>
        )}

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 50,
              background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
              color: isDark ? "#818cf8" : "#6366f1",
              border: `1px solid ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.15)"}`,
            }}>
              {unreadCount} unread
            </span>
          </div>
        )}
      </div>
    )}

      {/* ── Tab nav ── */}
      <div style={{
        display: "flex", gap: 2,
        borderBottom: `1.5px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
        marginBottom: 20,
      }}>
        {(["inbox", "send"] as const).map(tab => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: active ? "2px solid #818cf8" : "2px solid transparent",
                marginBottom: -1.5,
                color: active ? "#818cf8" : "var(--muted-foreground)",
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {tab === "inbox" ? <Inbox size={13} /> : <Send size={13} />}
              {tab === "inbox" ? "Inbox" : "Send Email"}
              {tab === "inbox" && unreadCount > 0 && (
                <CategoryBadge count={unreadCount} isDark={isDark} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── INBOX TAB ── */}
      {activeTab === "inbox" && (
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
              <Filter size={11} style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                color: "var(--muted-foreground)", pointerEvents: "none",
              }} />
              <input
                type="text"
                placeholder="Search messages…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "7px 12px 7px 30px", borderRadius: 9, fontSize: 12,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"}`,
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  color: "var(--foreground)", outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
            {/* Advanced Gmail Search button — only when Gmail connected */}
            {isGmailConnected && (
              <button
                onClick={() => setShowAdvSearch(s => !s)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 12px", borderRadius: 9,
                  border: showAdvSearch
                    ? `1.5px solid ${isDark ? "#818cf8" : "#6366f1"}`
                    : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"}`,
                  background: showAdvSearch
                    ? (isDark ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.07)")
                    : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)"),
                  color: showAdvSearch ? (isDark ? "#818cf8" : "#6366f1") : "var(--muted-foreground)",
                  fontSize: 11, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  whiteSpace: "nowrap" as const,
                }}
              >
                <Filter size={11} />
                Advanced
              </button>
            )}
            <button
              onClick={() => {
                console.log("[MailAccountPanel] Refresh clicked — calling mail.fetchInbox()");
                mail.fetchInbox();
              }}
              disabled={mail.isFetchingInbox}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 12px", borderRadius: 9,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"}`,
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
                color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600,
                cursor: mail.isFetchingInbox ? "wait" : "pointer", transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {mail.isFetchingInbox
                ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                : <RefreshCw size={11} />}
              {mail.isFetchingInbox ? "Loading…" : "Refresh"}
            </button>
          </div>

          {/* Advanced Gmail Search Panel */}
          {showAdvSearch && isGmailConnected && (
            <GmailSearchPanel
              userEmail={userEmail}
              isDark={isDark}
              onClose={() => setShowAdvSearch(false)}
            />
          )}

          {/* Category pills */}
          <div style={{
            display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16,
          }}>
            {CATEGORIES.map(cat => {
              const count  = countFor(cat.id);
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  title={cat.desc}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 11px", borderRadius: 50,
                    border: active
                      ? `1.5px solid ${isDark ? "#818cf8" : "#6366f1"}`
                      : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"}`,
                    background: active
                      ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)")
                      : "transparent",
                    color: active
                      ? (isDark ? "#818cf8" : "#6366f1")
                      : "var(--muted-foreground)",
                    fontSize: 11.5, fontWeight: active ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.icon}
                  {cat.label}
                  {count > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 800,
                      background: active
                        ? (isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.15)")
                        : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"),
                      color: active
                        ? (isDark ? "#818cf8" : "#6366f1")
                        : "var(--muted-foreground)",
                      padding: "0 5px", borderRadius: 50, minWidth: 16, textAlign: "center",
                    }}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error banner */}
          {mail.inboxError && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 12,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <AlertCircle size={13} style={{ color: "#ef4444" }} />
              <span style={{ fontSize: 12, color: "#ef4444" }}>{mail.inboxError}</span>
            </div>
          )}

          {/* ── Per-provider reconnect banners ── */}
          {Object.entries(mail.providerErrors ?? {}).map(([provider, errMsg]) => {
            const isZoho  = provider === "zoho";
            const label   = isZoho ? "Zoho Mail" : "Gmail";
            const icon    = isZoho ? "📮" : "📧";
            const onReconnect = () => {
              mail.dismissProviderError(provider);
              if (isZoho) {
                window.location.href = `/api/mail/zoho/connect?email=${encodeURIComponent(userEmail)}`;
              } else {
                window.location.href = `/api/mail/gmail/connect?email=${encodeURIComponent(userEmail)}`;
              }
            };
            // Only show for known token-expired patterns
            const isTokenErr = errMsg?.toLowerCase().includes("token") || errMsg?.toLowerCase().includes("connect") || errMsg?.toLowerCase().includes("invalid");
            if (!isTokenErr && !errMsg) return null;

            return (
              <div key={provider} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 10, marginBottom: 10,
                background: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)",
                border: `1px solid ${isDark ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.3)"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <span style={{ fontSize: 15 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#fbbf24" : "#b45309", margin: 0 }}>
                      {label} session expired
                    </p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                      Your {label} token is no longer valid. Please reconnect to sync your inbox.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                  <button
                    onClick={onReconnect}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 8,
                      border: "none", cursor: "pointer",
                      background: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.15)",
                      color: isDark ? "#fbbf24" : "#92400e",
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    🔗 Reconnect
                  </button>
                  <button
                    onClick={() => mail.dismissProviderError(provider)}
                    style={{
                      width: 22, height: 22, borderRadius: 6, border: "none",
                      background: "transparent", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      color: "var(--muted-foreground)", fontSize: 13,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty state — no inbox loaded */}
          {mail.inbox.length === 0 && !mail.isFetchingInbox && !mail.inboxError && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
              <Inbox size={32} style={{ margin: "0 auto 12px", opacity: 0.2, display: "block" }} />
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Inbox not loaded yet</p>
              <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>Hit Refresh to pull your latest messages.</p>
            </div>
          )}

          {/* Empty filtered state */}
          {mail.inbox.length > 0 && filteredMessages.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)" }}>
              <EyeOff size={28} style={{ margin: "0 auto 10px", opacity: 0.2, display: "block" }} />
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>No messages in this category</p>
              <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>Try "All Mail" or a different filter.</p>
            </div>
          )}

          {/* ── Priority Insight Bar ── */}
          {mail.inbox.length > 0 && (() => {
            const interviews  = mail.inbox.filter(m => m.emailType === "interview_call").length;
            const offers      = mail.inbox.filter(m => m.emailType === "offer_letter").length;
            const rejections  = mail.inbox.filter(m => m.emailType === "rejection").length;
            const freelance   = mail.inbox.filter(m => m.emailType === "freelance_opportunity" || m.emailType === "remote_opportunity").length;
            const positive    = mail.inbox.filter(m => m.sentiment === "positive").length;
            const negative    = mail.inbox.filter(m => m.sentiment === "negative").length;
            const hasAny = interviews > 0 || offers > 0 || rejections > 0 || freelance > 0;
            if (!hasAny) return null;
            return (
              <div style={{
                display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 12,
                padding: "10px 12px", borderRadius: 10,
                background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted-foreground)", textTransform: "uppercase" as const, letterSpacing: "0.05em", alignSelf: "center", marginRight: 2 }}>Priority</span>
                {interviews > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)", color: isDark ? "#c084fc" : "#7c3aed", border: `1px solid ${isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}` }}>📅 {interviews} Interview{interviews > 1 ? "s" : ""}</span>}
                {offers > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)", color: isDark ? "#4ade80" : "#16a34a", border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)"}` }}>🎉 {offers} Offer{offers > 1 ? "s" : ""}</span>}
                {freelance > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: isDark ? "rgba(20,184,166,0.15)" : "rgba(20,184,166,0.08)", color: isDark ? "#2dd4bf" : "#0d9488", border: `1px solid ${isDark ? "rgba(20,184,166,0.3)" : "rgba(20,184,166,0.2)"}` }}>⚡ {freelance} Lead{freelance > 1 ? "s" : ""}</span>}
                {rejections > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.07)", color: isDark ? "#f87171" : "#dc2626", border: `1px solid ${isDark ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.18)"}` }}>✕ {rejections} Rejection{rejections > 1 ? "s" : ""}</span>}
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}>
                  {positive > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />{positive} positive</span>}
                  {negative > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />{negative} negative</span>}
                </span>
              </div>
            );
          })()}

          {/* Message list */}
          {pageItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {pageItems.map(msg => (
                <MessageRow
                  key={msg.messageId}
                  msg={msg}
                  isDark={isDark}
                  isStarred={starred.has(msg.messageId)}
                  onToggleStar={toggleStar}
                  onTrash={handleTrash}
                  onClick={() => handleSelectMail(msg)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredMessages.length > PAGE_SIZE && (
            <Pagination
              page={currentPage}
              total={filteredMessages.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              isDark={isDark}
            />
          )}

          {/* Summary line */}
          {filteredMessages.length > 0 && (
            <p style={{
              fontSize: 10, textAlign: "center", color: "var(--muted-foreground)",
              opacity: 0.55, margin: "10px 0 0",
            }}>
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredMessages.length)}–{Math.min(currentPage * PAGE_SIZE, filteredMessages.length)} of {filteredMessages.length} messages
            </p>
          )}
        </div>
      )}

      {/* ── SEND TAB ── */}
      {activeTab === "send" && (() => {
        const hasGmail = mail.mailAccounts.some(a => a.provider === "gmail");
        const hasZoho  = mail.mailAccounts.some(a => a.provider === "zoho");

        const handleSendGmail = async (to: string, subject: string, body: string, cc?: string, bcc?: string) => {
          const res = await sendGmailNewAction(userEmail, to, subject, body, cc, bcc);
          if (!res.success) alert(res.error ?? "Failed to send via Gmail.");
          else mail.clearSendStatus(); // trigger success state via hook
        };

        return (
          <QuickSendForm
            onSendZoho={mail.sendEmail}
            onSendGmail={handleSendGmail}
            isSending={mail.isSending}
            sendError={mail.sendError}
            lastSendSuccess={mail.lastSendSuccess}
            onClear={mail.clearSendStatus}
            isDark={isDark}
            hasGmail={hasGmail}
            hasZoho={hasZoho}
          />
        );
      })()}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
