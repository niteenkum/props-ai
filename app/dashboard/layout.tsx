"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../components/sidebar";
import { useAuth } from "../hooks/useAuth";
import { getUserProfileAction } from "../actions/db-actions";

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

  // Poll for new synced emails received in the database
  useEffect(() => {
    if (!userEmail) return;

    const interval = setInterval(async () => {
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

          // Auto-dismiss after 15 seconds (longer window for reading)
          newItems.forEach(item => {
            setTimeout(() => {
              removeNotification(item.id);
            }, 15000);
          });
        }
      } catch (err) {
        console.error("Failed to fetch recent emails for notifications:", err);
      }
    }, 8000);

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
              <div
                className="animate-fade-in"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "75vh",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    background: "var(--card)",
                    border: "2.5px solid var(--foreground)",
                    borderRadius: 12,
                    boxShadow: "6px 6px 0px 0px var(--foreground)",
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
