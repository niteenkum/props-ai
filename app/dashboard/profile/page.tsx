"use client";

import React from "react";
import {
  FileText, Users, Award, Terminal, GraduationCap,
  UploadCloud, Plus, Trash2, X, Check, Loader2, Save,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { useTheme } from "../../components/theme-provider";
import { cardStyle, inputStyle, labelStyle, sectionTitleStyle } from "../styles";

export default function ProfilePage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const p                      = useProfile(userEmail);
  const { theme }              = useTheme();
  const isDark                 = theme === "dark";

  if (!isReady || !p.profile) return null;

  return (
    <>
      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Candidate Profile
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
            Configure the custom parameters and resume points the AI uses to personalize outreach.
          </p>
        </div>
        <button
          onClick={() => p.handleSaveProfile()}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "var(--primary)", color: "var(--primary-foreground)",
            fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "var(--card-shadow)",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <Save style={{ width: 15, height: 15 }} />
          <span>{p.profileSaving ? "Saving..." : "Save Profile"}</span>
        </button>
      </header>

      {/* Profile saved banner */}
      {p.profileSaveSuccess && (
        <div style={{
          padding: "10px 16px", borderRadius: 10,
          background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
          border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "#bbf7d0"}`,
          color: isDark ? "#4ade80" : "#16a34a",
          fontSize: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Check style={{ width: 15, height: 15 }} />
          <span>Profile updated! All subsequent proposals will use your updated settings.</span>
        </div>
      )}

      {/* ── Two-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start", paddingBottom: 48 }}>

        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Resume upload */}
          <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
            {p.isUploadingResume && (
              <div style={{
                position: "absolute", inset: 0, background: "var(--card)", opacity: 0.96,
                backdropFilter: "blur(8px)", zIndex: 15,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, textAlign: "center",
              }}>
                <Loader2 style={{ width: 28, height: 28, color: "var(--foreground)", animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>Parsing Resume Index...</p>
                <p style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted-foreground)", margin: 0 }}>{p.resumeUploadStep}</p>
              </div>
            )}
            <h3 style={sectionTitleStyle}>
              <FileText style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
              Primary Candidate Resume
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
              <div
                onClick={p.handleTriggerFileInput}
                style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 24, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--muted-foreground)"; e.currentTarget.style.background = "var(--input)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
              >
                <input type="file" ref={p.fileInputRef} onChange={p.handleResumeFileSelected} accept=".pdf,.docx,.doc" style={{ display: "none" }} />
                <UploadCloud style={{ width: 28, height: 28, color: "var(--muted-foreground)", opacity: 0.4 }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", opacity: 0.8, margin: 0 }}>Upload New Resume</p>
                <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: 0 }}>Supports PDF, DOCX up to 10MB</p>
              </div>
              <div style={{ padding: "10px 14px", background: "var(--input)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <FileText style={{ width: 15, height: 15, color: p.profile.resumeFileName ? "#22c55e" : "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.profile.resumeFileName || "No active resume file"}
                  </span>
                </div>
                {p.profile.resumeFileName && <span style={{ fontSize: 9, color: "#22c55e", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>ACTIVE</span>}
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              <Users style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
              General Credentials
            </h3>
            <form style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
              {[
                { lbl: "Candidate Name", val: p.profile.name,         key: "name",         type: "text" },
                { lbl: "Expertise Role", val: p.profile.role,         key: "role",         type: "text" },
                { lbl: "Email Address",  val: p.profile.email,        key: "email",        type: "email" },
                { lbl: "Portfolio URL",  val: p.profile.portfolioUrl, key: "portfolioUrl", type: "url" },
                { lbl: "GitHub URL",     val: p.profile.githubUrl,    key: "githubUrl",    type: "url" },
                { lbl: "LinkedIn",       val: p.profile.linkedinUrl,  key: "linkedinUrl",  type: "url" },
              ].map(({ lbl, val, key, type }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={labelStyle}>{lbl}</label>
                  <input
                    type={type}
                    value={val}
                    onChange={e => p.setProfile({ ...p.profile!, [key]: e.target.value })}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                    onBlur={e =>  { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                </div>
              ))}
            </form>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Skills */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              <Award style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
              Technical Skills Index
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 14, background: "var(--input)", border: "1px solid var(--border)", borderRadius: 10, minHeight: 80 }}>
                {p.profile.skills.map(skill => (
                  <span key={skill} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 8, background: "var(--accent)", color: "var(--foreground)", fontWeight: 500, border: "1px solid var(--border)" }}>
                    {skill}
                    <button
                      type="button"
                      onClick={() => p.handleDeleteSkill(skill)}
                      style={{ background: "none", border: "none", color: "var(--muted-foreground)", opacity: 0.6, cursor: "pointer", padding: 0, display: "flex" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.opacity = "0.6"; }}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={p.handleAddSkill} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={p.newSkillText}
                  onChange={e => p.setNewSkillText(e.target.value)}
                  placeholder="Add technical capability (e.g. Docker, Webpack)..."
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <button
                  type="submit"
                  disabled={!p.newSkillText.trim()}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: p.newSkillText.trim() ? "var(--primary)" : "var(--border)",
                    color: p.newSkillText.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    fontSize: 12, fontWeight: 600, cursor: p.newSkillText.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Add Skill
                </button>
              </form>
            </div>
          </div>

          {/* Projects */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <Terminal style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
                Featured Projects
              </h3>
              <button
                onClick={p.handleAddBlankProject}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--input)", color: "var(--muted-foreground)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}
              >
                <Plus style={{ width: 11, height: 11 }} /> Add Project
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
              {p.profile.projects.map((proj, idx) => (
                <div key={idx} style={{ padding: 16, background: "var(--input)", border: "1px solid var(--border)", borderRadius: 10, position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={() => p.handleDeleteProject(idx)}
                    style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", color: "var(--muted-foreground)", opacity: 0.6, cursor: "pointer", padding: 4 }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.opacity = "0.6"; }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Project Name</label>
                      <input type="text" value={proj.name} onChange={e => p.handleProjectDetailChange(idx, "name", e.target.value)} style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Tech Stack</label>
                      <input type="text" value={proj.tech.join(", ")} onChange={e => p.handleProjectDetailChange(idx, "tech", e.target.value)} style={inputStyle} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>Description</label>
                    <textarea rows={2} value={proj.description} onChange={e => p.handleProjectDetailChange(idx, "description", e.target.value)} style={{ ...inputStyle, resize: "none" }} onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }} onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>
              <GraduationCap style={{ width: 15, height: 15, color: "var(--muted-foreground)", opacity: 0.6 }} />
              Education History
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 14 }}>
              {p.profile.education.map((edu, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {(["degree", "school", "year"] as const).map(field => (
                    <div key={field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, color: "var(--muted-foreground)" }}>
                        {field === "school" ? "Institution" : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <input
                        type="text"
                        value={edu[field]}
                        onChange={e => p.handleEducationChange(idx, field, e.target.value)}
                        style={inputStyle}
                        onFocus={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
                        onBlur={e =>  { e.currentTarget.style.borderColor = "var(--border)"; }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
