"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import { useAuth } from "../hooks/useAuth";
import { getUserProfileAction } from "../actions/db-actions";

function MockDashboardBackground() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 24,
      width: "100%",
      filter: "blur(18px)",
      opacity: 0.8,
      pointerEvents: "none",
      userSelect: "none",
    }}>
      {/* Mock Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: "bold", margin: 0 }}>Workspace Library</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>Manage your freelance pipelines and outreach</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ background: "var(--card)", border: "2.5px solid var(--foreground)", borderRadius: 10, padding: "8px 16px", boxShadow: "2px 2px 0px 0px var(--foreground)" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Total Leads Scanned</span>
            <div style={{ fontSize: 18, fontWeight: 900 }}>142</div>
          </div>
          <div style={{ background: "var(--card)", border: "2.5px solid var(--foreground)", borderRadius: 10, padding: "8px 16px", boxShadow: "2px 2px 0px 0px var(--foreground)" }}>
            <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Match Rate Avg</span>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#22c55e" }}>84.5%</div>
          </div>
        </div>
      </div>

      {/* Mock Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 20,
      }}>
        {/* Lead pipeline card */}
        <div style={{
          background: "var(--card)",
          border: "2.5px solid var(--foreground)",
          borderRadius: 12,
          boxShadow: "6px 6px 0px 0px var(--foreground)",
          padding: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 12px", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            Recent Matches 📩
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { role: "React Architect", company: "Stripe, Inc.", score: "96%" },
              { role: "Backend Developer (Go)", company: "Vercel", score: "88%" },
              { role: "Full Stack Contractor", company: "Linear App", score: "82%" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1.5px solid var(--foreground)", borderRadius: 8, background: "var(--input)" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: "bold" }}>{item.role}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{item.company}</div>
                </div>
                <div style={{ padding: "4px 8px", borderRadius: 6, background: "#6366f1", color: "#fff", fontSize: 10.5, fontWeight: "bold" }}>
                  {item.score} Match
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign conversion card */}
        <div style={{
          background: "var(--card)",
          border: "2.5px solid var(--foreground)",
          borderRadius: 12,
          boxShadow: "6px 6px 0px 0px var(--foreground)",
          padding: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 12px", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            Campaign Conversions 📈
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Emails Sent", count: 86, color: "#6366f1", percent: 80 },
              { label: "Replies Received", count: 34, color: "#10b981", percent: 45 },
              { label: "Interviews Booked", count: 12, color: "#f59e0b", percent: 20 },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4, fontWeight: "bold" }}>
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div style={{ height: 12, background: "var(--input)", borderRadius: 6, border: "1.5px solid var(--foreground)", overflow: "hidden" }}>
                  <div style={{ width: `${item.percent}%`, height: "100%", background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outreach status card */}
        <div style={{
          background: "var(--card)",
          border: "2.5px solid var(--foreground)",
          borderRadius: 12,
          boxShadow: "6px 6px 0px 0px var(--foreground)",
          padding: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: "bold", margin: "0 0 12px", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
            Outbox Sync Logs 🔄
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { to: "hr@stripe.com", status: "Sent", color: "#10b981" },
              { to: "talent@vercel.com", status: "Bounced", color: "#ef4444" },
              { to: "jobs@linear.app", status: "Pending", color: "#f59e0b" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1.5px solid var(--foreground)", borderRadius: 8, background: "var(--input)" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{item.to}</span>
                <span style={{ fontSize: 11, color: item.color, fontWeight: "bold" }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userEmail, userName, userRole, isReady, logout } = useAuth({ requiredStatus: "ACTIVE" });
  const pathname = usePathname();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [profileRole, setProfileRole] = useState<string | undefined>(undefined);
  
  const [hasSkills, setHasSkills] = useState<boolean | null>(null);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);

  // Notification toast stack state
  const [notifications, setNotifications] = useState<any[]>([]);
  const mountedAt = useRef<string>(new Date().toISOString());

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    getUserProfileAction(userEmail).then(profile => {
      if (profile?.name) setProfileName(profile.name);
      if (profile?.role) setProfileRole(profile.role);

      const hasS = !!(profile?.skills && profile.skills.length > 0);
      const hasP = !!(profile?.projects && profile.projects.length >= 2);
      setHasSkills(hasS);
      setHasProjects(hasP);
    });
  }, [userEmail, pathname]);

  // Poll for new synced emails received in the database (only when tab is visible)
  useEffect(() => {
    if (!userEmail) return;

    const runPoll = async () => {
      if (document.hidden) return; // Skip if tab is minimized or in the background
      try {
        const { getRecentSyncedEmailsAction } = await import("../actions/mail-actions");
        const res = await getRecentSyncedEmailsAction(userEmail, mountedAt.current);
        if (res.success && res.emails && res.emails.length > 0) {
          const latestEmail = res.emails[0];
          mountedAt.current = new Date(new Date(latestEmail.createdAt).getTime() + 1000).toISOString();

          // Add to notifications
          const newItems = res.emails.map(email => ({
            id: email.id,
            subject: email.subject,
            fromEmail: email.fromEmail,
            fromName: email.fromName,
            summary: email.summary,
            emailType: email.emailType,
            aiSummary: email.aiSummary,
          }));

          setNotifications(prev => {
            // Filter duplicates to prevent key collision warnings
            const existingIds = new Set(prev.map(n => n.id));
            const uniqueNew = newItems.filter(item => !existingIds.has(item.id));
            return [...uniqueNew, ...prev];
          });

          // Auto-dismiss after 15 seconds
          newItems.forEach(item => {
            setTimeout(() => {
              removeNotification(item.id);
            }, 15000);
          });
        }
      } catch (err) {
        console.error("Failed to fetch recent emails for notifications:", err);
      }
    };

    // Run once on mount
    runPoll();

    const interval = setInterval(runPoll, 15000); // Poll every 15 seconds instead of 8

    return () => clearInterval(interval);
  }, [userEmail]);

  if (!isReady) return null;

  const isProfilePage = pathname === "/dashboard/profile";
  const showBlocker = !isProfilePage && (hasSkills === false || hasProjects === false);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        :root {
          --handwriting-font: 'Caveat', 'Architects Daughter', cursive;
        }
        @keyframes fade-in-slide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .setup-blocker-overlay {
          background: rgba(248, 250, 255, 0.35) !important;
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
        }
        [data-theme="dark"] .setup-blocker-overlay {
          background: rgba(9, 9, 11, 0.55) !important;
          backdrop-filter: blur(18px) !important;
          -webkit-backdrop-filter: blur(18px) !important;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          background: "var(--background)",
          padding: 14,
          gap: 18,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <Sidebar
          onLogout={logout}
          userName={profileName || userName || "Your Profile"}
          userRole={profileRole}
          systemRole={userRole}
          userEmail={userEmail}
        />

        {/* Main scroll container — must be a plain block (not flex) so overflowY works */}
        <main
          style={{
            flex: "1 1 0",
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 4,
            display: "block",
          }}
        >
          {/* Inner wrapper adds the vertical spacing between page sections */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              minHeight: "100%",
              paddingBottom: 24,
            }}
          >
            {showBlocker ? (
              <div style={{ position: "relative", width: "100%", minHeight: "75vh" }}>
                {/* Mock dashboard background preview */}
                <MockDashboardBackground />

                {/* Absolute overlay blocker modal */}
                <div
                  className="animate-fade-in setup-blocker-overlay"
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      background: "var(--card)",
                      border: "2.5px solid var(--foreground)",
                      borderRadius: 12,
                      boxShadow: "10px 10px 0px 0px var(--foreground)",
                      padding: "48px 32px",
                      maxWidth: 520,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "2px dashed #6366f1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 32,
                      }}
                    >
                      🚀
                    </div>

                    <h2
                      style={{
                        fontSize: 26,
                        fontWeight: "bold",
                        color: "var(--foreground)",
                        margin: 0,
                        fontFamily: "var(--handwriting-font)",
                      }}
                    >
                      Complete Your Profile Setup
                    </h2>

                    <p
                      style={{
                        fontSize: 16,
                        color: "var(--muted-foreground)",
                        lineHeight: 1.6,
                        margin: 0,
                        fontFamily: "var(--handwriting-font)",
                        fontWeight: 500,
                      }}
                    >
                      Before accessing AI proposal tools, inbox match scores, and outreach integrations, please complete your profile checklist:
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 12,
                        width: "100%",
                        padding: "16px 20px",
                        background: "var(--input)",
                        border: "2px solid var(--foreground)",
                        borderRadius: 8,
                        boxShadow: "3px 3px 0px 0px var(--foreground)",
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: "bold", fontFamily: "var(--handwriting-font)", color: "var(--foreground)" }}>
                        <span style={{ fontSize: 18 }}>{hasSkills ? "✅" : "⭕"}</span>
                        <span style={{ textDecoration: hasSkills ? "line-through" : "none", opacity: hasSkills ? 0.6 : 1 }}>
                          Add at least one technical skill
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: "bold", fontFamily: "var(--handwriting-font)", color: "var(--foreground)" }}>
                        <span style={{ fontSize: 18 }}>{hasProjects ? "✅" : "⭕"}</span>
                        <span style={{ textDecoration: hasProjects ? "line-through" : "none", opacity: hasProjects ? 0.6 : 1 }}>
                          Add at least two featured projects
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push("/dashboard/profile")}
                      style={{
                        padding: "12px 28px",
                        borderRadius: 6,
                        border: "2.5px solid var(--foreground)",
                        background: "#6366f1",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "3px 3px 0px 0px var(--foreground)",
                        transition: "all 0.15s ease",
                        fontFamily: "var(--handwriting-font)",
                        marginTop: 8,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "translate(-1.5px, -1.5px)";
                        e.currentTarget.style.boxShadow = "4.5px 4.5px 0px 0px var(--foreground)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "3px 3px 0px 0px var(--foreground)";
                      }}
                    >
                      Go to Profile 🚀
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>

      {/* macOS-style Toast Notification Stack */}
      {notifications.length > 0 && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            width: 360,
            maxWidth: "90vw",
            height: isHovered ? "auto" : "126px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div style={{ position: "relative", width: "100%", height: "106px" }}>
            {notifications.map((n, idx) => {
              const accentColor = 
                n.emailType === "interview_call" || n.emailType === "offer_letter" ? "#10b981" :
                n.emailType === "freelance_opportunity" || n.emailType === "remote_opportunity" ? "#6366f1" :
                n.emailType === "rejection" ? "#ef4444" : "#71717a";

              // Stack styling calculations
              const yOffset = isHovered ? (idx * -118) : (idx * 10);
              const scale = isHovered ? 1 : (1 - idx * 0.04);
              const opacity = isHovered ? 1 : (idx > 2 ? 0 : 1 - idx * 0.25);
              const zIndex = 100 - idx;
              const pointerEvents = isHovered || idx === 0 ? "auto" : "none";

              return (
                <div
                  key={n.id}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "106px",
                    background: "rgba(15, 15, 17, 0.85)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderLeft: `4px solid ${accentColor}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "#fff",
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    overflow: "hidden",
                    pointerEvents,
                    transform: `translateY(${yOffset}px) scale(${scale})`,
                    opacity,
                    zIndex,
                    transformOrigin: "bottom center",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  {/* Plus more badge */}
                  {idx === 0 && notifications.length > 1 && !isHovered && (
                    <div style={{
                      position: "absolute",
                      top: 10,
                      right: 32,
                      background: "rgba(99, 102, 241, 0.8)",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: 10,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    }}>
                      +{notifications.length - 1} MORE
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: accentColor }}>
                      {n.emailType.replace("_", " ")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(n.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.4)",
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "2px 4px",
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Subject */}
                  <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {n.subject}
                  </span>

                  {/* Sender */}
                  <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    From: {n.fromName || n.fromEmail}
                  </span>

                  {/* Summary */}
                  <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {n.aiSummary || n.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
