"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase, Sparkles, Mail, Calendar, Plus, Search, ChevronRight,
  TrendingUp, Users, Trash2, CheckSquare, Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../hooks/useDashboard";
import { useTheme } from "../components/theme-provider";
import { cardStyle, inputStyle } from "./styles";
import { deleteJobPostsAction } from "../actions/db-actions";

// ─── Suspense wrapper (required by useSearchParams) ───────────────────────────
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <OverviewContent />
    </Suspense>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function OverviewContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pendingJobId = searchParams.get("job") ?? undefined;

  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const db                     = useDashboard(userEmail, pendingJobId);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  // ─── Selection state ───
  const [selectMode, setSelectMode]       = React.useState(false);
  const [selected, setSelected]           = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting]       = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === db.filteredJobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(db.filteredJobs.map(j => j.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
    setDeleteConfirm(false);
  };

  const handleBulkDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    if (!selected.size) return;
    setIsDeleting(true);
    try {
      await deleteJobPostsAction(Array.from(selected));
      await db.loadJobs();
      exitSelectMode();
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isReady) return null;

  return (
    <>
      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Outreach Workspace
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            Organize outreach, manage parsed channels, and customize templates.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/new")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "var(--primary)", color: "var(--primary-foreground)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "var(--card-shadow)",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <Plus style={{ width: 15, height: 15 }} />
          <span>New Job Scan</span>
        </button>
      </header>

      {/* ── Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { icon: Briefcase,  label: "Total Scans",    value: db.stats.total },
          { icon: TrendingUp, label: "Avg Match",      value: `${db.stats.avgMatch}%` },
          { icon: Users,      label: "Active Apps",    value: db.stats.active },
          { icon: Sparkles,   label: "Outreach Ready", value: db.stats.generated },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: "var(--accent)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: 20, height: 20, color: "var(--foreground)" }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", margin: 0 }}>{label}</p>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: "4px 0 0" }}>{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", background: "var(--card)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
        <div style={{ position: "relative", width: 320 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
          <input
            type="text"
            value={db.searchQuery}
            onChange={e => db.setSearchQuery(e.target.value)}
            placeholder="Search role, company, skills..."
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--input)", border: "1px solid var(--border)" }}>
          {["All", "Draft", "Generated", "Sent", "Interviewing"].map(s => (
            <button
              key={s}
              onClick={() => db.setStatusFilter(s.toLowerCase())}
              style={{
                padding: "6px 14px", borderRadius: 7, border: "none",
                background: db.statusFilter === s.toLowerCase() ? "var(--primary)" : "transparent",
                color: db.statusFilter === s.toLowerCase() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Selection Toolbar ── */}
      {db.jobs.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          margin: "8px 0 2px", padding: "0 4px",
        }}>
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
            >
              <CheckSquare style={{ width: 13, height: 13 }} />
              Select Multiple
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <button
                onClick={toggleAll}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  color: "var(--foreground)", fontSize: 12, fontWeight: 600,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
              >
                {selected.size === db.filteredJobs.length ? "Deselect All" : "Select All"}
              </button>

              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>
                {selected.size} selected
              </span>

              {selected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: deleteConfirm ? "#ef4444" : "rgba(239,68,68,0.1)",
                    color: deleteConfirm ? "#fff" : "#ef4444",
                    fontSize: 12, fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                >
                  <Trash2 style={{ width: 13, height: 13 }} />
                  {isDeleting ? "Deleting..." : deleteConfirm ? "Confirm Delete" : "Delete Selected"}
                </button>
              )}

              <button
                onClick={exitSelectMode}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: "transparent", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 600,
                  marginLeft: "auto",
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Job List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {db.filteredJobs.length === 0 ? (
          <div style={{ ...cardStyle, padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderStyle: "dashed" }}>
            <Briefcase style={{ width: 36, height: 36, color: "var(--border)", marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--muted-foreground)" }}>No job postings match your filters.</p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.7, marginTop: 4 }}>Try expanding your search or paste a new post.</p>
          </div>
        ) : db.filteredJobs.map(job => (
          <div
            key={job.id}
            onClick={() => {
              if (selectMode) {
                toggleSelect(job.id);
              } else {
                router.push(`/dashboard/jobs/${job.id}`);
              }
            }}
            style={{
              ...cardStyle,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              border: `1px solid ${
                selected.has(job.id)
                  ? "rgba(239,68,68,0.4)"
                  : isDark
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.07)"
              }`,
              background: selected.has(job.id)
                ? (isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.03)")
                : undefined,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = "var(--card-shadow)";
              e.currentTarget.style.borderColor = selected.has(job.id) ? "rgba(239,68,68,0.6)" : "var(--muted-foreground)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = selected.has(job.id) ? "rgba(239,68,68,0.4)" : "var(--border)";
            }}
          >
            {/* Checkbox overlay (only in selectMode) */}
            {selectMode && (
              <div style={{ marginRight: 16, display: "flex", alignItems: "center", color: selected.has(job.id) ? "#ef4444" : "var(--muted-foreground)", opacity: selected.has(job.id) ? 1 : 0.6 }}>
                {selected.has(job.id) ? <CheckSquare style={{ width: 18, height: 18 }} /> : <Square style={{ width: 18, height: 18 }} />}
              </div>
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{job.role}</h4>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.8 }}>at</span>
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", fontWeight: 500 }}>{job.company}</span>
                <div style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, fontWeight: 700, background: db.getScoreBg(job.matchScore), color: db.getScoreColor(job.matchScore), border: `1px solid ${db.getScoreColor(job.matchScore)}22` }}>
                  {job.matchScore}% Match
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "var(--muted-foreground)", opacity: 0.8, flexWrap: "wrap" }}>
                {job.contactEmail && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Mail style={{ width: 13, height: 13, color: "var(--muted-foreground)", opacity: 0.6 }} />
                    <span>{job.contactEmail}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar style={{ width: 13, height: 13, color: "var(--muted-foreground)", opacity: 0.6 }} />
                  <span>{new Date(job.postedDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {job.tags.slice(0, 4).map((tag, i) => (
                  <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 50, background: "var(--input)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{tag}</span>
                ))}
                {job.tags.length > 4 && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.6 }}>+{job.tags.length - 4} more</span>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ ...db.getStatusStyle(job.status), padding: "4px 12px", borderRadius: 50, fontSize: 11, fontWeight: 600 }}>{job.status}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Delete button (only when not in selectMode) */}
                {!selectMode && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete the job post "${job.role}" at "${job.company}"?`)) {
                        try {
                          await db.handleDeleteJob(job.id);
                        } catch (err) {
                          console.error("Failed to delete job post:", err);
                        }
                      }
                    }}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: "transparent", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", color: "var(--muted-foreground)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                    title="Delete job post"
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                )}
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--input)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.6 }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
