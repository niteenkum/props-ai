"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/sidebar";
import { useAuth } from "../hooks/useAuth";
import { getUserProfileAction } from "../actions/db-actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userEmail, userName, userRole, isReady, logout } = useAuth({ requiredStatus: "ACTIVE" });

  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [profileRole, setProfileRole] = useState<string | undefined>(undefined);
  
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
    });
  }, [userEmail]);

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

  return (
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
          {children}
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
  );
}
