"use client";

import React from "react";
import {
  FileText, Users, Award, Terminal, GraduationCap,
  UploadCloud, Plus, Trash2, X, Check, Loader2, Save,
  Sparkles, AlertCircle, Link2, GitBranch, Globe,
  ChevronDown, ChevronUp, ExternalLink, Mail, Briefcase,
  Code2, Zap, ArrowUpRight, CheckCircle2, Laptop, Edit2,
  GraduationCap as EduIcon
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useTheme } from "../../components/theme-provider";

// ─── Skill category configurations ──────────────────────────────────────────
const LANG_KEYWORDS   = ["javascript","typescript","python","dart","swift","kotlin","java","go","rust","c++","c#","php","ruby","html","css"];
const FRAME_KEYWORDS  = ["react","next","vue","angular","svelte","express","node","flutter","tailwind","vite","nuxt","remix","django","fastapi","rails","laravel","spring"];
const TOOL_KEYWORDS   = ["docker","kubernetes","aws","gcp","azure","git","graphql","prisma","postgres","mysql","redis","webpack","babel","eslint","jest","cypress","figma","firebase","supabase","vercel","expo"];
const DESIGN_KEYWORDS = ["ui/ux","figma","design system","component library","ux","ui","animation","sketch","adobe"];

type SkillCat = "framework" | "language" | "tool" | "design" | "default";

function getSkillCat(skill: string): SkillCat {
  const lower = skill.toLowerCase();
  if (FRAME_KEYWORDS.some(k  => lower.includes(k))) return "framework";
  if (LANG_KEYWORDS.some(k   => lower.includes(k))) return "language";
  if (TOOL_KEYWORDS.some(k   => lower.includes(k))) return "tool";
  if (DESIGN_KEYWORDS.some(k => lower.includes(k))) return "design";
  return "default";
}

const SKILL_COLORS: Record<SkillCat, { bg: string; darkBg: string; color: string; border: string; darkBorder: string }> = {
  framework: { bg: "rgba(99,102,241,0.06)", darkBg: "rgba(99,102,241,0.12)", color: "#818cf8", border: "rgba(99,102,241,0.12)", darkBorder: "rgba(99,102,241,0.25)" },
  language:  { bg: "rgba(34,197,94,0.05)",  darkBg: "rgba(34,197,94,0.10)",  color: "#4ade80", border: "rgba(34,197,94,0.10)",  darkBorder: "rgba(34,197,94,0.20)" },
  tool:      { bg: "rgba(251,146,60,0.05)", darkBg: "rgba(251,146,60,0.10)", color: "#fb923c", border: "rgba(251,146,60,0.10)", darkBorder: "rgba(251,146,60,0.20)" },
  design:    { bg: "rgba(236,72,153,0.05)", darkBg: "rgba(236,72,153,0.10)", color: "#f472b6", border: "rgba(236,72,153,0.10)", darkBorder: "rgba(236,72,153,0.20)" },
  default:   { bg: "rgba(156,163,175,0.04)", darkBg: "rgba(156,163,175,0.08)", color: "#9ca3af", border: "rgba(156,163,175,0.08)", darkBorder: "rgba(156,163,175,0.15)" },
};

function formatParsedAt(d: Date | null) {
  return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10,
      textTransform: "uppercase",
      fontWeight: 700,
      letterSpacing: 1.5,
      color: "var(--muted-foreground)",
      opacity: 0.7,
      marginBottom: 6,
      display: "inline-block"
    }}>
      {children}
    </span>
  );
}

