"use client";

import React, { useState, useEffect } from "react";
import LoginView from "./components/login-view";
import DashboardView from "./components/dashboard-view";
import { Sparkles, Loader2 } from "lucide-react";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Handle client-side session checking on initial mount
  useEffect(() => {
    setIsMounted(true);
    
    // Auth Session Check
    const token = localStorage.getItem("proposalizer_auth_token");
    const email = localStorage.getItem("proposalizer_user_email") || "";
    if (token === "demo-token-active-session") {
      setIsAuthenticated(true);
      setUserEmail(email);
    }

    // Theme Config Check
    const cachedTheme = localStorage.getItem("proposalizer_theme") as "dark" | "light" | null;
    if (cachedTheme) {
      setTheme(cachedTheme);
      if (cachedTheme === "light") {
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
      }
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const handleLoginSuccess = (email: string) => {
    setIsAuthenticated(true);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("proposalizer_auth_token");
    localStorage.removeItem("proposalizer_user_email");
    setIsAuthenticated(false);
    setUserEmail("");
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("proposalizer_theme", nextTheme);
    
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  // Spectacular minimalist splash state to prevent auth flashes
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center">
            Prop<span className="text-indigo-400">AI</span>
          </h1>
          <Loader2 className="h-4.5 w-4.5 text-slate-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Gateway check
  if (isAuthenticated) {
    return (
      <DashboardView 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  return <LoginView onLoginSuccess={handleLoginSuccess} />;
}
