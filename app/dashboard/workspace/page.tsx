"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase, Sparkles, Mail, Calendar, Plus, Search,
  TrendingUp, Users, Trash2, CheckSquare, Square, ArrowUpRight,
  AlertTriangle, X, Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { useDashboard } from "../../hooks/useDashboard";
import { useTheme } from "../../components/theme-provider";
import { deleteJobPostsAction } from "../../actions/db-actions";

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
interface DeleteModalProps {
  open: boolean;
  count: number;
  singleLabel?: string; // if deleting 1 specific job
  isDark: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ open, count, singleLabel, isDark, isDeleting, onConfirm, onCancel }: DeleteModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "modal-fade-in 0.18s ease",
      }}
    >
      <style>{`
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, borderRadius: 18,
          background: isDark ? "#111113" : "#FFFFFF",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: isDark
            ? "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
          padding: "32px 28px 24px",
          animation: "modal-slide-up 0.22s cubic-bezier(0.16,1,0.3,1)",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 0,
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          style={{
            position: "absolute", top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8,
            background: "transparent", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--muted-foreground)", opacity: 0.5,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.background = "transparent"; }}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 20,
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Trash2 style={{ width: 24, height: 24, color: "#ef4444" }} />
        </div>

        {/* Headline */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px", letterSpacing: -0.3 }}>
          Delete {count > 1 ? `${count} jobs` : "this job"}?
        </h3>

        {/* Subtext */}
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 6px", lineHeight: 1.6, maxWidth: 300 }}>
          {singleLabel
            ? <><strong style={{ color: "var(--foreground)" }}>{singleLabel}</strong> will be permanently removed.</>
            : <>You&apos;re about to permanently delete <strong style={{ color: "var(--foreground)" }}>{count} job {count === 1 ? "post" : "posts"}</strong> from your workspace.</>
          }
        </p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.55, margin: "0 0 28px" }}>
          This action cannot be undone.
        </p>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginBottom: 20 }} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              background: "transparent",
              color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10,
              border: "none",
              background: isDeleting ? "rgba(239,68,68,0.5)" : "#ef4444",
              color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!isDeleting) e.currentTarget.style.background = "#dc2626"; }}
            onMouseLeave={e => { if (!isDeleting) e.currentTarget.style.background = "#ef4444"; }}
          >
            {isDeleting
              ? <><span style={{ opacity: 0.7 }}>Deleting...</span></>
              : <><Trash2 style={{ width: 13, height: 13 }} /> Delete{count > 1 ? ` ${count}` : ""}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <OverviewContent />
    </Suspense>
  );
}

function OverviewContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const pendingJobId = searchParams.get("job") ?? undefined;

  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const db                     = useDashboard(userEmail, pendingJobId);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  const [selected, setSelected]   = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Modal state
  const [modal, setModal] = React.useState<{
    open: boolean;
    mode: "bulk" | "single";
    singleId?: string;
    singleLabel?: string;
  }>({ open: false, mode: "bulk" });

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const clearSelection = () => setSelected(new Set());

  // Open modal for bulk delete
  const requestBulkDelete = () => setModal({ open: true, mode: "bulk" });

  // Open modal for single item delete
  const requestSingleDelete = (id: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({ open: true, mode: "single", singleId: id, singleLabel: label });
  };

  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (modal.mode === "bulk") {
        await deleteJobPostsAction(Array.from(selected));
        await db.loadJobs();
        clearSelection();
      } else if (modal.singleId) {
        await db.handleDeleteJob(modal.singleId);
      }
      closeModal();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isReady || db.isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--primary)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading your workspace...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const hasSelection = selected.size > 0;

  const statusAccent: Record<string, string> = {
    sent:         "#3B82F6",
    interviewing: "#10B981",
    generated:    "#8B5CF6",
    draft:        "#F59E0B",
  };

  const card: React.CSSProperties = {
    background: isDark ? "#0C0C0E" : "#FFFFFF",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
    borderRadius: 12,
  };

  return (
    <>
      {/* ── Delete Confirmation Modal ── */}
      <DeleteModal
        open={modal.open}
        count={modal.mode === "bulk" ? selected.size : 1}
        singleLabel={modal.singleLabel}
        isDark={isDark}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={closeModal}
      />

      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: -0.4 }}>
            Outreach Workspace
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>
            {db.stats.total} job scans · {db.stats.active} active applications
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/new")}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          New Job Scan
        </button>
      </header>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { icon: Briefcase,  label: "Total Scans",    value: db.stats.total,          color: "#3B82F6" },
          { icon: TrendingUp, label: "Avg Match",      value: `${db.stats.avgMatch}%`, color: "#10B981" },
          { icon: Users,      label: "Active Apps",    value: db.stats.active,         color: "#8B5CF6" },
          { icon: Sparkles,   label: "Outreach Ready", value: db.stats.generated,      color: "#F59E0B" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ ...card, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon style={{ width: 18, height: 18, color }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--muted-foreground)", margin: 0, opacity: 0.8 }}>{label}</p>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: "var(--foreground)", margin: "2px 0 0", letterSpacing: -0.5, lineHeight: 1 }}>{value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", background: isDark ? "#0C0C0E" : "#FFFFFF", padding: "10px 12px", borderRadius: 12, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.5 }} />
          <input
            type="text"
            value={db.searchQuery}
            onChange={e => db.setSearchQuery(e.target.value)}
            placeholder="Search role, company, skills..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 34px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`, background: isDark ? "rgba(255,255,255,0.03)" : "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 2, padding: "3px", borderRadius: 9, background: "var(--muted)", border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, flexShrink: 0 }}>
          {["All", "Draft", "Generated", "Sent", "Interviewing"].map(s => {
            const active = db.statusFilter === s.toLowerCase();
            return (
              <button key={s} onClick={() => db.setStatusFilter(s.toLowerCase())} style={{ padding: "5px 13px", borderRadius: 7, border: "none", background: active ? "var(--primary)" : "transparent", color: active ? "var(--primary-foreground)" : "var(--muted-foreground)", fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s ease" }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* ── Toolbar ── */}
      {db.filteredJobs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", minHeight: 36 }}>
          <button
            onClick={toggleAll}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 7, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, background: "transparent", color: hasSelection ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
          >
            <div style={{ opacity: selected.size === db.filteredJobs.length && hasSelection ? 1 : 0.4 }}>
              <CheckSquare style={{ width: 13, height: 13 }} />
            </div>
            Select All
          </button>

          {hasSelection && (
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>
              {selected.size} selected
            </span>
          )}

          {hasSelection && (
            <>
              <button
                onClick={requestBulkDelete}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 7, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
                Delete {selected.size}
              </button>
              <button onClick={clearSelection} style={{ padding: "4px 10px", borderRadius: 7, border: "none", background: "transparent", color: "var(--muted-foreground)", fontSize: 12, cursor: "pointer" }}>
                Clear
              </button>
            </>
          )}

          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)", opacity: 0.6 }}>
            {db.filteredJobs.length} result{db.filteredJobs.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Job List ── */}
      {db.filteredJobs.length === 0 ? (
        <div style={{ ...card, padding: 56, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderStyle: "dashed" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Briefcase style={{ width: 24, height: 24, color: "var(--muted-foreground)", opacity: 0.5 }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>No results found</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.7 }}>Try adjusting your search or paste a new job post.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 12, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
          {db.filteredJobs.map((job, idx) => {
            const accent     = statusAccent[job.status?.toLowerCase()] ?? "#6B7280";
            const isSelected = selected.has(job.id);
            const isLast     = idx === db.filteredJobs.length - 1;

            return (
              <div
                key={job.id}
                onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                style={{
                  display: "flex", alignItems: "center",
                  padding: "13px 16px 13px 20px",
                  background: isSelected
                    ? (isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)")
                    : (isDark ? "#0C0C0E" : "#FFFFFF"),
                  borderBottom: isLast ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  cursor: "pointer", gap: 14, position: "relative",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)";
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = isDark ? "#0C0C0E" : "#FFFFFF";
                }}
              >
                {/* Left status strip */}
                <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 3, borderRadius: "0 3px 3px 0", background: accent, opacity: 0.65 }} />

                {/* Checkbox */}
                <div
                  onClick={e => toggleSelect(job.id, e)}
                  style={{ flexShrink: 0, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isSelected ? "#3B82F6" : "var(--muted-foreground)", opacity: isSelected ? 1 : 0.3, transition: "opacity 0.15s, color 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = isSelected ? "1" : "0.3"; }}
                >
                  {isSelected ? <CheckSquare style={{ width: 16, height: 16 }} /> : <Square style={{ width: 16, height: 16 }} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{job.role}</span>
                    {job.company && job.company !== "Not specified" && (
                      <>
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.45 }}>at</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", opacity: 0.7 }}>{job.company}</span>
                      </>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: db.getScoreBg(job.matchScore), color: db.getScoreColor(job.matchScore), border: `1px solid ${db.getScoreColor(job.matchScore)}33`, flexShrink: 0 }}>
                      {job.matchScore}%
                    </span>

                    {/* Source Type Badge */}
                    {(() => {
                      const isLinkedIn = job.tags.some(t => t.toLowerCase() === "linkedin" || t.toLowerCase() === "scraped") || job.generatedTemplates?.linkedin || job.notes?.toLowerCase().includes("linkedin");
                      const sourceText = isLinkedIn ? "LinkedIn Job" : "Normal Post";
                      const sourceColor = isLinkedIn ? "#0a66c2" : "#22c55e";
                      const sourceBg = isLinkedIn ? "rgba(10,102,194,0.12)" : "rgba(34,197,94,0.12)";
                      
                      return (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: sourceBg,
                          color: sourceColor,
                          border: `1px solid ${sourceColor}33`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}>
                          {isLinkedIn ? "💼" : "💬"} {sourceText}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    {job.contactEmail && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)", opacity: 0.65 }}>
                        <Mail style={{ width: 11, height: 11 }} />{job.contactEmail}
                      </span>
                    )}
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)", opacity: 0.65 }}>
                      <Calendar style={{ width: 11, height: 11 }} />
                      {new Date(job.postedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {job.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 50, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: "var(--muted-foreground)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` }}>{tag}</span>
                      ))}
                      {job.tags.length > 3 && <span style={{ fontSize: 10, color: "var(--muted-foreground)", opacity: 0.45 }}>+{job.tags.length - 3}</span>}
                    </div>
                  </div>
                </div>

                {/* Right: status + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 50, background: `${accent}18`, color: accent, border: `1px solid ${accent}33`, textTransform: "capitalize" }}>
                    {job.status}
                  </span>

                  {/* Single delete — hidden when bulk selection active */}
                  {!hasSelection && (
                    <button
                      onClick={e => requestSingleDelete(job.id, `${job.role}${job.company && job.company !== "Not specified" ? ` at ${job.company}` : ""}`, e)}
                      style={{ width: 28, height: 28, borderRadius: 7, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)", opacity: 0.35, transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.35"; }}
                      title="Delete"
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  )}

                  <div style={{ width: 28, height: 28, borderRadius: 7, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ArrowUpRight style={{ width: 13, height: 13, color: "var(--muted-foreground)", opacity: 0.5 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
