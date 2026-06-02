"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import { useAuth } from "../hooks/useAuth";
import { getUserProfileAction } from "../actions/db-actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userEmail, userName, isReady, logout } = useAuth({ requiredStatus: "ACTIVE" });

  // Fetch profile name/role for sidebar display
  const [profileName, setProfileName] = useState<string | undefined>(undefined);
  const [profileRole, setProfileRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!userEmail) return;
    getUserProfileAction(userEmail).then(profile => {
      if (profile?.name) setProfileName(profile.name);
      if (profile?.role) setProfileRole(profile.role);
    });
  }, [userEmail]);

  if (!isReady) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--background)",
        padding: 16,
        gap: 24,
      }}
    >
      <Sidebar
        onLogout={logout}
        userName={profileName || userName || "Your Profile"}
        userRole={profileRole}
      />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxHeight: "100vh",
          overflowY: "auto",
          paddingRight: 8,
        }}
      >
        {children}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
