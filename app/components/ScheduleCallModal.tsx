"use client";

import React, { useState } from "react";
import {
  X, Video, Clock, Calendar, Mail, FileText,
  Loader2, ExternalLink, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { bookCallAction, type BookCallInput } from "../actions/calendar-actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  userEmail: string;
  jobId: string;
  jobRole: string;
  jobCompany: string;
  defaultAttendeeEmail?: string;
  onBooked?: (meetLink: string, gcalEventUrl: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocalISOString(offsetMinutes = 60) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  // Round to next 30-min slot
  d.setMinutes(d.getMinutes() >= 30 ? 60 : 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tzOff = -d.getTimezoneOffset();
  const sign = tzOff >= 0 ? "+" : "-";
  const h = Math.floor(Math.abs(tzOff) / 60);
  const m = Math.abs(tzOff) % 60;
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${pad(h)}:${pad(m)}`;
}

function formatDisplayDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleCallModal({
  isOpen, onClose, isDark,
  userEmail, jobId, jobRole, jobCompany,
  defaultAttendeeEmail = "",
  onBooked,
}: ScheduleCallModalProps) {
  const [attendeeEmail, setAttendeeEmail] = useState(defaultAttendeeEmail);
  const [startDateTime, setStartDateTime] = useState(() => getLocalISOString(90).slice(0, 16));
  const [durationMinutes, setDurationMinutes] = useState<30 | 60>(30);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<{
    meetLink?: string;
    gcalEventUrl?: string;
    error?: string;
  } | null>(null);

  const title = `Interview call — ${jobRole} at ${jobCompany}`;

  const handleBook = async () => {
    if (!startDateTime) return;
    setBooking(true);
    setResult(null);

    const isoStart = new Date(startDateTime).toISOString();

    const res = await bookCallAction(userEmail, {
      jobId,
      title,
      attendeeEmail: attendeeEmail.trim(),
      startDateTime: isoStart,
      durationMinutes,
      notes: notes.trim() || undefined,
    } satisfies BookCallInput);

    setBooking(false);

    if (res.success) {
      setResult({ meetLink: res.meetLink ?? undefined, gcalEventUrl: res.gcalEventUrl ?? undefined });
      onBooked?.(res.meetLink ?? "", res.gcalEventUrl ?? "");
    } else {
      setResult({ error: res.error });
    }
  };

  const handleClose = () => {
    setResult(null);
    setNotes("");
    setAttendeeEmail(defaultAttendeeEmail);
    onClose();
  };

  if (!isOpen) return null;

  const INDIGO  = "#6366f1";
  const INDIGO2 = "#818cf8";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 901,
          width: "min(540px, 92vw)",
          borderRadius: 20,
          background: isDark
            ? "linear-gradient(160deg, rgba(12,12,20,0.98) 0%, rgba(8,8,18,0.99) 100%)"
            : "#ffffff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
          boxShadow: isDark
            ? "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)"
            : "0 32px 80px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isDark ? "rgba(99,102,241,0.04)" : "rgba(99,102,241,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO2})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
            }}>
              <Video style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)", margin: 0 }}>
                Schedule a Call
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0", fontWeight: 500 }}>
                {jobRole} · {jobCompany}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              background: isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X style={{ width: 14, height: 14, color: "var(--muted-foreground)" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Meet badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            borderRadius: 10,
            background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)",
            border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)"}`,
          }}>
            <span style={{ fontSize: 18 }}>🎥</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: isDark ? INDIGO2 : INDIGO, margin: 0 }}>
                Google Meet link will be auto-generated
              </p>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                Invite sent to recruiter automatically via Google Calendar
              </p>
            </div>
          </div>

          {/* Success state */}
          {result && !result.error && (
            <div style={{
              padding: "16px 18px", borderRadius: 14,
              background: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
              border: `1px solid ${isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0"}`,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 style={{ width: 20, height: 20, color: isDark ? "#4ade80" : "#16a34a", flexShrink: 0 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: isDark ? "#4ade80" : "#16a34a", margin: 0 }}>
                  Call booked! 🎉 Invite sent to recruiter.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.meetLink ? (
                  <a
                    href={result.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                      borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: "none",
                      background: "linear-gradient(135deg, #6366f1, #818cf8)",
                      color: "#fff", boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
                    }}
                  >
                    <Video style={{ width: 13, height: 13 }} /> Join Meet
                  </a>
                ) : result.gcalEventUrl ? (
                  <a
                    href={result.gcalEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                      borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: "none",
                      background: "linear-gradient(135deg, #6366f1, #818cf8)",
                      color: "#fff", boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
                    }}
                  >
                    <Video style={{ width: 13, height: 13 }} /> Open in Google Calendar
                  </a>
                ) : null}
                {result.gcalEventUrl && result.meetLink && (
                  <a
                    href={result.gcalEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                      borderRadius: 9, fontSize: 12, fontWeight: 600, textDecoration: "none",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                      background: isDark ? "rgba(255,255,255,0.04)" : "#f9f9f9",
                      color: "var(--foreground)",
                    }}
                  >
                    <ExternalLink style={{ width: 12, height: 12 }} /> View in Calendar
                  </a>
                )}
              </div>
              {!result.meetLink && (
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, opacity: 0.8 }}>
                  💡 Open in Google Calendar to see the Google Meet link attached to this event.
                </p>
              )}
            </div>
          )}

          {/* Error state */}
          {result?.error && (
            <div style={{
              padding: "12px 14px", borderRadius: 10,
              background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
              border: "1px solid rgba(239,68,68,0.3)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <AlertTriangle style={{ width: 16, height: 16, color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", margin: "0 0 4px" }}>
                  Failed to book call
                </p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>
                  {result.error?.includes("calendar") || result.error?.includes("token")
                    ? "Google Calendar not connected. Please connect it first."
                    : result.error}
                </p>
                {(result.error?.includes("calendar") || result.error?.includes("token")) && (
                  <a
                    href={`/api/mail/gcal/connect?email=${encodeURIComponent(userEmail)}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
                      fontSize: 11, fontWeight: 700, color: INDIGO2, textDecoration: "none",
                    }}
                  >
                    <ExternalLink style={{ width: 11, height: 11 }} /> Connect Google Calendar
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Form — hide after success */}
          {!(result && !result.error) && (
            <>
              {/* Recruiter Email */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", display: "block", marginBottom: 7 }}>
                  Recruiter Email
                </label>
                <div style={{ position: "relative" }}>
                  <Mail style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)" }} />
                  <input
                    type="email"
                    value={attendeeEmail}
                    onChange={e => setAttendeeEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 12px 10px 32px", borderRadius: 10,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                      background: isDark ? "rgba(255,255,255,0.04)" : "#f9f9f9",
                      color: "var(--foreground)", fontSize: 13,
                      outline: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${INDIGO}88`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"; }}
                  />
                </div>
              </div>

              {/* Date / Time */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", display: "block", marginBottom: 7 }}>
                  Date &amp; Time
                </label>
                <div style={{ position: "relative" }}>
                  <Calendar style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--muted-foreground)" }} />
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={e => setStartDateTime(e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 12px 10px 32px", borderRadius: 10,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                      background: isDark ? "rgba(255,255,255,0.04)" : "#f9f9f9",
                      color: "var(--foreground)", fontSize: 13, outline: "none",
                      colorScheme: isDark ? "dark" : "light",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${INDIGO}88`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"; }}
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", display: "block", marginBottom: 7 }}>
                  Duration
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([30, 60] as const).map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDurationMinutes(min)}
                      style={{
                        flex: 1, padding: "9px 0",
                        borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${durationMinutes === min ? `${INDIGO}99` : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)")}`,
                        background: durationMinutes === min
                          ? (isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)")
                          : "transparent",
                        color: durationMinutes === min ? INDIGO2 : "var(--muted-foreground)",
                        fontSize: 13, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        transition: "all 0.15s",
                      }}
                    >
                      <Clock style={{ width: 12, height: 12 }} />
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", display: "block", marginBottom: 7 }}>
                  Agenda / Notes <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <FileText style={{ position: "absolute", left: 11, top: 11, width: 14, height: 14, color: "var(--muted-foreground)" }} />
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Quick intro, portfolio review, discuss project..."
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 12px 10px 32px", borderRadius: 10,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                      background: isDark ? "rgba(255,255,255,0.04)" : "#f9f9f9",
                      color: "var(--foreground)", fontSize: 13, outline: "none",
                      fontFamily: "inherit", resize: "none",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${INDIGO}88`; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"; }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 24px 20px",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
          display: "flex", gap: 10,
        }}>
          {(result && !result.error) ? (
            <button
              onClick={handleClose}
              style={{
                flex: 1, padding: "11px", borderRadius: 11, border: "none",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              }}
            >
              <CheckCircle2 style={{ width: 15, height: 15 }} />
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                style={{
                  padding: "11px 20px", borderRadius: 11,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                  background: "transparent", color: "var(--muted-foreground)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={booking || !startDateTime}
                style={{
                  flex: 1, padding: "11px", borderRadius: 11, border: "none",
                  background: booking || !startDateTime
                    ? (isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)")
                    : "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: booking || !startDateTime ? (isDark ? INDIGO2 : INDIGO) : "#fff",
                  fontSize: 14, fontWeight: 700,
                  cursor: booking || !startDateTime ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: booking || !startDateTime ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {booking ? (
                  <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Creating Meet...</>
                ) : (
                  <><Video style={{ width: 15, height: 15 }} /> Book &amp; Send Invite</>
                )}
              </button>
            </>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}
