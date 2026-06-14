"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Video, Calendar, CheckCircle2, Clock, ExternalLink,
  Loader2, Sparkles, Plus, RefreshCw, AlertTriangle,
  X, Check,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../components/theme-provider";
import {
  getFollowUpsAction,
  markFollowUpDoneAction,
  cancelFollowUpAction,
  isCalendarConnectedAction,
  backfillMeetLinkAction,
  type FollowUpWithJob,
} from "../../actions/calendar-actions";
import { cardStyle } from "../styles";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtRelative(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const mins  = Math.floor(absDiff / 60000);
  const hrs   = Math.floor(mins / 60);
  const days  = Math.floor(hrs / 24);
  if (diff < 0) {
    if (mins < 60)  return `${mins}m overdue`;
    if (hrs  < 24)  return `${hrs}h overdue`;
    return `${days}d overdue`;
  }
  if (mins < 60)  return `in ${mins}m`;
  if (hrs  < 24)  return `in ${hrs}h`;
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

function isOverdue(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

// ─── FollowUp Card ────────────────────────────────────────────────────────────

function FollowUpCard({
  fu,
  isDark,
  onDone,
  onCancel,
}: {
  fu: FollowUpWithJob;
  isDark: boolean;
  onDone: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const overdue   = isOverdue(fu.scheduledAt) && fu.status === "pending";
  const done      = fu.status === "done";
  const cancelled = fu.status === "cancelled";

  // Backfill meet link if missing but gcalEventId exists
  const [meetLink, setMeetLink] = React.useState<string | null>(fu.meetLink ?? null);
  const [fetchingMeet, setFetchingMeet] = React.useState(false);

  React.useEffect(() => {
    if (!meetLink && fu.gcalEventId && fu.status === "pending") {
      // Auto-try to backfill in background
      backfillMeetLinkAction(fu.userEmail, fu.id)
        .then(r => { if (r.meetLink) setMeetLink(r.meetLink); })
        .catch(() => {});
    }
  }, [fu.id, fu.gcalEventId, fu.userEmail, meetLink, fu.status]);

  const handleGetMeetLink = async () => {
    setFetchingMeet(true);
    const r = await backfillMeetLinkAction(fu.userEmail, fu.id);
    if (r.meetLink) setMeetLink(r.meetLink);
    setFetchingMeet(false);
  };

  const accentColor = done ? "#22c55e" : cancelled ? "#6b7280" : overdue ? "#f59e0b" : "#6366f1";
  const accentBg    = done
    ? (isDark ? "rgba(34,197,94,0.06)"  : "#f0fdf4")
    : cancelled
    ? (isDark ? "rgba(107,114,128,0.06)" : "#f9fafb")
    : overdue
    ? (isDark ? "rgba(245,158,11,0.06)" : "#fffbeb")
    : (isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.02)");

  return (
    <div style={{
      ...cardStyle,
      padding: "18px 20px",
      borderLeft: `3px solid ${accentColor}`,
      background: accentBg,
      display: "flex", flexDirection: "column", gap: 12,
      opacity: cancelled ? 0.55 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status badge + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 50,
              background: `${accentColor}18`, color: accentColor,
              border: `1px solid ${accentColor}33`,
              textTransform: "uppercase", letterSpacing: 0.8,
            }}>
              {done ? "✅ Done" : cancelled ? "Cancelled" : overdue ? "⚠ Overdue" : "📅 Upcoming"}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600 }}>
              {fmtRelative(fu.scheduledAt)}
            </span>
          </div>

          {/* Title */}
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 4px", lineHeight: 1.3 }}>
            {fu.title}
          </p>

          {/* Job info */}
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
            {fu.job.role} · <strong style={{ color: "var(--foreground)" }}>{fu.job.company}</strong>
            {fu.attendeeEmail && <> · {fu.attendeeEmail}</>}
          </p>

          {/* Datetime */}
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.7, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar style={{ width: 11, height: 11 }} />
            {fmtDateTime(fu.scheduledAt)} · {fu.durationMin} min
          </p>
        </div>

        {/* Meet link badge */}
        {meetLink ? (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "10px 14px", borderRadius: 12, textDecoration: "none", flexShrink: 0,
              background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)"; }}
          >
            <Video style={{ width: 18, height: 18, color: "#818cf8" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#818cf8" }}>Join Meet</span>
          </a>
        ) : fu.gcalEventId && fu.status === "pending" ? (
          // No meetLink yet — show gcalEventUrl as primary Meet entry point
          // (Google Calendar event page has the Meet link visible)
          fu.gcalEventUrl ? (
            <a
              href={fu.gcalEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Google Calendar event — Meet link is inside"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "10px 12px", borderRadius: 12, textDecoration: "none", flexShrink: 0,
                background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <Video style={{ width: 16, height: 16, color: "#818cf8" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#818cf8" }}>Open Event</span>
            </a>
          ) : (
            <button
              onClick={handleGetMeetLink}
              disabled={fetchingMeet}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "10px 12px", borderRadius: 12, flexShrink: 0, cursor: fetchingMeet ? "default" : "pointer",
                background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
                border: "1px dashed rgba(99,102,241,0.2)",
              }}
            >
              {fetchingMeet
                ? <Loader2 style={{ width: 16, height: 16, color: "#818cf8", animation: "spin 1s linear infinite" }} />
                : <Video style={{ width: 16, height: 16, color: "#818cf8", opacity: 0.5 }} />
              }
              <span style={{ fontSize: 9, fontWeight: 600, color: "#818cf8", opacity: 0.7 }}>
                {fetchingMeet ? "..." : "Refresh"}
              </span>
            </button>
          )
        ) : null}
      </div>

      {/* Notes */}
      {fu.notes && (
        <p style={{
          fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6,
          padding: "8px 12px", borderRadius: 8,
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          margin: 0,
        }}>
          {fu.notes}
        </p>
      )}

      {/* Actions */}
      {fu.status === "pending" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onDone(fu.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
              background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
              color: isDark ? "#4ade80" : "#16a34a",
            }}
          >
            <Check style={{ width: 12, height: 12 }} /> Mark Done
          </button>
          {fu.gcalEventUrl && (
            <a
              href={fu.gcalEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                textDecoration: "none",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: "transparent", color: "var(--muted-foreground)",
              }}
            >
              <ExternalLink style={{ width: 12, height: 12 }} /> Calendar
            </a>
          )}
          <button
            onClick={() => onCancel(fu.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "#fecaca"}`,
              background: "transparent", color: isDark ? "#f87171" : "#dc2626",
            }}
          >
            <X style={{ width: 12, height: 12 }} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [followUps, setFollowUps]               = useState<FollowUpWithJob[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [filter, setFilter]                     = useState<"all" | "upcoming" | "overdue" | "done">("upcoming");
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null); // null = loading

  // Check calendar connection status
  const checkCalendarStatus = useCallback(async () => {
    if (!isReady) return;
    // If URL param says just connected, trust it immediately
    if (searchParams?.get("connected") === "calendar") {
      setCalendarConnected(true);
      return;
    }
    const connected = await isCalendarConnectedAction(userEmail);
    setCalendarConnected(connected);
  }, [userEmail, isReady, searchParams]);

  useEffect(() => { checkCalendarStatus(); }, [checkCalendarStatus]);

  const load = useCallback(async () => {
    if (!isReady) return;
    setLoading(true);
    const data = await getFollowUpsAction(userEmail, filter);
    setFollowUps(data);
    setLoading(false);
  }, [userEmail, isReady, filter]);

  useEffect(() => { load(); }, [load]);

  const handleDone = async (id: string) => {
    await markFollowUpDoneAction(userEmail, id);
    await load();
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this follow-up? This will also remove the Google Calendar event.")) return;
    await cancelFollowUpAction(userEmail, id);
    await load();
  };

  const upcomingCount = followUps.filter(f => f.status === "pending" && !isOverdue(f.scheduledAt)).length;
  const overdueCount  = followUps.filter(f => f.status === "pending" && isOverdue(f.scheduledAt)).length;

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "overdue",  label: "Overdue" },
    { key: "done",     label: "Done" },
    { key: "all",      label: "All" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
            }}>
              <Calendar style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                Follow-ups & Calls
              </h1>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, fontWeight: 500 }}>
                Scheduled Google Meet calls + outreach reminders
              </p>
            </div>
          </div>

          {/* Stats row */}
          {!loading && (
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              {upcomingCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 50,
                  background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.07)",
                  color: isDark ? "#818cf8" : "#6366f1",
                  border: "1px solid rgba(99,102,241,0.2)",
                }}>
                  📅 {upcomingCount} upcoming
                </span>
              )}
              {overdueCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 11px", borderRadius: 50,
                  background: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb",
                  color: isDark ? "#fbbf24" : "#b45309",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}>
                  ⚠️ {overdueCount} overdue
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
              background: "transparent", color: "var(--muted-foreground)",
            }}
          >
            <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
              borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
            }}
          >
            <Plus style={{ width: 13, height: 13 }} /> New Job
          </button>
        </div>
      </div>

      {/* ── Google Calendar Connection Banner ── */}
      <div style={{
        padding: "14px 18px", borderRadius: 12,
        background: calendarConnected
          ? (isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4")
          : (isDark ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.04)"),
        border: `1px solid ${calendarConnected
          ? (isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0")
          : (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)")}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>{calendarConnected ? "✅" : "🗓️"}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              {calendarConnected ? "Google Calendar connected" : "Connect Google Calendar to book calls"}
            </p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
              {calendarConnected
                ? "Meet links are auto-generated when you book a call from any job."
                : "Google Meet links are auto-generated. Recruiter gets an email invite automatically."}
            </p>
          </div>
        </div>
        {calendarConnected ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
            borderRadius: 9, fontSize: 12, fontWeight: 700,
            background: isDark ? "rgba(34,197,94,0.12)" : "#dcfce7",
            color: isDark ? "#4ade80" : "#16a34a",
            border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#86efac"}`,
          }}>
            <CheckCircle2 style={{ width: 13, height: 13 }} />
            Connected
          </div>
        ) : calendarConnected === null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
            <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
            Checking...
          </div>
        ) : (
          <a
            href={`/api/mail/gcal/connect?email=${encodeURIComponent(userEmail)}`}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
              borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: "none",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", boxShadow: "0 2px 10px rgba(99,102,241,0.25)",
              whiteSpace: "nowrap",
            }}
          >
            <Video style={{ width: 13, height: 13 }} /> Connect Calendar
          </a>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}` }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "10px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none",
              borderBottom: filter === f.key ? "2px solid var(--foreground)" : "2px solid transparent",
              color: filter === f.key ? "var(--foreground)" : "var(--muted-foreground)",
              marginBottom: -2, transition: "all 0.18s", whiteSpace: "nowrap",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 12, color: "var(--muted-foreground)" }}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Loading follow-ups...</span>
        </div>
      ) : followUps.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          padding: "64px 32px", textAlign: "center",
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
          borderRadius: 16, border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles style={{ width: 28, height: 28, color: isDark ? "#818cf8" : "#6366f1", opacity: 0.6 }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
              No {filter === "all" ? "" : filter} follow-ups yet
            </p>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, opacity: 0.8, maxWidth: 340, lineHeight: 1.6 }}>
              Open any job → click <strong>📞 Book a Call</strong> to schedule a Google Meet with the recruiter. It appears here automatically.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
              borderRadius: 9, fontSize: 13, fontWeight: 700, border: "none",
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", cursor: "pointer", boxShadow: "0 2px 14px rgba(99,102,241,0.35)",
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> View Jobs
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {followUps.map(fu => (
            <FollowUpCard
              key={fu.id}
              fu={fu}
              isDark={isDark}
              onDone={handleDone}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
