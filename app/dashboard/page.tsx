"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Briefcase, Sparkles, Mail, Calendar, Plus, Search, ChevronRight,
  TrendingUp, Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "../hooks/useDashboard";
import { useTheme } from "../components/theme-provider";
import { cardStyle, inputStyle } from "./styles";

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
            onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
            style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--card-shadow)"; e.currentTarget.style.borderColor = "var(--muted-foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
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
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--input)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.6 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
