"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/sidebar";
import { useAuth } from "../hooks/useAuth";
import { getUserProfileAction } from "../actions/db-actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userEmail, userName, isReady, logout } = useAuth({ requiredStatus: "ACTIVE" });

  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [profileRole, setProfileRole] = useState<string | undefined>(undefined);
  
  // Notification toast stack state
  const [notifications, setNotifications] = useState<any[]>([]);
  const mountedAt = useRef<string>(new Date().toISOString());

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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

          setNotifications(prev => [...newItems, ...prev]);

          // Auto-dismiss after 7 seconds
          newItems.forEach(item => {
            setTimeout(() => {
              removeNotification(item.id);
            }, 7000);
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

      {/* Floating Toast Notification Stack */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          pointerEvents: "none",
          width: 360,
          maxWidth: "90vw",
        }}
      >
        {notifications.map(n => {
          const accentColor = 
            n.emailType === "interview_call" || n.emailType === "offer_letter" ? "#10b981" :
            n.emailType === "freelance_opportunity" || n.emailType === "remote_opportunity" ? "#6366f1" :
            n.emailType === "rejection" ? "#ef4444" : "#71717a";

          return (
            <div
              key={n.id}
              style={{
                pointerEvents: "auto",
                background: "rgba(15, 15, 17, 0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: 12,
                padding: "16px 18px",
                color: "#fff",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                position: "relative",
                overflow: "hidden",
                animation: "toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: accentColor }}>
                  {n.emailType.replace("_", " ")}
                </span>
                <button
                  onClick={() => removeNotification(n.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Subject */}
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {n.subject}
              </span>

              {/* Sender */}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                From: {n.fromName} ({n.fromEmail})
              </span>

              {/* Summary / AI snippet */}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.4 }}>
                {n.aiSummary || n.summary}
              </p>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%) translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
