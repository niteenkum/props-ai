"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Briefcase, Sparkles, Plus, Search,
  AlertCircle, Loader2, ChevronDown, ChevronUp,
  CheckCircle, ShieldAlert, Award, EyeOff, RefreshCw, Check
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../components/theme-provider";
import {
  getAdminJobsAction,
  getUserAdminJobScoreAction,
  promoteAdminJobToLeadAction,
  getImportedJobKeysAction
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
  const [importedMapping, setImportedMapping] = useState<Record<string, string>>({});
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [currentTab, setCurrentTab] = useState<"active" | "imported" | "ignored">("active");

  useEffect(() => {
    if (isReady && userEmail) {
      const init = async () => {
        setLoading(true);
        try {
          const [adminJobs, mapping] = await Promise.all([
            getAdminJobsAction(),
            getImportedJobKeysAction(userEmail)
          ]);
          setJobs(adminJobs);
          setImportedMapping(mapping);

          if (typeof window !== "undefined") {
            const stored = localStorage.getItem("ignored_job_ids");
            if (stored) {
              try {
                setIgnoredIds(new Set(JSON.parse(stored)));
              } catch {}
            }
          }
        } catch (err) {
          console.error("Failed to initialize curated jobs feed:", err);
        } finally {
          setLoading(false);
        }
      };
      init();
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
        router.push(`/dashboard/jobs/${res.jobId}`);
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

  const handleIgnoreJob = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIgnoredIds(prev => {
      const next = new Set(prev);
      next.add(jobId);
      if (typeof window !== "undefined") {
        localStorage.setItem("ignored_job_ids", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleRestoreJob = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIgnoredIds(prev => {
      const next = new Set(prev);
      next.delete(jobId);
      if (typeof window !== "undefined") {
        localStorage.setItem("ignored_job_ids", JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const getJobKey = (job: any) => `${job.company?.toLowerCase() || ""}:${job.role.toLowerCase()}`;

  const searchMatches = jobs.filter(job => {
    const q = searchQuery.toLowerCase();
    return (
      job.role.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  const activeJobs = searchMatches.filter(job => {
    const isIgnored = ignoredIds.has(job.id);
    const isImported = importedMapping[getJobKey(job)] !== undefined;
    return !isIgnored && !isImported;
  });

  const importedJobs = searchMatches.filter(job => {
    return importedMapping[getJobKey(job)] !== undefined;
  });

  const ignoredJobs = searchMatches.filter(job => {
    return ignoredIds.has(job.id) && importedMapping[getJobKey(job)] === undefined;
  });

  const displayJobs = currentTab === "active"
    ? activeJobs
    : currentTab === "imported"
      ? importedJobs
      : ignoredJobs;

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
      <style>{`
        .job-list-row:hover {
          background: ${isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.01)"};
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0, letterSpacing: -0.4 }}>
            Curated Job Feed
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 3 }}>
            Explore exclusive, hand-picked job opportunities curated by our platform team. Match &amp; parse candidacy using AI credits.
          </p>
        </div>
      </header>

      {/* ── Tabs Bar ── */}
      <div style={{
        display: "flex",
        gap: 12,
        borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
        marginBottom: 16,
        paddingBottom: 8,
        flexWrap: "wrap"
      }}>
        {[
          { id: "active", label: "Available Opportunities", count: activeJobs.length },
          { id: "imported", label: "Imported Leads", count: importedJobs.length },
          { id: "ignored", label: "Skipped Jobs", count: ignoredJobs.length },
        ].map(tab => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              style={{
                background: isActive ? "var(--foreground)" : "transparent",
                color: isActive ? "var(--background)" : "var(--foreground)",
                border: "2px solid var(--foreground)",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transform: isActive ? "translateY(-1px)" : "none",
                boxShadow: isActive ? "none" : "2px 2px 0px 0px var(--foreground)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 10,
                background: isActive ? "var(--background)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                padding: "1px 6px",
                borderRadius: 50,
                fontWeight: 900
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", background: isDark ? "#09090b" : "#FFFFFF", padding: "10px 12px", borderRadius: 12, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.5 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search role, company, skills in shared library..."
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 34px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, background: isDark ? "rgba(255,255,255,0.03)" : "var(--background)", color: "var(--foreground)", fontSize: 13, outline: "none" }}
          />
        </div>
      </div>

      {/* ── Jobs List ── */}
      {displayJobs.length === 0 ? (
        <div style={{ background: isDark ? "#09090b" : "#ffffff", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, borderRadius: 12, padding: 56, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", borderStyle: "dashed" }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Briefcase style={{ width: 24, height: 24, color: "var(--muted-foreground)", opacity: 0.5 }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>No jobs found in this section</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.7 }}>Browse other tabs or search for different terms.</p>
        </div>
      ) : (
        <div style={{
          background: isDark ? "#09090b" : "#ffffff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          borderRadius: 12,
        }}>
          {displayJobs.map((job, index) => {
            const hasScore = scores[job.id] !== undefined;
            const scoreData = scores[job.id];
            const isCalculating = calculatingIds.has(job.id);
            const isPromoting = promotingIds.has(job.id);
            const isLast = index === displayJobs.length - 1;

            const key = getJobKey(job);
            const workspaceJobId = importedMapping[key];

            return (
              <div
                key={job.id}
                className="job-list-row"
                style={{
                  padding: "18px 20px",
                  borderBottom: isLast ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "background 0.2s ease",
                }}
              >
                {/* Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{job.role}</span>
                      {job.company && job.company !== "Not specified" && (
                        <>
                          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>at</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{job.company}</span>
                        </>
                      )}
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.7 }}>• Posted {new Date(job.postedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                      {job.tags.map((tag: string, i: number) => (
                        <span key={i} style={{
                          fontSize: 9.5, padding: "1px 6px", borderRadius: 4,
                          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                          color: "var(--muted-foreground)", fontWeight: 500
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {hasScore ? (
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                        background: getScoreBg(scoreData.matchScore), color: getScoreColor(scoreData.matchScore),
                        border: `1px solid ${getScoreColor(scoreData.matchScore)}33`,
                        display: "inline-flex", alignItems: "center"
                      }}>
                        {scoreData.matchScore}% Match
                      </span>
                    ) : (
                      <button
                        onClick={e => handleCalculateScore(job.id, e)}
                        disabled={isCalculating}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                          borderRadius: 6, border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                          background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                          color: "var(--foreground)", fontSize: 11, fontWeight: 600, cursor: isCalculating ? "not-allowed" : "pointer"
                        }}
                      >
                        {isCalculating ? "Analyzing..." : "Calculate Match"}
                      </button>
                    )}

                    {currentTab === "active" && (
                      <>
                        <button
                          onClick={e => handlePromoteToLead(job.id, e)}
                          disabled={isPromoting}
                          style={{
                            display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                            borderRadius: 6, border: "none", background: "var(--primary)",
                            color: "var(--primary-foreground)", fontSize: 11, fontWeight: 600, cursor: isPromoting ? "not-allowed" : "pointer"
                          }}
                        >
                          {isPromoting ? "Creating..." : "Create Personal Lead"}
                        </button>
                        <button
                          onClick={e => handleIgnoreJob(job.id, e)}
                          style={{
                            display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                            borderRadius: 6, border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}`,
                            background: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                            color: "var(--foreground)", fontSize: 11, fontWeight: 600, cursor: "pointer"
                          }}
                        >
                          <EyeOff size={11} /> Skip
                        </button>
                      </>
                    )}

                    {currentTab === "imported" && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (workspaceJobId) {
                            router.push(`/dashboard/jobs/${workspaceJobId}`);
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                          borderRadius: 6, border: "2px solid #10b981", background: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981", fontSize: 11, fontWeight: 800, cursor: "pointer"
                        }}
                      >
                        <Check size={12} /> View in Workspace
                      </button>
                    )}

                    {currentTab === "ignored" && (
                      <button
                        onClick={e => handleRestoreJob(job.id, e)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                          borderRadius: 6, border: `1px solid var(--foreground)`, background: "var(--input)",
                          color: "var(--foreground)", fontSize: 11, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        <RefreshCw size={11} /> Restore to Feed
                      </button>
                    )}
                  </div>
                </div>

                {/* Description Preview */}
                <p style={{
                  fontSize: 12.5, color: "var(--muted-foreground)", margin: 0,
                  lineHeight: 1.45, opacity: 0.95
                }}>
                  {job.originalText}
                </p>

                {/* AI Score Breakdown & Compatibility Info */}
                {hasScore && (
                  <div style={{
                    marginTop: 4, padding: "10px 12px", borderRadius: 8,
                    background: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.005)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
                    display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5
                  }}>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#10B981" }}>Matched Skills: </span>
                        <span style={{ color: "var(--foreground)" }}>
                          {scoreData.matchedSkills.length === 0 ? "None" : scoreData.matchedSkills.join(", ")}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, color: "#EF4444" }}>Missing Skills: </span>
                        <span style={{ color: "var(--foreground)" }}>
                          {scoreData.missingSkills.length === 0 ? "Fully matched!" : scoreData.missingSkills.join(", ")}
                        </span>
                      </div>
                    </div>
                    {scoreData.explanation && (
                      <p style={{ margin: "4px 0 0", color: "var(--muted-foreground)", fontSize: 11.5, lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 700, color: "var(--foreground)" }}>AI Analysis: </span>
                        {scoreData.explanation}
                      </p>
                    )}
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
