"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Smartphone, CheckCircle2, QrCode, Users, RefreshCw,
  MessageSquare, Clock, ChevronRight, LogOut,
  Search, Copy, Check, AlertCircle, Loader2, ArrowRight,
  Sparkles, Link2, ChevronDown, ChevronUp, ExternalLink,
  FileText, Zap, Trash2, Square, CheckSquare
} from "lucide-react";
import { useTheme } from "../../components/theme-provider";
import { getWAMessagesForGroupAction, getExistingWAMessageIdsAction, deleteWAMessagesAction } from "@/app/actions/db-actions";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WAStatus {
  connected: boolean;
  phone: string | null;
  name: string | null;
  hasQR: boolean;
  error?: string;
}

interface WAGroup {
  id: string;
  name: string;
  participantCount: number;
  description: string;
}

interface WAMessage {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: number;
  // Analysis fields (populated after sync-and-analyze)
  status?: "raw" | "skipped" | "analyzed" | "duplicate" | "lead";
  aiScore?: number;
  aiRole?: string;
  aiCompany?: string;
  aiExplanation?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
  isDuplicate?: boolean;
  duplicateOfJobId?: string;
  jobPostId?: string;
}

interface SyncStats {
  total: number;
  skipped: number;
  analyzed: number;
  leads: number;
  duplicates: number;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ step, current, done, label, isDark }: {
  step: number; current: number; done: boolean; label: string; isDark: boolean;
}) {
  const active = step === current;
  const color  = done ? "#22c55e" : active ? "#6366f1" : "var(--muted-foreground)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: step > current ? 0.4 : 1 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: done ? "rgba(34,197,94,0.12)" : active ? "rgba(99,102,241,0.12)" : "transparent",
        border: `2px solid ${color}`,
        transition: "all 0.3s ease",
      }}>
        {done
          ? <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e" }} />
          : <span style={{ fontSize: 13, fontWeight: 700, color }}>{step}</span>
        }
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color }}>{label}</span>
      {step < 3 && (
        <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.4, marginLeft: 4 }} />
      )}
    </div>
  );
}

interface MessageGroup {
  label: string;
  messages: WAMessage[];
}

const getGroupLabel = (timestamp: number): string => {
  const d = new Date(timestamp * 1000);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();
                      
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

const groupMessages = (msgs: WAMessage[]): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  msgs.forEach(msg => {
    const label = getGroupLabel(msg.timestamp);
    let group = groups.find(g => g.label === label);
    if (!group) {
      group = { label, messages: [] };
      groups.push(group);
    }
    group.messages.push(msg);
  });
  return groups;
};

// ─── Candidacy Score Ring ─────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const isStrong = score >= 75;
  const isGood   = score >= 55;
  const color    = isStrong ? "#22c55e" : isGood ? "#6366f1" : "#f59e0b";
  const label    = isStrong ? "Strong Fit" : isGood ? "Good Fit" : "Weak Fit";
  const r = 18; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <svg width="44" height="44" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="22" cy="22" r={r} fill="none" stroke={color + "20"} strokeWidth="3" />
          <circle
            cx="22" cy="22" r={r} fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color,
        }}>{score}%</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{label}</span>
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>Candidacy Score</span>
      </div>
    </div>
  );
}

