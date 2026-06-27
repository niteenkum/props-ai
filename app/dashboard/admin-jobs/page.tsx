"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Briefcase, Sparkles, Plus, Search,
  AlertCircle, Loader2, ChevronDown, ChevronUp,
  CheckCircle, ShieldAlert, Award
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../components/theme-provider";
import {
  getAdminJobsAction,
  getUserAdminJobScoreAction,
  promoteAdminJobToLeadAction
} from "../../actions/db-actions";

interface AdminJobScore {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation?: string;
  suggestAttachResume?: boolean;
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--primary)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading shared scans...</p>
      </div>
    }>
      <AdminJobsContent />
    </Suspense>
  );
}

function AdminJobsContent() {
  const router = useRouter();
  const { userEmail, userRole, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scores, setScores] = useState<Record<string, AdminJobScore>>({});
  const [calculatingIds, setCalculatingIds] = useState<Set<string>>(new Set());
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load Admin Jobs
  const loadJobs = async () => {
    setLoading(true);
    try {
      const adminJobs = await getAdminJobsAction();
      setJobs(adminJobs);
    } catch (err) {
      console.error("Failed to load admin jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && userEmail) {
      loadJobs();
    }
  }, [isReady, userEmail]);

  // Trigger match score calculation
  const handleCalculateScore = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (calculatingIds.has(jobId)) return;

    setCalculatingIds(prev => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });

    try {
      const scoreData = await getUserAdminJobScoreAction(userEmail, jobId);
      setScores(prev => ({
        ...prev,
        [jobId]: scoreData
      }));
      // Auto-expand card on successful calculation to show breakdown
      setExpandedIds(prev => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
    } catch (err) {
      console.error("Failed to calculate score:", err);
    } finally {
      setCalculatingIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  // Promote job to personal lead
  const handlePromoteToLead = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (promotingIds.has(jobId)) return;

    setPromotingIds(prev => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });

    try {
      const res = await promoteAdminJobToLeadAction(userEmail, jobId);
      if (res.success && res.jobId) {
        router.push(`/dashboard/workspace?job=${res.jobId}`);
      } else {
        alert(res.error || "Failed to create lead.");
      }
    } catch (err) {
      console.error("Promotion failed:", err);
    } finally {
      setPromotingIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const toggleExpand = (jobId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });
  };

  const filteredJobs = jobs.filter(job => {
    const q = searchQuery.toLowerCase();
    return (
      job.role.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return "#10B981"; // Emerald
    if (score >= 65) return "#6366F1"; // Indigo
    if (score >= 45) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  const getScoreBg = (score: number) => {
    const color = getScoreColor(score);
    return `${color}15`;
  };

  const cardStyle: React.CSSProperties = {
    background: isDark ? "#0C0C0E" : "#FFFFFF",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
    borderRadius: 12,
  };

  if (!isReady || loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12 }}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--primary)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading shared scans...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: -0.4 }}>
            Admin Shared Scans
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>
            Browse and match jobs scanned globally by Superadmins.
          </p>
        </div>
      </header>

      {/* ── Search & Filter Bar ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", background: isDark ? "#0C0C0E" : "#FFFFFF", padding: "10px 12px", borderRadius: 12, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.5 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search role, company, skills in shared library..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 34px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`, background: isDark ? "rgba(255,255,255,0.03)" : "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none" }}
          />
        </div>
      </div>

      {/* ── Jobs List ── */}
      {filteredJobs.length === 0 ? (
        <div style={{ ...cardStyle, padding: 56, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderStyle: "dashed" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Briefcase style={{ width: 24, height: 24, color: "var(--muted-foreground)", opacity: 0.5 }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>No shared scans found</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.7 }}>Check back later or scan a job as a Superadmin.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredJobs.map((job) => {
            const hasScore = scores[job.id] !== undefined;
            const scoreData = scores[job.id];
            const isCalculating = calculatingIds.has(job.id);
            const isPromoting = promotingIds.has(job.id);
            const isExpanded = expandedIds.has(job.id);

            return (
              <div
                key={job.id}
                style={{
                  ...cardStyle,
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(job.id)}
              >
                {/* Upper Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{job.role}</span>
                      {job.company && job.company !== "Not specified" && (
                        <>
                          <span style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.5 }}>at</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", opacity: 0.8 }}>{job.company}</span>
                        </>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        Scanned: {new Date(job.postedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {job.tags.map((tag: string, i: number) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 50, background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)", color: "var(--muted-foreground)", border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}` }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column (Score and Promo) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {/* Score display or calculate button */}
                    {hasScore ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 8,
                          background: getScoreBg(scoreData.matchScore),
                          color: getScoreColor(scoreData.matchScore),
                          border: `1px solid ${getScoreColor(scoreData.matchScore)}33`,
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          <Award size={13} /> {scoreData.matchScore}% Match
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={e => handleCalculateScore(job.id, e)}
                        disabled={isCalculating}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                          background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                          color: "var(--foreground)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isCalculating ? "not-allowed" : "pointer",
                          transition: "all 0.15s"
                        }}
                        onMouseEnter={e => { if (!isCalculating) e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"; }}
                        onMouseLeave={e => { if (!isCalculating) e.currentTarget.style.background = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)"; }}
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} style={{ color: "#8b5cf6" }} />
                            Match Score
                          </>
                        )}
                      </button>
                    )}

                    {/* Promote to Lead button */}
                    <button
                      onClick={e => handlePromoteToLead(job.id, e)}
                      disabled={isPromoting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isPromoting ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)"
                      }}
                      onMouseEnter={e => { if (!isPromoting) e.currentTarget.style.opacity = "0.9"; }}
                      onMouseLeave={e => { if (!isPromoting) e.currentTarget.style.opacity = "1"; }}
                    >
                      {isPromoting ? (
                        <>
                          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                          Creating Lead...
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          Create Lead
                        </>
                      )}
                    </button>

                    {/* Expand indicator */}
                    <div style={{ color: "var(--muted-foreground)", opacity: 0.4 }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div style={{
                    marginTop: 4,
                    paddingTop: 12,
                    borderTop: `1px solid ${isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12
                  }}>
                    {/* If score has been computed, show skills breakdown */}
                    {hasScore && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={{ background: isDark ? "rgba(16, 185, 129, 0.03)" : "rgba(16, 185, 129, 0.02)", border: `1px solid ${isDark ? "rgba(16, 185, 129, 0.08)" : "rgba(16, 185, 129, 0.08)"}`, borderRadius: 8, padding: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#10B981", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                            <CheckCircle size={11} /> Matched Skills
                          </span>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {scoreData.matchedSkills.length === 0 ? (
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>None matched</span>
                            ) : (
                              scoreData.matchedSkills.map((s, idx) => (
                                <span key={idx} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>{s}</span>
                              ))
                            )}
                          </div>
                        </div>

                        <div style={{ background: isDark ? "rgba(239, 68, 68, 0.03)" : "rgba(239, 68, 68, 0.02)", border: `1px solid ${isDark ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.08)"}`, borderRadius: 8, padding: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#EF4444", display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                            <ShieldAlert size={11} /> Missing Skills
                          </span>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {scoreData.missingSkills.length === 0 ? (
                              <span style={{ fontSize: 11, color: "#10B981" }}>Fully matched!</span>
                            ) : (
                              scoreData.missingSkills.map((s, idx) => (
                                <span key={idx} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }}>{s}</span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI match explanation */}
                    {hasScore && scoreData.explanation && (
                      <div style={{ background: isDark ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.01)", borderRadius: 8, padding: 12, border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"}` }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>AI Candidacy Evaluation</span>
                        <p style={{ fontSize: 12.5, color: "var(--foreground)", opacity: 0.85, margin: 0, lineHeight: 1.5 }}>{scoreData.explanation}</p>
                      </div>
                    )}

                    {/* Job Text Preview */}
                    <div style={{ background: isDark ? "rgba(255, 255, 255, 0.01)" : "rgba(0, 0, 0, 0.005)", borderRadius: 8, padding: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>Job Description Preview</span>
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.4, maxHeight: 150, overflowY: "auto" }}>
                        {job.originalText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