function FieldInput({ label, value, onChange, type = "text", icon, placeholder, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; icon?: React.ReactNode; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ position: "relative", width: "100%" }}>
        {icon && (
          <div style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            color: "var(--muted-foreground)", opacity: 0.5, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {icon}
          </div>
        )}
        <input
          type={type} value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} disabled={disabled}
          className="glow-input"
          style={{
            paddingLeft: icon ? 40 : 16,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function ProfilePage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const p                      = useProfile(userEmail);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  const [showResumeText, setShowResumeText] = React.useState(false);

  // ─── Local state for Project Modal ───
  const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
  const [activeProjectIdx, setActiveProjectIdx]     = React.useState<number | null>(null); // -1 for new, 0+ for edit
  const [modalProjectName, setModalProjectName]     = React.useState("");
  const [modalProjectTech, setModalProjectTech]     = React.useState("");
  const [modalProjectDesc, setModalProjectDesc]     = React.useState("");
  const [modalProjectLinks, setModalProjectLinks]   = React.useState<{ label: string; url: string }[]>([]);
  const [newModalLinkLabel, setNewModalLinkLabel]   = React.useState("GitHub");
  const [newModalLinkUrl, setNewModalLinkUrl]       = React.useState("");

  if (!isReady || !p.profile) return null;

  const hasResume       = !!p.profile.resumeFileName;
  const skillCount      = p.profile.skills.length;
  const projectCount    = p.profile.projects.length;
  const educationCount  = p.profile.education.length;

  // ─── Project Modal Triggers ───
  const openAddProjectModal = () => {
    setActiveProjectIdx(-1);
    setModalProjectName("");
    setModalProjectTech("");
    setModalProjectDesc("");
    setModalProjectLinks([]);
    setNewModalLinkLabel("GitHub");
    setNewModalLinkUrl("");
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (idx: number) => {
    if (!p.profile) return;
    const proj = p.profile.projects[idx];
    if (!proj) return;
    setActiveProjectIdx(idx);
    setModalProjectName(proj.name);
    setModalProjectTech(proj.tech.join(", "));
    setModalProjectDesc(proj.description);
    setModalProjectLinks(proj.links ? [...proj.links] : []);
    setNewModalLinkLabel("GitHub");
    setNewModalLinkUrl("");
    setIsProjectModalOpen(true);
  };

  const handleSaveModalProject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalProjectName.trim()) return;

    if (!p.profile) return;
    const profile = p.profile;

    const parsedTech = modalProjectTech
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const updatedProject = {
      name: modalProjectName.trim(),
      tech: parsedTech,
      description: modalProjectDesc.trim(),
      links: modalProjectLinks,
    };

    const currentProjects = [...profile.projects];

    if (activeProjectIdx === -1) {
      currentProjects.push(updatedProject);
    } else if (activeProjectIdx !== null && activeProjectIdx >= 0) {
      currentProjects[activeProjectIdx] = updatedProject;
    }

    p.setProfile({
      ...profile,
      projects: currentProjects,
    });

    setIsProjectModalOpen(false);
  };

  const handleAddModalLink = () => {
    if (!newModalLinkUrl.trim()) return;
    setModalProjectLinks(prev => [
      ...prev,
      { label: newModalLinkLabel, url: newModalLinkUrl.trim() }
    ]);
    setNewModalLinkUrl("");
  };

  const handleDeleteModalLink = (lIdx: number) => {
    setModalProjectLinks(prev => prev.filter((_, i) => i !== lIdx));
  };

  // Render Section Header for Bento cards
  const sectionHead = (
    icon: React.ReactNode, title: string,
    badge?: React.ReactNode, action?: React.ReactNode,
  ) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)",
          border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#818cf8",
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: -0.3 }}>
            {title}
          </h3>
        </div>
        {badge}
      </div>
      {action}
    </div>
  );

  const countBadge = (n: number, label: string) => (
    <span style={{
      fontSize: 10, padding: "3px 10px", borderRadius: 50,
      background: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
      border: "1px solid var(--border)",
      color: "var(--muted-foreground)", fontWeight: 700,
    }}>
      {n} {label}
    </span>
  );

  const addBtn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 10,
        border: "1px solid var(--border)", background: "transparent",
        color: "var(--muted-foreground)", fontSize: 11, fontWeight: 700,
        cursor: "pointer", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="btn-add-action"
    >
      <Plus style={{ width: 13, height: 13 }} /> {label}
    </button>
  );

  return (
    <>
      <style>{`
        /* Bento structures */
        .bento-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .bento-card:hover {
          transform: translateY(-2px);
          border-color: ${isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.15)"};
          box-shadow: 0 16px 36px ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.03)"};
        }

        /* Input customization */
        .glow-input {
          width: 100%;
          padding: 10px 14px;
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 13.5px;
          color: var(--foreground);
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glow-input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: var(--card);
        }

        /* Textarea customization */
        .glow-textarea {
          width: 100%;
          padding: 10px 14px;
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 13.5px;
          color: var(--foreground);
          outline: none;
          resize: none;
          line-height: 1.6;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glow-textarea:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          background: var(--card);
        }

        /* Action Buttons */
        .btn-add-action:hover {
          border-color: #818cf8 !important;
          color: #818cf8 !important;
          background: ${isDark ? "rgba(99,102,241,0.04)" : "rgba(99,102,241,0.02)"} !important;
        }

        /* Project Showcase Card Hover Details */
        .project-showcase-card .action-overlay {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .project-showcase-card:hover .action-overlay {
          opacity: 1;
        }

        /* Modal Keyframes & Styles */
        @keyframes modalOverlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalContentScale {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          background: ${isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.4)"};
          backdrop-filter: blur(12px);
          padding: 20px;
          animation: modalOverlayFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-content {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 24px;
          width: 580px;
          max-width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 30px 60px ${isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.12)"};
          animation: modalContentScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Keyframes */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes flowGridBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.3); }
          50% { transform: scale(1.01); box-shadow: 0 0 0 8px rgba(99,102,241,0); }
        }

        /* Skill tag animations */
        .skill-tag-pill {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .skill-tag-pill:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 4px 12px ${isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)"};
        }

        /* Main layout layout query */
        @media (max-width: 1024px) {
          .bento-wrapper {
            grid-template-columns: 1fr !important;
          }
          .bento-sticky-col {
            position: relative !important;
            top: 0 !important;
          }
        }
      `}</style>

      {/* ═══ Top-Level Status Banners ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        p.profileSaveSuccess
        {p.profileSaveSuccess && (
          <div style={{
            padding: "12px 18px", borderRadius: 12, animation: "fadeSlideIn 0.3s ease",
            background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
            border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
            color: isDark ? "#4ade80" : "#16a34a",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10,
          }}>
            <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>Profile successfully updated in database. New generated proposals will leverage this data.</span>
          </div>
        )}
        {p.resumeParseError && (
          <div style={{
            padding: "12px 18px", borderRadius: 12, animation: "fadeSlideIn 0.3s ease",
            background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2",
            border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#fecaca"}`,
            color: isDark ? "#f87171" : "#dc2626",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10,
          }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>{p.resumeParseError}</span>
          </div>
        )}
        {p.resumeParsedAt && !p.resumeParseError && (
          <div style={{
            padding: "12px 18px", borderRadius: 12, animation: "fadeSlideIn 0.3s ease",
            background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.02)",
            border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)"}`,
            color: isDark ? "#a5b4fc" : "#6366f1",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10,
          }}>
            <Sparkles style={{ width: 16, height: 16, color: "#818cf8", flexShrink: 0 }} />
            <span>AI profile extraction complete ({formatParsedAt(p.resumeParsedAt)}). Review changes below and click save.</span>
          </div>
        )}
      </div>

      {/* ═══ Majestic Profile Banner (Hero Card) ═══ */}
      <div className="bento-card" style={{ padding: 0, marginBottom: 24, borderRadius: 24 }}>
        {/* Banner Graphic mesh background */}
        <div style={{
          height: 150,
          position: "relative",
          background: "linear-gradient(135deg, #4f46e5, #ec4899, #f97316)",
          backgroundSize: "200% 200%",
          animation: "flowGridBg 8s infinite ease-in-out",
          overflow: "hidden",
        }}>
          {/* Subtle grid pattern overlay */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "20px 20px",
            opacity: 0.4,
          }} />
        </div>

        {/* Profile overview information details */}
        <div style={{
          padding: "0 28px 28px",
          marginTop: -40,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 20,
        }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
            {/* Hologram Avatar Frame */}
            <div style={{
              width: 88, height: 88, borderRadius: 24,
              background: "var(--card)", padding: 4,
              border: "1px solid var(--border)",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: 20,
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(244,114,182,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 900, color: "#818cf8",
                border: `1.5px dashed ${isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.2)"}`,
              }}>
                {p.profile.name ? p.profile.name.charAt(0).toUpperCase() : "?"}
              </div>
            </div>

            {/* User credentials summary */}
            <div style={{ paddingBottom: 6 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--foreground)", margin: "0 0 4px", letterSpacing: -0.5 }}>
                {p.profile.name || "Configure Name"}
              </h2>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", margin: "0 0 10px" }}>
                {p.profile.role || "Professional Role"}
              </p>
              
              {/* Quick links pill deck */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {p.profile.portfolioUrl && (
                  <a href={p.profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                    padding: "4px 10px", borderRadius: 50, background: isDark ? "rgba(16,185,129,0.06)" : "#ecfdf5",
                    border: `1px solid ${isDark ? "rgba(16,185,129,0.2)" : "#d1fae5"}`,
                    color: isDark ? "#34d399" : "#059669", fontSize: 11, fontWeight: 700
                  }}>
                    <Globe style={{ width: 12, height: 12 }} /> Portfolio <ArrowUpRight style={{ width: 10, height: 10 }} />
                  </a>
                )}
                {p.profile.githubUrl && (
                  <a href={p.profile.githubUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                    padding: "4px 10px", borderRadius: 50, background: isDark ? "rgba(156,163,175,0.06)" : "#f3f4f6",
                    border: `1px solid ${isDark ? "rgba(156,163,175,0.2)" : "#e5e7eb"}`,
                    color: "var(--foreground)", fontSize: 11, fontWeight: 700
                  }}>
                    <GitBranch style={{ width: 12, height: 12 }} /> GitHub <ArrowUpRight style={{ width: 10, height: 10 }} />
                  </a>
                )}
                {p.profile.linkedinUrl && (
                  <a href={p.profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none",
                    padding: "4px 10px", borderRadius: 50, background: isDark ? "rgba(59,130,246,0.06)" : "#eff6ff",
                    border: `1px solid ${isDark ? "rgba(59,130,246,0.2)" : "#dbeafe"}`,
                    color: isDark ? "#60a5fa" : "#2563eb", fontSize: 11, fontWeight: 700
                  }}>
                    <Link2 style={{ width: 12, height: 12 }} /> LinkedIn <ArrowUpRight style={{ width: 10, height: 10 }} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Majestic save buttons */}
          <div style={{ paddingBottom: 6 }}>
            {p.hasChanges ? (
              <button
                onClick={() => p.handleSaveProfile()}
                disabled={p.profileSaving}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 26px", borderRadius: 12, border: "none",
                  background: "linear-gradient(135deg, #818cf8, #6366f1)",
                  color: "#fff", fontSize: 14, fontWeight: 800,
                  cursor: p.profileSaving ? "not-allowed" : "pointer",
                  opacity: p.profileSaving ? 0.75 : 1,
                  animation: p.profileSaving ? "none" : "pulseGlow 2.5s infinite ease-in-out",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
                }}
              >
                {p.profileSaving
                  ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                  : <Save style={{ width: 16, height: 16 }} />
                }
                <span>{p.profileSaving ? "Saving..." : "Save Profile Details"}</span>
              </button>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 12,
                background: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
                color: isDark ? "#4ade80" : "#16a34a",
                fontSize: 13, fontWeight: 700,
                boxShadow: isDark ? "0 4px 12px rgba(34,197,94,0.05)" : "none",
              }}>
                <Check style={{ width: 16, height: 16 }} />
                <span>Synchronized</span>
              </div>
            )}
          </div>
        </div>

        {/* Minimal metrics shelf */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
          background: isDark ? "rgba(255,255,255,0.01)" : "#fafafa",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}>
          {[
            { value: String(skillCount), label: "Linked Skills", icon: <Award style={{ width: 14, height: 14 }} /> },
            { value: String(projectCount), label: "Featured Projects", icon: <Terminal style={{ width: 14, height: 14 }} /> },
            { value: String(educationCount), label: "Education Entries", icon: <GraduationCap style={{ width: 14, height: 14 }} /> },
          ].map((metric, idx) => (
            <div key={idx} style={{
              padding: "16px 20px",
              borderRight: idx < 2 ? "1px solid var(--border)" : "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#818cf8" }}>
                {metric.icon}
                <span style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)", letterSpacing: -0.5 }}>{metric.value}</span>
              </div>
              <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1.2, color: "var(--muted-foreground)", opacity: 0.8 }}>
                {metric.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Bento Grid Columns Wrapper ═══ */}
      <div className="bento-wrapper" style={{
        display: "grid", gridTemplateColumns: "380px 1fr", gap: 24,
        alignItems: "start", paddingBottom: 60,
      }}>

        {/* ─── LEFT SIDE COLUMN ─── */}
        <div className="bento-sticky-col" style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 20 }}>
          
          {/* Glassmorphic Resume Upload Card */}
          <div className="bento-card" style={{ position: "relative" }}>
            {/* Loading state glass cover */}
            {p.isUploadingResume && (
              <div style={{
                position: "absolute", inset: 0,
                background: isDark ? "rgba(13,13,13,0.92)" : "rgba(255,255,255,0.92)",
                backdropFilter: "blur(12px)", zIndex: 30,
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 18, padding: 24, textAlign: "center",
              }}>
                <div style={{ position: "relative", width: 56, height: 56 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    border: "3.5px solid transparent",
                    borderTopColor: "#818cf8", borderRightColor: "#f472b6",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <Sparkles style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: 18, height: 18, color: "#818cf8",
                  }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)", margin: "0 0 6px", letterSpacing: -0.2 }}>
                    AI Analyzing Experience
                  </h4>
                  <p style={{ fontSize: 11, fontFamily: "monospace", color: "#818cf8", background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)", padding: "4px 10px", borderRadius: 8, margin: 0 }}>
                    {p.resumeUploadStep}
                  </p>
                </div>
              </div>
            )}

            {sectionHead(
              <UploadCloud style={{ width: 16, height: 16 }} />,
              "Resume Upload",
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Dotted drag field */}
              <div
                onClick={p.handleTriggerFileInput}
                style={{
                  border: `2px dashed ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"}`,
                  borderRadius: 16, padding: "28px 20px", textAlign: "center",
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 12, transition: "all 0.25s ease",
                  background: isDark ? "rgba(99,102,241,0.02)" : "rgba(99,102,241,0.01)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#818cf8";
                  e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.03)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)";
                  e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.02)" : "rgba(99,102,241,0.01)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <input type="file" ref={p.fileInputRef} onChange={p.handleResumeFileSelected} accept=".pdf" style={{ display: "none" }} />
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.06))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#818cf8"
                }}>
                  <UploadCloud style={{ width: 22, height: 22 }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px", letterSpacing: -0.2 }}>
                    {hasResume ? "Replace Existing PDF" : "Drop Resume PDF"}
                  </h4>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.4 }}>
                    Drag & drop or click to choose.<br/>Gemini AI will sync all details.
                  </p>
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 50,
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.04))",
                  border: "1px solid rgba(99,102,241,0.12)",
                }}>
                  <Sparkles style={{ width: 11, height: 11, color: "#818cf8" }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#818cf8", textTransform: "uppercase", letterSpacing: 0.5 }}>Gemini Parsing Engine</span>
                </div>
              </div>

              {/* Active synced file meta */}
              {hasResume && (
                <div style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: isDark ? "rgba(34,197,94,0.03)" : "#f0fdf4",
                  border: `1px solid ${isDark ? "rgba(34,197,94,0.15)" : "#d1fae5"}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <FileText style={{ width: 15, height: 15, color: "#22c55e", flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: "var(--foreground)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {p.profile.resumeFileName}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 50,
                    background: isDark ? "rgba(34,197,94,0.08)" : "#d1fae5",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>Active</span>
                  </div>
                </div>
              )}

              {/* Accordion raw text extraction */}
              {p.profile.resumeText && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button
                    onClick={() => setShowResumeText(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, width: "100%",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--muted-foreground)", fontSize: 12, fontWeight: 700,
                      padding: "4px 0", textAlign: "left", transition: "color 0.2s",
                      outline: "none"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
                  >
                    {showResumeText
                      ? <ChevronUp style={{ width: 14, height: 14 }} />
                      : <ChevronDown style={{ width: 14, height: 14 }} />
                    }
                    <span>{showResumeText ? "Hide" : "Show"} Extracted Resume Text</span>
                  </button>
                  
                  {showResumeText && (
                    <div style={{
                      marginTop: 10,
                      background: isDark ? "#080808" : "#f4f4f5",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                      animation: "fadeSlideIn 0.2s ease"
                    }}>
                      {/* Fake code header */}
                      <div style={{
                        padding: "8px 12px", borderBottom: "1px solid var(--border)",
                        background: isDark ? "#0d0d0d" : "#e4e4e7",
                        display: "flex", alignItems: "center", justifyContent: "space-between"
                      }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted-foreground)", fontWeight: 700 }}>
                          resume_extracted.txt
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#eab308" }} />
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                        </div>
                      </div>
                      <div style={{
                        padding: 12, maxHeight: 180, overflowY: "auto",
                        fontSize: 11, fontFamily: "monospace", color: "var(--muted-foreground)",
                        lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {p.profile.resumeText}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Credentials Card */}
          <div className="bento-card">
            {sectionHead(
              <Users style={{ width: 16, height: 16 }} />,
              "Credentials & Links",
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <FieldInput
                label="Full Name"
                value={p.profile.name}
                onChange={v => p.setProfile({ ...p.profile!, name: v })}
                placeholder="John Doe"
              />
              <FieldInput
                label="Professional Title"
                value={p.profile.role}
                onChange={v => p.setProfile({ ...p.profile!, role: v })}
                icon={<Briefcase style={{ width: 13, height: 13 }} />}
                placeholder="Senior Full Stack Engineer"
              />
              <FieldInput
                label="Public Email"
                value={p.profile.email}
                type="email"
                onChange={v => p.setProfile({ ...p.profile!, email: v })}
                icon={<Mail style={{ width: 13, height: 13 }} />}
                placeholder="johndoe@email.com"
              />
              
              <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

              <FieldInput
                label="Portfolio URL"
                value={p.profile.portfolioUrl}
                type="url"
                onChange={v => p.setProfile({ ...p.profile!, portfolioUrl: v })}
                icon={<Globe style={{ width: 13, height: 13 }} />}
                placeholder="https://johndoe.dev"
              />
              <FieldInput
                label="GitHub URL"
                value={p.profile.githubUrl}
                type="url"
                onChange={v => p.setProfile({ ...p.profile!, githubUrl: v })}
                icon={<GitBranch style={{ width: 13, height: 13 }} />}
                placeholder="https://github.com/johndoe"
              />
              <FieldInput
                label="LinkedIn Profile"
                value={p.profile.linkedinUrl}
                type="url"
                onChange={v => p.setProfile({ ...p.profile!, linkedinUrl: v })}
                icon={<Link2 style={{ width: 13, height: 13 }} />}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
          </div>
        </div>

        {/* ─── RIGHT SIDE COLUMN ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Technical Skills Deck */}
          <div className="bento-card">
            {sectionHead(
              <Code2 style={{ width: 16, height: 16 }} />,
              "Technical Skills Deck",
              countBadge(skillCount, "skills"),
            )}

            {/* Categorization reference legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "Framework", color: "#818cf8" },
                { label: "Language",  color: "#4ade80" },
                { label: "Tool / Cloud", color: "#fb923c" },
                { label: "Design",    color: "#f472b6" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 700 }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Skills container board */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8, padding: 18,
              background: isDark ? "rgba(255,255,255,0.01)" : "#fafafa",
              border: "1px solid var(--border)", borderRadius: 16, minHeight: 100,
            }}>
              {p.profile.skills.map(skill => {
                const cat = getSkillCat(skill);
                const c = SKILL_COLORS[cat];
                return (
                  <span
                    key={skill}
                    className="skill-tag-pill"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 12, padding: "6px 12px", borderRadius: 10,
                      background: isDark ? c.darkBg : c.bg, color: c.color,
                      fontWeight: 700, border: `1px solid ${isDark ? c.darkBorder : c.border}`,
                      cursor: "default",
                    }}
                  >
                    {skill}
                    <button
                      type="button" onClick={() => p.handleDeleteSkill(skill)}
                      style={{
                        background: "none", border: "none", color: "inherit",
                        opacity: 0.5, cursor: "pointer", padding: 0, display: "flex",
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </span>
                );
              })}
              {skillCount === 0 && (
                <span style={{ fontSize: 13, color: "var(--muted-foreground)", opacity: 0.6, width: "100%", textAlign: "center", padding: "12px 0" }}>
                  No skills mapped. Drop a resume or key them in below.
                </span>
              )}
            </div>

            {/* Inline skill add form */}
            <form onSubmit={p.handleAddSkill} style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <input
                type="text" value={p.newSkillText}
                onChange={e => p.setNewSkillText(e.target.value)}
                placeholder="Append new skill (e.g. NextJS, AWS, GraphQL)..."
                className="glow-input"
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                disabled={!p.newSkillText.trim()}
                style={{
                  padding: "10px 22px", borderRadius: 10, border: "none",
                  background: p.newSkillText.trim()
                    ? "linear-gradient(135deg, #818cf8, #6366f1)" : "var(--border)",
                  color: p.newSkillText.trim() ? "#fff" : "var(--muted-foreground)",
                  fontSize: 13, fontWeight: 700,
                  cursor: p.newSkillText.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: p.newSkillText.trim() ? "0 4px 12px rgba(99,102,241,0.2)" : "none",
                }}
              >
                Add Skill
              </button>
            </form>
          </div>

          {/* Featured Projects Workspace */}
          <div className="bento-card">
            {sectionHead(
              <Laptop style={{ width: 16, height: 16 }} />,
              "Featured Projects",
              countBadge(projectCount, "projects"),
              addBtn("Add New Project", openAddProjectModal),
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {projectCount === 0 && (
                <div style={{
                  padding: "40px 20px", textAlign: "center",
                  border: "1.5px dashed var(--border)", borderRadius: 16,
                  color: "var(--muted-foreground)",
                }}>
                  <Terminal style={{ width: 32, height: 32, opacity: 0.3, margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, margin: 0 }}>Add individual projects to target tailored proposals.</p>
                </div>
              )}

              {p.profile.projects.map((proj, idx) => (
                <div key={idx} className="project-showcase-card" style={{
                  padding: 20, background: isDark ? "rgba(255,255,255,0.01)" : "#fafafa",
                  border: "1px solid var(--border)", borderRadius: 16,
                  position: "relative", display: "flex", flexDirection: "column", gap: 12,
                  transition: "border-color 0.2s ease",
                }}>
                  {/* Action buttons (Edit & Delete) overlay shown on hover */}
                  <div className="action-overlay" style={{
                    position: "absolute", right: 14, top: 14,
                    display: "flex", gap: 6, zIndex: 10
                  }}>
                    <button
                      onClick={() => openEditProjectModal(idx)}
                      title="Edit Project"
                      style={{
                        background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)", cursor: "pointer", padding: "6px 8px",
                        borderRadius: 8, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                      }}
                    >
                      <Edit2 style={{ width: 12, height: 12 }} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => p.handleDeleteProject(idx)}
                      title="Delete Project"
                      style={{
                        background: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
                        border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "#fecaca"}`,
                        color: "#ef4444", cursor: "pointer", padding: "6px 8px",
                        borderRadius: 8, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(239,68,68,0.05)"
                      }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Showcase Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 100 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: -0.3 }}>
                      {proj.name}
                    </h4>
                    
                    {/* Rendered tech chips */}
                    {proj.tech.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                        {proj.tech.map(tag => {
                          const cat = getSkillCat(tag);
                          const c = SKILL_COLORS[cat];
                          return (
                            <span key={tag} style={{
                              fontSize: 10, padding: "3px 8px", borderRadius: 6,
                              background: isDark ? c.darkBg : c.bg, color: c.color,
                              border: `1px solid ${isDark ? c.darkBorder : c.border}`, fontWeight: 700,
                            }}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Description paragraph */}
                  <p style={{
                    fontSize: 13, color: "var(--muted-foreground)", margin: 0,
                    lineHeight: 1.6, whiteSpace: "pre-wrap"
                  }}>
                    {proj.description || "No description provided."}
                  </p>

                  {/* Showcase links deck */}
                  {proj.links && proj.links.length > 0 && (
                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: 8,
                      borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4
                    }}>
                      {proj.links.map((link, lIdx) => (
                        <a
                          key={lIdx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
                            fontSize: 11, padding: "5px 12px", borderRadius: 8,
                            background: isDark ? "rgba(255,255,255,0.02)" : "#f3f4f6",
                            border: "1px solid var(--border)",
                            color: link.label.toLowerCase() === "github" ? "#818cf8"
                                 : link.label.toLowerCase().includes("store") ? "#4ade80"
                                 : link.label.toLowerCase() === "web" || link.label.toLowerCase() === "demo" ? "#f472b6"
                                 : "var(--muted-foreground)",
                            fontWeight: 700,
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.borderColor = "#818cf8";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.borderColor = "var(--border)";
                          }}
                        >
                          <span style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 900 }}>
                            {link.label}
                          </span>
                          <span style={{ color: "var(--muted-foreground)", fontSize: 11, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120, whiteSpace: "nowrap" }}>
                            {link.url.replace(/^https?:\/\/(www\.)?/, "")}
                          </span>
                          <ExternalLink style={{ width: 10, height: 10, opacity: 0.6 }} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Education Timeline */}
          <div className="bento-card">
            {sectionHead(
              <EduIcon style={{ width: 16, height: 16 }} />,
              "Education timeline",
              countBadge(educationCount, "entries"),
              addBtn("Add Entry", p.handleAddBlankEducation),
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
              {educationCount > 0 && (
                <div className="timeline-track" />
              )}
              {educationCount === 0 && (
                <div style={{
                  padding: "30px 20px", textAlign: "center",
                  border: "1.5px dashed var(--border)", borderRadius: 16,
                  color: "var(--muted-foreground)", fontSize: 13,
                }}>
                  No degrees or certifications entered. Add manually above.
                </div>
              )}

              {p.profile.education.map((edu, idx) => (
                <div key={idx} style={{
                  paddingLeft: 36, position: "relative",
                  animation: "fadeSlideIn 0.3s ease"
                }}>
                  {/* Timeline bullet node */}
                  <div style={{
                    position: "absolute", left: 14, top: 22,
                    width: 14, height: 14, borderRadius: "50%",
                    background: "var(--card)", border: "3px solid #818cf8",
                    boxShadow: "0 0 0 4px rgba(99,102,241,0.1)",
                    transform: "translateX(-50%)", zIndex: 10,
                  }} />

                  <div style={{
                    padding: 18, background: isDark ? "rgba(255,255,255,0.01)" : "#fafafa",
                    border: "1px solid var(--border)", borderRadius: 16, position: "relative",
                  }}>
                    {/* Delete education entry */}
                    <button
                      onClick={() => p.handleDeleteEducation(idx)}
                      style={{
                        position: "absolute", right: 12, top: 12,
                        background: "none", border: "none",
                        color: "var(--muted-foreground)", opacity: 0.4, cursor: "pointer", padding: 4,
                        borderRadius: 6, transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.background = "none"; }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 14, paddingRight: 20 }}>
                      <FieldInput
                        label="Degree / Certification"
                        value={edu.degree}
                        onChange={v => p.handleEducationChange(idx, "degree", v)}
                        placeholder="B.S. in Computer Science"
                      />
                      <FieldInput
                        label="School / Institution"
                        value={edu.school}
                        onChange={v => p.handleEducationChange(idx, "school", v)}
                        placeholder="Stanford University"
                      />
                      <FieldInput
                        label="Graduation Year"
                        value={edu.year}
                        onChange={v => p.handleEducationChange(idx, "year", v)}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ Glassmorphic Project Edit/Add Modal ═══ */}
      {isProjectModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "20px 24px", borderBottom: "1px solid var(--border)"
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "var(--foreground)", margin: 0, letterSpacing: -0.4 }}>
                {activeProjectIdx === -1 ? "Add Featured Project" : "Edit Featured Project"}
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                style={{
                  background: "none", border: "none", color: "var(--muted-foreground)",
                  cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.background = "var(--border)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "none"; }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveModalProject} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              
              <FieldInput
                label="Project Title"
                value={modalProjectName}
                onChange={setModalProjectName}
                placeholder="e.g. PropAI (Proposal Organizer)"
              />

              <FieldInput
                label="Technologies (Comma-separated)"
                value={modalProjectTech}
                onChange={setModalProjectTech}
                placeholder="e.g. Next.js, React, Tailwind CSS, PostgreSQL"
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <SectionLabel>Description & Impact</SectionLabel>
                <textarea
                  rows={4}
                  value={modalProjectDesc}
                  onChange={e => setModalProjectDesc(e.target.value)}
                  placeholder="Summarize key features, architectures, performance stats, and product impact..."
                  className="glow-textarea"
                />
              </div>

              {/* Links and Deployments inside modal */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 6 }}>
                <SectionLabel>Links & Deployments</SectionLabel>

                {/* List of active modal links */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, marginBottom: 12 }}>
                  {modalProjectLinks.length > 0 ? (
                    modalProjectLinks.map((link, lIdx) => (
                      <div key={lIdx} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 12, padding: "5px 12px", borderRadius: 8,
                        background: isDark ? "rgba(255,255,255,0.02)" : "#f3f4f6",
                        border: "1px solid var(--border)",
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 900, textTransform: "uppercase",
                          color: link.label.toLowerCase() === "github" ? "#818cf8"
                               : link.label.toLowerCase().includes("store") ? "#4ade80"
                               : link.label.toLowerCase() === "web" || link.label.toLowerCase() === "demo" ? "#f472b6"
                               : "var(--muted-foreground)",
                        }}>
                          {link.label}
                        </span>
                        <span style={{ color: "var(--muted-foreground)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180, whiteSpace: "nowrap" }}>
                          {link.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteModalLink(lIdx)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--muted-foreground)", opacity: 0.5, padding: 0, display: "flex",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)", opacity: 0.5, fontStyle: "italic" }}>
                      No project URLs mapped. Add one below.
                    </span>
                  )}
                </div>

                {/* Link builder inputs */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={newModalLinkLabel}
                    onChange={e => setNewModalLinkLabel(e.target.value)}
                    style={{
                      width: 120, padding: "9px 12px", fontSize: 12, fontWeight: 600,
                      background: "var(--input)", border: "1px solid var(--border)",
                      borderRadius: 10, color: "var(--foreground)", outline: "none",
                    }}
                  >
                    <option value="GitHub">GitHub</option>
                    <option value="Web">Web Link</option>
                    <option value="Demo">Demo</option>
                    <option value="Play Store">Play Store</option>
                    <option value="App Store">App Store</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="url"
                    placeholder="https://example.com/asset"
                    value={newModalLinkUrl}
                    onChange={e => setNewModalLinkUrl(e.target.value)}
                    className="glow-input"
                    style={{ flex: 1, padding: "8px 12px", fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddModalLink}
                    disabled={!newModalLinkUrl.trim()}
                    style={{
                      padding: "9px 16px", borderRadius: 10, border: "none",
                      background: newModalLinkUrl.trim()
                        ? "linear-gradient(135deg, #818cf8, #6366f1)" : "var(--border)",
                      color: newModalLinkUrl.trim() ? "#fff" : "var(--muted-foreground)",
                      fontSize: 12, fontWeight: 800,
                      cursor: newModalLinkUrl.trim() ? "pointer" : "not-allowed",
                      transition: "all 0.2s",
                    }}
                  >
                    Link Asset
                  </button>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div style={{
                display: "flex", justifyContent: "flex-end", gap: 12,
                borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 10
              }}>
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  style={{
                    padding: "10px 20px", borderRadius: 10,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--foreground)", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--input)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalProjectName.trim()}
                  style={{
                    padding: "10px 24px", borderRadius: 10, border: "none",
                    background: modalProjectName.trim()
                      ? "linear-gradient(135deg, #818cf8, #6366f1)" : "var(--border)",
                    color: modalProjectName.trim() ? "#fff" : "var(--muted-foreground)",
                    fontSize: 13, fontWeight: 800,
                    cursor: modalProjectName.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                    boxShadow: modalProjectName.trim() ? "0 4px 12px rgba(99,102,241,0.2)" : "none",
                  }}
                >
                  Save Project Details
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
