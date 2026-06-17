"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../components/sidebar";
import { useAuth } from "../hooks/useAuth";
import { getUserProfileAction } from "../actions/db-actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userEmail, userName, isReady, logout } = useAuth({ requiredStatus: "ACTIVE" });

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
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background: "var(--background)",
        padding: 14,
        gap: 18,
        boxSizing: "border-box",
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
          gap: 20,
          height: "100%",
          maxHeight: "100%",
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {children}
      </main>
    </div>
  );
}
