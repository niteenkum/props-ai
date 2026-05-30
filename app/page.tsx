"use client";

import React, { useState, useEffect } from "react";
import LandingView from "./components/landing-view";
import LoginView from "./components/login-view";
import DashboardView from "./components/dashboard-view";
import PendingView from "./components/pending-view";
import { Sparkles, Loader2 } from "lucide-react";

type AppView = "landing" | "auth" | "pending" | "dashboard";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [view, setView] = useState<AppView>("landing");
  const [userEmail, setUserEmail] = useState("");
  const [userStatus, setUserStatus] = useState<"PENDING" | "ACTIVE">("PENDING");
  const [userName, setUserName] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setIsMounted(true);

    const token = localStorage.getItem("proposalizer_auth_token");
    const email = localStorage.getItem("proposalizer_user_email") || "";
    const status = (localStorage.getItem("proposalizer_user_status") as "PENDING" | "ACTIVE") || "PENDING";
    const name = localStorage.getItem("proposalizer_user_name") || "";

    if (token === "demo-token-active-session") {
      setUserEmail(email);
      setUserStatus(status);
      setUserName(name);
      setView(status === "ACTIVE" ? "dashboard" : "pending");
    }

    const cachedTheme = localStorage.getItem("proposalizer_theme") as "dark" | "light" | null;
    if (cachedTheme) {
      setTheme(cachedTheme);
      if (cachedTheme === "light") document.documentElement.classList.add("light");
      else document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const handleLoginSuccess = (email: string, status: "PENDING" | "ACTIVE", name: string) => {
    setUserEmail(email);
    setUserStatus(status);
    setUserName(name);

    localStorage.setItem("proposalizer_auth_token", "demo-token-active-session");
    localStorage.setItem("proposalizer_user_email", email);
    localStorage.setItem("proposalizer_user_status", status);
    localStorage.setItem("proposalizer_user_name", name);

    setView(status === "ACTIVE" ? "dashboard" : "pending");
  };

  const handleSimulationApproved = () => {
    setUserStatus("ACTIVE");
    localStorage.setItem("proposalizer_user_status", "ACTIVE");
    setView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("proposalizer_auth_token");
    localStorage.removeItem("proposalizer_user_email");
    localStorage.removeItem("proposalizer_user_status");
    localStorage.removeItem("proposalizer_user_name");
    setUserEmail("");
    setUserStatus("PENDING");
    setUserName("");
    setView("landing");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("proposalizer_theme", nextTheme);
    if (nextTheme === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  };

  // Splash
  if (!isMounted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles style={{ width: 20, height: 20, color: "#fff" }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>
            Prop<span style={{ color: "#888" }}>AI</span>
          </h1>
          <Loader2 style={{ width: 18, height: 18, color: "#bbb", animation: "spin 1s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Landing page (default)
  if (view === "landing") {
    return (
      <LandingView
        onGetStarted={() => setView("auth")}
        onSignIn={() => setView("auth")}
      />
    );
  }

  // Auth (login/signup)
  if (view === "auth") {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onBack={() => setView("landing")}
      />
    );
  }

  // Pending
  if (view === "pending") {
    return (
      <PendingView
        userEmail={userEmail}
        userName={userName}
        onApproved={handleSimulationApproved}
        onLogout={handleLogout}
      />
    );
  }

  // Dashboard
  return (
    <DashboardView
      onLogout={handleLogout}
      theme={theme}
      toggleTheme={toggleTheme}
      userEmail={userEmail}
    />
  );
}
