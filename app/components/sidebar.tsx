"use client";

import React from "react";
import { LayoutDashboard, FilePlus2, Settings, LogOut, Sparkles, User, Sun, Moon } from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  activeTab: "dashboard" | "new" | "profile";
  setActiveTab: (tab: "dashboard" | "new" | "profile") => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onLogout,
  userName = "Niteen Kumar",
  userRole = "React Specialist",
  theme,
  toggleTheme
}: SidebarProps) {
  // Get initial letters for avatar
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NK";

  return (
    <aside className="w-72 h-[calc(100vh-2rem)] sticky top-4 flex flex-col p-4 bg-card/65 backdrop-blur-md border border-border rounded-2xl shadow-xl justify-between transition-colors duration-300">
      {/* Brand Header */}
      <div className="space-y-8">
        <div className="flex items-center space-x-3 px-2 py-1">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center">
              Prop<span className="text-primary">AI</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              Proposal Organizer
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={clsx(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group cursor-pointer",
              activeTab === "dashboard"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            )}
          >
            {activeTab === "dashboard" && (
              <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-md" />
            )}
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("new")}
            className={clsx(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group cursor-pointer",
              activeTab === "new"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            )}
          >
            {activeTab === "new" && (
              <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-md" />
            )}
            <FilePlus2 className="h-5 w-5" />
            <span>New Scan / Paste</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={clsx(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group cursor-pointer",
              activeTab === "profile"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
            )}
          >
            {activeTab === "profile" && (
              <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-md" />
            )}
            <User className="h-5 w-5" />
            <span>Candidate Profile</span>
          </button>

          {/* Dynamic Theme Toggle Action Button */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all duration-200 cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-5 w-5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-5 w-5 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <div className="pt-4 mt-4 border-t border-border">
            <p className="px-4 text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-2">
              System Configuration
            </p>
            <button
              disabled
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-600 light:text-slate-300 cursor-not-allowed border border-transparent"
            >
              <Settings className="h-5 w-5" />
              <span>AI Templates (Locked)</span>
            </button>
          </div>
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div 
          onClick={() => setActiveTab("profile")}
          className={clsx(
            "flex items-center space-x-3 p-2 rounded-xl transition-all duration-200 cursor-pointer border border-transparent hover:bg-muted",
            activeTab === "profile" 
              ? "bg-muted border-border" 
              : "bg-muted/50"
          )}
        >
          {/* Aura Avatar */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 text-white font-bold text-sm shadow-[0_0_10px_rgba(99,102,241,0.2)]">
            {initials}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{userRole}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/15 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
