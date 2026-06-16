"use client";

/**
 * PropBot AI — Quick Action cards.
 * Shown on the empty state / home screen of the chat page.
 */

import React from "react";
import { Mail, BarChart3, Search, FileText, Calendar, Sparkles } from "lucide-react";

export interface QuickAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  prompt: string;
  accentColor: string;
  bgGradient: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Mail size={20} />,
    label: "Draft Cold Email",
    description: "Write a personalised outreach",
    prompt: "Help me draft a cold email to a potential client for a React developer role",
    accentColor: "#7c3aed",
    bgGradient: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.08))",
  },
  {
    icon: <Search size={20} />,
    label: "Search Inbox",
    description: "Find emails from recruiters",
    prompt: "Search my Gmail inbox for recent recruiter and job opportunity emails",
    accentColor: "#3b82f6",
    bgGradient: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(14,165,233,0.08))",
  },
  {
    icon: <BarChart3 size={20} />,
    label: "Outreach Stats",
    description: "View your outreach metrics",
    prompt: "Show me my job outreach statistics and application summary",
    accentColor: "#10b981",
    bgGradient: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))",
  },
  {
    icon: <FileText size={20} />,
    label: "Latest Jobs",
    description: "Browse recent applications",
    prompt: "List my most recent job applications and their current status",
    accentColor: "#f59e0b",
    bgGradient: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))",
  },
  {
    icon: <Calendar size={20} />,
    label: "Follow-up Drafts",
    description: "Follow up on sent emails",
    prompt: "Help me draft a follow-up email for a job I applied to 5 days ago",
    accentColor: "#ec4899",
    bgGradient: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(219,39,119,0.08))",
  },
  {
    icon: <Sparkles size={20} />,
    label: "Interview Prep",
    description: "Practice common questions",
    prompt: "Help me prepare for a React developer technical interview with common questions",
    accentColor: "#06b6d4",
    bgGradient: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(8,145,178,0.08))",
  },
];

interface QuickActionsGridProps {
  onSelect: (prompt: string) => void;
}

export default function QuickActionsGrid({ onSelect }: QuickActionsGridProps) {
  return (
    <div style={styles.grid}>
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          id={`propbot-quick-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => onSelect(action.prompt)}
          style={{ ...styles.card, background: action.bgGradient, borderColor: `${action.accentColor}30` }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = `${action.accentColor}60`;
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = `${action.accentColor}30`;
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          <div style={{ ...styles.iconBox, color: action.accentColor }}>
            {action.icon}
          </div>
          <div style={styles.cardContent}>
            <span style={styles.cardLabel}>{action.label}</span>
            <span style={styles.cardDesc}>{action.description}</span>
          </div>
          <div style={{ ...styles.arrow, color: action.accentColor }}>›</div>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    width: "100%",
    maxWidth: 720,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
    background: "transparent",
    outline: "none",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--foreground)",
    textAlign: "left",
  },
  cardDesc: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  arrow: {
    fontSize: 20,
    opacity: 0.6,
    flexShrink: 0,
    lineHeight: 1,
  },
};
