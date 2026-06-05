"use client";

import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../components/theme-provider";
import { useProfile } from "../../hooks/useProfile";
import MailAccountPanel from "../../components/mail/MailAccountPanel";
import { Mail } from "lucide-react";
import { cardStyle } from "../styles";

export default function MailPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { profile }            = useProfile(userEmail);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  if (!isReady) return null;

  return (
    <>
      {/* ── Header ── */}
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            flexShrink: 0,
          }}>
            <Mail style={{ width: 18, height: 18, color: "#fff" }} />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              Mail Integration
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>
              Link your mailbox to read leads and send outreach directly from PropAI.
            </p>
          </div>
        </div>
      </header>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start", marginTop: 4 }}>

        {/* ── Left: Panel ── */}
        <div style={{ ...cardStyle }}>
          <MailAccountPanel
            userEmail={userEmail ?? ""}
            isDark={isDark}
          />
        </div>

        {/* ── Right: Info / Guide ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* How it works */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", marginBottom: 14 }}>
              How it works
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { step: "1", title: "Click 'Link Zoho Mail'", desc: "You'll be redirected to Zoho's secure authorization page." },
                { step: "2", title: "Grant access",           desc: "Allow PropAI to read and send emails on your behalf." },
                { step: "3", title: "You're connected",       desc: "Your inbox appears here. Send proposals with one click." },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ display: "flex", gap: 12 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
                    border: "1.5px solid rgba(99,102,241,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: "#818cf8",
                  }}>
                    {step}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: "0 0 2px" }}>{title}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supported providers */}
          <div style={{ ...cardStyle }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--muted-foreground)", marginBottom: 12 }}>
              Mail Providers
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "Zoho Mail",  status: "available", note: "Supported now" },
                { name: "Gmail",      status: "soon",      note: "Coming soon" },
                { name: "Outlook",    status: "soon",      note: "Coming soon" },
              ].map(({ name, status, note }) => (
                <div key={name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", borderRadius: 9,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                  background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
                    padding: "2px 8px", borderRadius: 50,
                    background: status === "available"
                      ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4")
                      : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                    color: status === "available"
                      ? (isDark ? "#4ade80" : "#16a34a")
                      : "var(--muted-foreground)",
                    border: status === "available"
                      ? `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`
                      : "1px solid var(--border)",
                  }}>
                    {note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy note */}
          <div style={{
            padding: "12px 14px", borderRadius: 12,
            background: isDark ? "rgba(245,158,11,0.06)" : "#fffbeb",
            border: `1px solid ${isDark ? "rgba(245,158,11,0.2)" : "#fde68a"}`,
          }}>
            <p style={{ fontSize: 12, color: isDark ? "#fbbf24" : "#92400e", margin: 0, lineHeight: 1.6 }}>
              🔒 <strong>Your tokens never leave your server.</strong> Access is scoped to read &amp; send only — PropAI cannot delete emails or access attachments.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