// ─── Score Badge (compact, for non-lead messages) ─────────────────────────────
function ScoreBadge({ score, isDark }: { score: number; isDark: boolean }) {
  const isStrong  = score >= 75;
  const isGood    = score >= 55;
  const color     = isStrong ? "#22c55e" : isGood ? "#6366f1" : "#f59e0b";
  const label     = isStrong ? "Strong Fit" : isGood ? "Good Fit" : "Weak Fit";
  const bg        = isStrong ? "rgba(34,197,94,0.1)" : isGood ? "rgba(99,102,241,0.1)" : "rgba(245,158,11,0.1)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 20,
      background: bg, border: `1px solid ${color}40`,
      fontSize: 11, fontWeight: 700, color,
    }}>
      <Sparkles style={{ width: 10, height: 10 }} />
      {label} {score}
    </div>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: WAMessage["status"] }) {
  if (!status || status === "raw") return null;
  const map: Record<string, { label: string; color: string; bg: string }> = {
    lead:      { label: "Lead",      color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    duplicate: { label: "Duplicate", color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
    analyzed:  { label: "Low Score", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    skipped:   { label: "Skipped",   color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <div style={{
      padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.color}30`,
      textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      {s.label}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isDark, onUseAsLead, selected, onSelect }: {
  msg: WAMessage; isDark: boolean; onUseAsLead: (text: string, waMessageId?: string) => void;
  selected?: boolean; onSelect?: (id: string) => void;
}) {
  const [copied, setCopied]           = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const date = new Date(msg.timestamp * 1000);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isLead      = msg.status === "lead";
  const isDuplicate = msg.status === "duplicate";
  const hasScore    = msg.aiScore != null;
  const hasJobPost  = isLead && !!msg.jobPostId;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const borderColor = selected
    ? "rgba(239,68,68,0.4)"
    : isLead
    ? "rgba(34,197,94,0.3)"
    : isDuplicate
    ? "rgba(99,102,241,0.25)"
    : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)");

  return (
    <div style={{
      padding: "14px 16px",
      borderRadius: 16,
      background: selected
        ? (isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.03)")
        : isLead
        ? (isDark ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.03)")
        : (isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
      border: `1px solid ${borderColor}`,
      display: "flex", flexDirection: "column", gap: 10,
      transition: "all 0.2s ease",
      position: "relative",
    }}>
      {/* Checkbox overlay (top-left) */}
      {onSelect && (
        <button
          onClick={() => onSelect(msg.id)}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "none", border: "none", cursor: "pointer", padding: 2,
            color: selected ? "#ef4444" : "var(--muted-foreground)",
            opacity: selected ? 1 : 0.4, transition: "all 0.15s",
            zIndex: 2,
          }}
          title={selected ? "Deselect" : "Select"}
        >
          {selected
            ? <CheckSquare style={{ width: 16, height: 16 }} />
            : <Square style={{ width: 16, height: 16 }} />}
        </button>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `hsl(${msg.sender.charCodeAt(0) * 10 % 360}, 60%, ${isDark ? "40%" : "65%"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {(msg.senderName || msg.sender).charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            {msg.senderName || msg.sender}
          </span>
          <StatusPill status={msg.status} />
          {hasScore && !isLead && <ScoreBadge score={msg.aiScore!} isDark={isDark} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingRight: onSelect ? 24 : 0 }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{time}</span>
          <button
            onClick={handleCopy}
            style={{
              padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "transparent", color: "var(--muted-foreground)", fontSize: 11,
              display: "flex", alignItems: "center", gap: 4,
            }}
            title="Copy message"
          >
            {copied ? <Check style={{ width: 12, height: 12, color: "#22c55e" }} /> : <Copy style={{ width: 12, height: 12 }} />}
          </button>
          {isDuplicate && (
            <div style={{
              padding: "3px 10px", borderRadius: 6,
              background: "rgba(99,102,241,0.08)",
              color: "#818cf8", fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Link2 style={{ width: 10, height: 10 }} /> Duplicate
            </div>
          )}
          {!isLead && !isDuplicate && (
            <button
              onClick={() => onUseAsLead(msg.text, msg.id)}
              style={{
                padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                background: "rgba(99,102,241,0.1)",
                color: isDark ? "#818cf8" : "#6366f1",
                fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4,
                transition: "all 0.2s ease",
              }}
              title="Use as job lead"
            >
              Use as lead <ArrowRight style={{ width: 10, height: 10 }} />
            </button>
          )}
        </div>
      </div>

      {/* Candidacy score ring + Generate Proposal — only for leads */}
      {isLead && hasScore && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderRadius: 12, gap: 12,
          background: isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.04)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}>
          <ScoreRing score={msg.aiScore!} />
          {msg.aiRole && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {msg.aiRole}
              </p>
              {msg.aiCompany && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
                  @ {msg.aiCompany}
                </p>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {hasJobPost && (
              <a
                href={`/dashboard/jobs/${msg.jobPostId}`}
                style={{
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 5,
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(99,102,241,0.3)",
                }}
              >
                <Zap style={{ width: 11, height: 11 }} />
                Generate Proposal
              </a>
            )}
            {hasJobPost && (
              <a
                href={`/dashboard/jobs/${msg.jobPostId}`}
                style={{
                  padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(34,197,94,0.12)",
                  color: "#22c55e", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 4,
                  textDecoration: "none",
                }}
              >
                <ExternalLink style={{ width: 10, height: 10 }} />
                View Lead
              </a>
            )}
          </div>
        </div>
      )}

      {/* Message text */}
      <p style={{
        margin: 0, fontSize: 13, lineHeight: 1.6,
        color: "var(--foreground)", wordBreak: "break-word",
      }}>
        {msg.text}
      </p>

      {/* AI analysis expand */}
      {(isLead || msg.status === "analyzed") && hasScore && (
        <>
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: 0,
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600,
            }}
          >
            {showDetails ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
            {showDetails ? "Hide AI analysis" : "Show AI analysis"}
          </button>
          {showDetails && (
            <div style={{
              borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              paddingTop: 10, display: "flex", flexDirection: "column", gap: 8,
            }}>
              {msg.aiRole && (
                <div style={{ fontSize: 12, color: "var(--foreground)" }}>
                  <span style={{ fontWeight: 700 }}>Role:</span> {msg.aiRole}{msg.aiCompany ? ` @ ${msg.aiCompany}` : ""}
                </div>
              )}
              {msg.aiExplanation && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                  {msg.aiExplanation}
                </p>
              )}
              {(msg.matchedSkills?.length ?? 0) > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {msg.matchedSkills!.map(s => (
                    <span key={s} style={{
                      padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: "rgba(34,197,94,0.1)", color: "#22c55e",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}>✓ {s}</span>
                  ))}
                  {(msg.missingSkills ?? []).map(s => (
                    <span key={s} style={{
                      padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: "rgba(239,68,68,0.08)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}>✗ {s}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Message List (with multi-select + delete) ────────────────────────────────
function MessageList({ msgs, isDark, onUseAsLead, onDeleted }: {
  msgs: WAMessage[];
  isDark: boolean;
  onUseAsLead: (text: string, waMessageId?: string) => void;
  onDeleted?: (deletedIds: string[]) => void;
}) {
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode]     = useState(false);
  const [isDeleting, setIsDeleting]     = useState(false);
  const [deleteJobPosts, setDeleteJobPosts] = useState(true);
  const [deleteConfirm, setDeleteConfirm]   = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === msgs.length) setSelected(new Set());
    else setSelected(new Set(msgs.map(m => m.id)));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    setDeleteConfirm(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    if (!selected.size) return;
    setIsDeleting(true);
    try {
      const userEmail = "niteen.kumar@devstudio.com"; // TODO: session
      await deleteWAMessagesAction(userEmail, Array.from(selected), deleteJobPosts);
      onDeleted?.(Array.from(selected));
      exitSelectMode();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const leadsWithJobPost = msgs.filter(m => m.status === "lead" && !!m.jobPostId);
  const selectedLeadsWithJob = Array.from(selected).filter(id => leadsWithJobPost.some(m => m.id === id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Select mode toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, gap: 8,
      }}>
        {!selectMode ? (
          <button
            onClick={() => setSelectMode(true)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600,
            }}
          >
            <CheckSquare style={{ width: 12, height: 12 }} />
            Select
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {/* Select all */}
            <button
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                color: "var(--foreground)", fontSize: 11, fontWeight: 600,
              }}
            >
              {selected.size === msgs.length
                ? <CheckSquare style={{ width: 12, height: 12, color: "#6366f1" }} />
                : <Square style={{ width: 12, height: 12 }} />}
              {selected.size === msgs.length ? "Deselect All" : "Select All"}
            </button>

            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {selected.size} selected
            </span>

            {selected.size > 0 && (
              <>
                {/* Delete job posts toggle — only shows if selected has leads */}
                {selectedLeadsWithJob.length > 0 && (
                  <label style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, color: "var(--muted-foreground)", cursor: "pointer",
                    padding: "4px 10px", borderRadius: 8,
                    background: deleteJobPosts
                      ? "rgba(239,68,68,0.08)"
                      : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
                    border: `1px solid ${deleteJobPosts ? "rgba(239,68,68,0.25)" : "transparent"}`,
                    transition: "all 0.15s",
                  }}>
                    <input
                      type="checkbox"
                      checked={deleteJobPosts}
                      onChange={e => setDeleteJobPosts(e.target.checked)}
                      style={{ accentColor: "#ef4444", width: 12, height: 12 }}
                    />
                    <span style={{ color: deleteJobPosts ? "#ef4444" : undefined }}>
                      Also delete {selectedLeadsWithJob.length} job post{selectedLeadsWithJob.length > 1 ? "s" : ""}
                    </span>
                  </label>
                )}

                {/* Delete button */}
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: deleteConfirm ? "#ef4444" : "rgba(239,68,68,0.1)",
                    color: deleteConfirm ? "#fff" : "#ef4444",
                    fontSize: 11, fontWeight: 700,
                    transition: "all 0.2s",
                    boxShadow: deleteConfirm ? "0 2px 8px rgba(239,68,68,0.3)" : "none",
                  }}
                >
                  {isDeleting
                    ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                    : <Trash2 style={{ width: 11, height: 11 }} />}
                  {isDeleting ? "Deleting..." : deleteConfirm ? `Confirm Delete (${selected.size})` : `Delete (${selected.size})`}
                </button>
              </>
            )}

            {/* Cancel */}
            <button
              onClick={exitSelectMode}
              style={{
                padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "transparent", color: "var(--muted-foreground)", fontSize: 11, fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Messages grouped by date */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groupMessages(msgs).map(group => (
          <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", margin: "16px 0 8px", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                color: "var(--muted-foreground)", padding: "4px 12px", borderRadius: 12,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isDark={isDark}
                  onUseAsLead={onUseAsLead}
                  selected={selectMode ? selected.has(msg.id) : undefined}
                  onSelect={selectMode ? toggleSelect : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  // Step: 1 = Link WA, 2 = Select Group, 3 = Messages
  const [step, setStep]               = useState(1);
  const [status, setStatus]           = useState<WAStatus | null>(null);
  const [qrDataUrl, setQrDataUrl]     = useState<string | null>(null);
  const [groups, setGroups]           = useState<WAGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<WAGroup | null>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("wa_linked_group");
      return s ? JSON.parse(s) : null;
    }
    return null;
  });
  const [newMessages, setNewMessages]   = useState<WAMessage[]>([]);  // from WA, not yet in DB
  const [dbMessages, setDbMessages]    = useState<WAMessage[]>([]);   // all analyzed, from DB
  const [activeTab, setActiveTab]      = useState<"new" | "history">("new");
  const [historyFilter, setHistoryFilter] = useState<"all" | "lead" | "strong" | "good" | "analyzed" | "skipped" | "duplicate">("all");
  const [isSyncing, setIsSyncing]      = useState(false);
  const [isAnalyzing, setIsAnalyzing]  = useState(false);
  const [syncStatus, setSyncStatus]    = useState<string>("");
  const [syncStats, setSyncStats]      = useState<SyncStats | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [search, setSearch]            = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [serviceOffline, setServiceOffline] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const qrPollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAllPolling = useCallback(() => {
    if (qrPollRef.current)     { clearInterval(qrPollRef.current);     qrPollRef.current = null; }
    if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
  }, []);

  const startPolling = useCallback((fetchStatus: () => void, fetchQR: () => void) => {
    stopAllPolling();
    qrPollRef.current     = setInterval(fetchQR,     3000);
    statusPollRef.current = setInterval(fetchStatus, 8000);
  }, [stopAllPolling]);

  // ─── Poll status ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch("/api/whatsapp/status");
      const data = await res.json() as WAStatus;
      setStatus(data);
      setServiceOffline(false);

      if (data.connected) {
        // Connected — stop all polling, go to right step
        stopAllPolling();
        setQrDataUrl(null);
        setStep(prev => prev < 2 ? 2 : prev);
        const saved = localStorage.getItem("wa_linked_group");
        if (saved) setStep(3);
      }
    } catch {
      setServiceOffline(true);
    }
  }, [stopAllPolling]);

  // ─── Poll QR ────────────────────────────────────────────────────────────────
  const fetchQR = useCallback(async () => {
    try {
      const res  = await fetch("/api/whatsapp/qr");
      const data = await res.json();
      if (data.connected) {
        stopAllPolling();
        fetchStatus();
        return;
      }
      if (data.qr) setQrDataUrl(data.qr);
    } catch {}
  }, [fetchStatus, stopAllPolling]);

  // ─── Helper: map DB records to WAMessage ─────────────────────────────────────
  const mapDbToWAMessage = (m: any): WAMessage => ({
    id: m.whatsappMessageId,
    sender: m.senderPhone,
    senderName: m.senderName,
    text: m.text,
    timestamp: Math.floor(new Date(m.timestamp).getTime() / 1000),
    status: m.status as WAMessage["status"],
    aiScore: m.aiScore ?? undefined,
    aiRole: m.aiRole ?? undefined,
    aiCompany: m.aiCompany ?? undefined,
    aiExplanation: m.aiExplanation ?? undefined,
    matchedSkills: m.matchedSkills ?? [],
    missingSkills: m.missingSkills ?? [],
    isDuplicate: m.isDuplicate ?? undefined,
    duplicateOfJobId: m.duplicateOfJobId ?? undefined,
    jobPostId: m.jobPostId ?? undefined,
  });

  // ─── Hydrate history from DB (on mount & after analysis) ──────────────────
  const loadMessagesFromDb = useCallback(async (groupId: string) => {
    try {
      setIsLoadingHistory(true);
      const userEmail = "niteen.kumar@devstudio.com"; // TODO: get from session
      const dbMsgs = await getWAMessagesForGroupAction(userEmail, groupId);
      const mapped = (dbMsgs ?? []).map(mapDbToWAMessage);
      setDbMessages(mapped);
    } catch (err) {
      console.error("Error loading messages from DB:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // ─── Sync: fetch WA → identify new → show in New tab → analyze → move to History ──
  const syncMessages = useCallback(async () => {
    if (!selectedGroup) return;
    setIsSyncing(true);
    setSyncStatus("Fetching messages from WhatsApp...");
    setSyncStats(null);
    try {
      // Step 1: Fetch raw messages from WA service
      const res  = await fetch(`/api/whatsapp/messages/${encodeURIComponent(selectedGroup.id)}`);
      const data = await res.json();
      const waMessages: WAMessage[] = (data.messages || []).sort(
        (a: WAMessage, b: WAMessage) => b.timestamp - a.timestamp
      );
      setLastSyncTime(new Date());

      if (waMessages.length === 0) {
        setSyncStatus("");
        setIsSyncing(false);
        return;
      }

      // Step 2: Check which message IDs are already in DB
      const userEmail = "niteen.kumar@devstudio.com"; // TODO: get from session
      setSyncStatus("Checking for new messages...");
      const existingIds = await getExistingWAMessageIdsAction(
        userEmail,
        selectedGroup.id,
        waMessages.map((m) => m.id)
      );
      const existingSet = new Set(existingIds);

      // Step 3: Separate new (not in DB) from already-analyzed
      const brandNewMessages = waMessages.filter((m) => !existingSet.has(m.id));
      const alreadyInDb      = waMessages.filter((m) =>  existingSet.has(m.id));

      // Show new messages in "New Messages" tab immediately
      setNewMessages(brandNewMessages);
      setActiveTab("new");
      setIsSyncing(false);

      if (brandNewMessages.length === 0) {
        setSyncStatus("No new messages since last sync");
        // Still reload history to keep it fresh
        await loadMessagesFromDb(selectedGroup.id);
        return;
      }

      // Step 4: Run AI analysis on new messages
      setIsAnalyzing(true);
      setSyncStatus(`Analyzing ${brandNewMessages.length} new messages with AI...`);
      const analyzeRes = await fetch("/api/whatsapp/sync-and-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId:   selectedGroup.id,
          groupName: selectedGroup.name,
          userEmail,
          messages:  brandNewMessages.map((m) => ({
            id:         m.id,
            text:       m.text,
            sender:     m.sender,
            senderName: m.senderName,
            timestamp:  m.timestamp,
          })),
        }),
      });

      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        setSyncStats(analyzeData.stats ?? null);
        setSyncStatus("");
        // After analysis — clear new messages (they are now in DB/history)
        setNewMessages([]);
        // Reload history from DB
        await loadMessagesFromDb(selectedGroup.id);
        // Switch to history to show the freshly analyzed messages
        setActiveTab("history");
      } else {
        setSyncStatus("AI analysis failed — messages saved");
      }
    } catch {
      setSyncStatus("");
    } finally {
      setIsSyncing(false);
      setIsAnalyzing(false);
    }
  }, [selectedGroup, loadMessagesFromDb]);





  // ─── On mount ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    // Only start polling if not already connected (status check above will stop it)
    startPolling(fetchStatus, fetchQR);
    return () => stopAllPolling();
  }, [fetchStatus, fetchQR, startPolling, stopAllPolling]);

  // Restore step from saved group & load history from DB on mount
  useEffect(() => {
    if (selectedGroup && status?.connected) {
      setStep(3);
      loadMessagesFromDb(selectedGroup.id);
    }
  }, [selectedGroup, status, loadMessagesFromDb]);

  // ─── Load groups ─────────────────────────────────────────────────────────────
  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const res  = await fetch("/api/whatsapp/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };



  // ─── Disconnect ──────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setStep(1);
      setQrDataUrl(null);
      setGroups([]);
      setSelectedGroup(null);
      setNewMessages([]);
      setDbMessages([]);
      localStorage.removeItem("wa_linked_group");
      setStatus({ connected: false, phone: null, name: null, hasQR: false });
    } finally {
      setIsDisconnecting(false);
      // Start QR poll again
      qrPollRef.current = setInterval(fetchQR, 3000);
    }
  };

  // ─── Use message as job lead ─────────────────────────────────────────────────
  const handleUseAsLead = (text: string, waMessageId?: string) => {
    // Redirect to /dashboard/new with the text pre-filled and waMessageId linked
    const query: Record<string, string> = { text };
    if (waMessageId) {
      query.waMessageId = waMessageId;
    }
    const params = new URLSearchParams(query);
    window.location.href = `/dashboard/new?${params}`;
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const card: React.CSSProperties = {
    background:   isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    border:       `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
    borderRadius: 20,
    padding:      28,
  };

  return (
    <div style={{
      maxWidth: 860,
      margin: "0 auto",
      padding: "32px 24px 80px",
      fontFamily: "var(--font-sans)",
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #25d366, #128c7e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(37,211,102,0.3)",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              WhatsApp Groups
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              Sync job leads from your WhatsApp groups
            </p>
          </div>

          {status?.connected && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20,
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>
                  {status.name || status.phone || "Connected"}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                style={{
                  padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2",
                  color: "#ef4444", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {isDisconnecting ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <LogOut style={{ width: 12, height: 12 }} />}
                Unlink
              </button>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "14px 18px", borderRadius: 14, marginTop: 16,
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
        }}>
          <StepDot step={1} current={step} done={step > 1} label="Link WhatsApp" isDark={isDark} />
          <StepDot step={2} current={step} done={step > 2} label="Select Group" isDark={isDark} />
          <StepDot step={3} current={step} done={false} label="Sync Messages" isDark={isDark} />
        </div>
      </div>

      {/* ── Service offline warning ── */}
      {serviceOffline && (
        <div style={{
          ...card, marginBottom: 20,
          borderColor: "rgba(239,68,68,0.2)",
          background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle style={{ width: 18, height: 18, color: "#ef4444", flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                WhatsApp Service Offline
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: isDark ? "#f87171" : "#dc2626" }}>
                Start the WA service: <code style={{ background: "rgba(0,0,0,0.1)", padding: "1px 6px", borderRadius: 4 }}>cd wa-service && npm start</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 1 — Link WhatsApp
      ══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={card}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
              Scan QR Code
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
              Open WhatsApp → Linked Devices → Link a Device → Scan this code
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}>
            {qrDataUrl ? (
              <div style={{
                padding: 16, borderRadius: 20,
                background: "#fff",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}>
                <img src={qrDataUrl} alt="WhatsApp QR Code" style={{ width: 260, height: 260, display: "block" }} />
              </div>
            ) : (
              <div style={{
                width: 292, height: 292, borderRadius: 20,
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                border: `2px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <Loader2 style={{ width: 32, height: 32, color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  {serviceOffline ? "Start wa-service first" : "Generating QR code..."}
                </span>
              </div>
            )}
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 8,
            padding: "16px", borderRadius: 12,
            background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
            border: `1px solid ${isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)"}`,
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: isDark ? "#a5b4fc" : "#6366f1" }}>
              📱 How to link:
            </p>
            {["Open WhatsApp on your phone", "Tap Menu (⋮) or Settings → Linked Devices", "Tap 'Link a Device'", "Point camera at the QR code above"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 12, color: isDark ? "#a5b4fc" : "#6366f1", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 2 — Select Group
      ══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Select a Group</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                Choose the group you want to monitor for job leads
              </p>
            </div>
            <button
              onClick={loadGroups}
              disabled={isLoadingGroups}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {isLoadingGroups
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <RefreshCw style={{ width: 14, height: 14 }} />}
              Load Groups
            </button>
          </div>

          {groups.length > 0 && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--muted-foreground)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search groups..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px 10px 38px", borderRadius: 10,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  background: isDark ? "rgba(255,255,255,0.04)" : "#fafafa",
                  color: "var(--foreground)", fontSize: 13, outline: "none",
                }}
              />
            </div>
          )}

          {groups.length === 0 && !isLoadingGroups && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
              <Users style={{ width: 36, height: 36, margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Click "Load Groups" to fetch your WhatsApp groups</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  localStorage.setItem("wa_linked_group", JSON.stringify(group));
                  setStep(3);
                  setNewMessages([]);
                  setDbMessages([]);
                  setActiveTab("new");
                  setHistoryFilter("all");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12, border: "none",
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `hsl(${group.name.charCodeAt(0) * 8 % 360}, 55%, ${isDark ? "35%" : "60%"})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                }}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                    {group.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                    {group.participantCount} participants
                    {group.description && ` · ${group.description.slice(0, 60)}...`}
                  </p>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: "var(--muted-foreground)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 3 — Messages
      ══════════════════════════════════════════════════════════════ */}
      {step === 3 && selectedGroup && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Group header */}
          <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: `hsl(${selectedGroup.name.charCodeAt(0) * 8 % 360}, 55%, ${isDark ? "35%" : "60%"})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff",
              }}>
                {selectedGroup.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                  {selectedGroup.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                  {selectedGroup.participantCount} participants · Today's messages
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => { setStep(2); loadGroups(); }}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  background: "transparent", color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Change Group
              </button>
              <button
                onClick={syncMessages}
                disabled={isSyncing || isAnalyzing}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 10, border: "none",
                  background: (isSyncing || isAnalyzing) ? "#128c7e" : "linear-gradient(135deg, #25d366, #128c7e)",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: (isSyncing || isAnalyzing) ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
                  minWidth: 150,
                }}
              >
                {(isSyncing || isAnalyzing)
                  ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  : <RefreshCw style={{ width: 14, height: 14 }} />}
                {isSyncing ? "Fetching..." : isAnalyzing ? "Analyzing..." : "Sync Messages"}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={card}>
            {/* Tab bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
              <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 10, padding: 3 }}>
                {([
                  { key: "new",     label: "New Messages", icon: <Sparkles style={{ width: 11, height: 11 }} />,      count: newMessages.length },
                  { key: "history", label: "History",      icon: <Clock style={{ width: 11, height: 11 }} />,         count: dbMessages.length },
                ] as const).map(({ key, label, icon, count }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      style={{
                        padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 700, transition: "all 0.2s ease",
                        background: isActive ? (isDark ? "rgba(99,102,241,0.2)" : "#fff") : "transparent",
                        color: isActive ? (isDark ? "#a5b4fc" : "#6366f1") : "var(--muted-foreground)",
                        boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {icon}
                      {label}
                      {count > 0 && (
                        <span style={{
                          background: isActive ? "rgba(99,102,241,0.2)" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                          color: isActive ? (isDark ? "#a5b4fc" : "#6366f1") : "var(--muted-foreground)",
                          borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800,
                        }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {lastSyncTime && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 12 }}>
                  <Clock style={{ width: 13, height: 13 }} />
                  Last sync: {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>

            {/* Sync status */}
            {(isSyncing || isAnalyzing) && syncStatus && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                background: isDark ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.06)",
                border: "1px solid rgba(37,211,102,0.2)",
              }}>
                <Loader2 style={{ width: 13, height: 13, color: "#25d366", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#25d366", fontWeight: 500 }}>{syncStatus}</span>
              </div>
            )}

            {/* Post-sync stats banner */}
            {!isSyncing && syncStats && (
              <div style={{
                display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                background: isDark ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.05)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}>
                <Sparkles style={{ width: 14, height: 14, color: "#6366f1", flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>AI Analysis Complete</span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                  {syncStats.leads} lead{syncStats.leads !== 1 ? "s" : ""} found
                  {syncStats.duplicates > 0 ? ` · ${syncStats.duplicates} duplicate${syncStats.duplicates !== 1 ? "s" : ""}` : ""}
                  {syncStats.skipped > 0 ? ` · ${syncStats.skipped} skipped` : ""}
                </span>
              </div>
            )}

            {/* ── New Messages Tab ── */}
            {activeTab === "new" && (
              newMessages.length === 0 && !isSyncing ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
                  <Sparkles style={{ width: 40, height: 40, margin: "0 auto 16px", opacity: 0.25 }} />
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600 }}>No new messages</p>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Click "Sync Messages" to fetch new messages from this group.
                    <br />
                    <span style={{ opacity: 0.7, fontSize: 12 }}>Already analyzed messages are in the History tab.</span>
                  </p>
                </div>
              ) : (
                <>
                  {isAnalyzing && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                      background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}>
                      <Loader2 style={{ width: 13, height: 13, color: "#6366f1", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 500 }}>
                        AI is analyzing {newMessages.length} new messages... Results will appear in History.
                      </span>
                    </div>
                  )}
                  <MessageList msgs={newMessages} isDark={isDark} onUseAsLead={handleUseAsLead} />
                </>
              )
            )}

            {/* ── History Tab ── */}
            {activeTab === "history" && (
              isLoadingHistory ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
                  <Loader2 style={{ width: 28, height: 28, margin: "0 auto 10px", animation: "spin 1s linear infinite", opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: 13 }}>Loading history...</p>
                </div>
              ) : dbMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
                  <Clock style={{ width: 40, height: 40, margin: "0 auto 16px", opacity: 0.25 }} />
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600 }}>No history yet</p>
                  <p style={{ margin: 0, fontSize: 13 }}>Sync and analyze messages to start building your history.</p>
                </div>
              ) : (() => {
                // Filter definitions
                const FILTERS: Array<{
                  key: typeof historyFilter;
                  label: string;
                  color: string;
                  bg: string;
                  match: (m: WAMessage) => boolean;
                }> = [
                  { key: "all",      label: "All",        color: "#6366f1", bg: "rgba(99,102,241,0.1)",  match: () => true },
                  { key: "lead",     label: "Leads",      color: "#22c55e", bg: "rgba(34,197,94,0.1)",   match: (m) => m.status === "lead" },
                  { key: "strong",   label: "Strong Fit", color: "#22c55e", bg: "rgba(34,197,94,0.08)",  match: (m) => m.status === "lead" && (m.aiScore ?? 0) >= 75 },
                  { key: "good",     label: "Good Fit",   color: "#6366f1", bg: "rgba(99,102,241,0.08)", match: (m) => m.status === "lead" && (m.aiScore ?? 0) >= 55 && (m.aiScore ?? 0) < 75 },
                  { key: "analyzed", label: "Low Score",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)", match: (m) => m.status === "analyzed" },
                  { key: "skipped",  label: "Skipped",    color: "#6b7280", bg: "rgba(107,114,128,0.08)",match: (m) => m.status === "skipped" },
                  { key: "duplicate",label: "Duplicates", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", match: (m) => m.status === "duplicate" },
                ];

                const filtered = dbMessages.filter(
                  FILTERS.find((f) => f.key === historyFilter)?.match ?? (() => true)
                );

                return (
                  <>
                    {/* Filter chips */}
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16,
                      paddingBottom: 14,
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                    }}>
                      {FILTERS.map((f) => {
                        const count = dbMessages.filter(f.match).length;
                        if (f.key !== "all" && count === 0) return null;
                        const isActive = historyFilter === f.key;
                        return (
                          <button
                            key={f.key}
                            onClick={() => setHistoryFilter(f.key)}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                              fontSize: 11, fontWeight: 700,
                              background: isActive ? f.bg : (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
                              color: isActive ? f.color : "var(--muted-foreground)",
                              border: `1px solid ${isActive ? f.color + "40" : "transparent"}`,
                              transition: "all 0.18s ease",
                              transform: isActive ? "scale(1.04)" : "scale(1)",
                            }}
                          >
                            {f.label}
                            <span style={{
                              background: isActive ? f.color + "25" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"),
                              color: isActive ? f.color : "var(--muted-foreground)",
                              borderRadius: 8, padding: "1px 5px", fontSize: 10, fontWeight: 800,
                            }}>{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Filtered message list */}
                    {filtered.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)" }}>
                        <p style={{ margin: 0, fontSize: 13 }}>No messages match this filter.</p>
                      </div>
                    ) : (
                      <MessageList
                        msgs={filtered}
                        isDark={isDark}
                        onUseAsLead={handleUseAsLead}
                        onDeleted={async () => {
                          if (selectedGroup) await loadMessagesFromDb(selectedGroup.id);
                        }}
                      />
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
