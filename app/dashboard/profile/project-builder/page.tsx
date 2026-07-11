"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../components/theme-provider";
import { chatWithProjectBuilderAction } from "../../../actions/ai-actions";
import { addUserProjectAction } from "../../../actions/db-actions";
import {
  ArrowLeft, Send, Sparkles, Loader2, Save, Check,
  Code2, Layers, FileText, Link2, RotateCcw, Zap, MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface ProjectPreview {
  name: string;
  tech: string[];
  description: string;
  links: { label: string; url: string }[];
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────
function extractProjectJSON(text: string): ProjectPreview | null {
  const match = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed && typeof parsed.name === "string") {
      return {
        name: parsed.name || "",
        tech: Array.isArray(parsed.tech) ? parsed.tech : [],
        description: parsed.description || "",
        links: Array.isArray(parsed.links) ? parsed.links : [],
      };
    }
  } catch { /* ignore parse errors */ }
  return null;
}

// ─── Strip markdown JSON from display ─────────────────────────────────────────
function stripJSONBlock(text: string): string {
  return text.replace(/```json\s*\n[\s\S]*?\n```/g, "").trim();
}

// ─── Preset Prompts ───────────────────────────────────────────────────────────
const PRESETS = [
  { icon: <Zap style={{ width: 13, height: 13 }} />, label: "SaaS Product", prompt: "I built a SaaS product. Help me document it as a project." },
  { icon: <Code2 style={{ width: 13, height: 13 }} />, label: "Open Source", prompt: "I contributed to / built an open source project. Let's document it." },
  { icon: <Layers style={{ width: 13, height: 13 }} />, label: "System Design", prompt: "I designed a complex distributed system. Help me write a project entry for my profile." },
  { icon: <MessageSquare style={{ width: 13, height: 13 }} />, label: "Freelance Work", prompt: "I did a freelance project for a client. Help me describe it professionally." },
];

// ─── Page Component ───────────────────────────────────────────────────────────
export default function ProjectBuilderPage() {
  const { userEmail, isReady } = useAuth({ requiredStatus: "ACTIVE" });
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === "dark";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message
  const handleSend = useCallback(async (overrideMsg?: string) => {
    const text = overrideMsg || input.trim();
    if (!text || loading || !userEmail) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await chatWithProjectBuilderAction(userEmail, newHistory);
      if (res.success && res.response) {
        // Extract JSON from response for live preview
        const projectData = extractProjectJSON(res.response);
        if (projectData) setPreview(projectData);

        const modelMsg: ChatMessage = { role: "model", content: res.response };
        setMessages(prev => [...prev, modelMsg]);
      } else {
        const errMsg: ChatMessage = { role: "model", content: `⚠️ ${res.error || "Something went wrong."}` };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = { role: "model", content: `⚠️ ${err?.message || "Network error."}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, userEmail]);

  // Save project
  const handleSave = async () => {
    if (!preview || !userEmail || saving) return;
    setSaving(true);
    try {
      const res = await addUserProjectAction(userEmail, preview);
      if (res.success) {
        setSaved(true);
        setTimeout(() => router.push("/dashboard/profile"), 1500);
      } else {
        alert(res.error || "Failed to save.");
      }
    } catch {
      alert("Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  // Reset conversation
  const handleReset = () => {
    setMessages([]);
    setPreview(null);
    setSaved(false);
    setInput("");
    inputRef.current?.focus();
  };

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────────────
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const accentGlow = isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)";

  return (
    <div style={{
      minHeight: "100vh", padding: "24px 32px",
      background: isDark
        ? "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 100%)"
        : "linear-gradient(135deg, #fafbff 0%, #f0f1ff 100%)",
      color: "var(--foreground)",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 32,
      }}>
        <button
          onClick={() => router.push("/dashboard/profile")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 12,
            border: `1px solid ${borderColor}`, background: cardBg,
            color: "var(--muted-foreground)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Profile
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0,
            background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            AI Project Builder
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0 0" }}>
            Describe your project and AI will craft a polished, resume-ready entry
          </p>
        </div>
        <button
          onClick={handleReset}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10,
            border: `1px solid ${borderColor}`, background: "transparent",
            color: "var(--muted-foreground)", fontSize: 11, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <RotateCcw style={{ width: 12, height: 12 }} /> Start Over
        </button>
      </div>

      {/* Main Split Layout */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 420px", gap: 24,
        height: "calc(100vh - 140px)",
      }}>
        {/* LEFT — Chat Panel */}
        <div style={{
          display: "flex", flexDirection: "column",
          background: cardBg, borderRadius: 20,
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
        }}>
          {/* Chat Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: 24,
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            {messages.length === 0 && !loading && (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 24,
                padding: 40, textAlign: "center",
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                  border: `1.5px solid rgba(99,102,241,0.2)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sparkles style={{ width: 28, height: 28, color: "#818cf8" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px 0", letterSpacing: -0.3 }}>
                    What did you build?
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, maxWidth: 400 }}>
                    Tell me about a project you've worked on — I'll help you write a professional, impact-driven description for your profile.
                  </p>
                </div>

                {/* Preset chips */}
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
                  maxWidth: 480,
                }}>
                  {PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(p.prompt)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 12,
                        border: `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)"}`,
                        background: accentGlow,
                        color: "#818cf8", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeInUp 0.3s ease forwards",
                }}
              >
                <div style={{
                  maxWidth: "85%", padding: "12px 18px", borderRadius: 16,
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                    : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  color: msg.role === "user" ? "#fff" : "var(--foreground)",
                  border: msg.role === "user" ? "none" : `1px solid ${borderColor}`,
                  fontSize: 13, lineHeight: 1.7, fontWeight: 500,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {msg.role === "model" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 10, fontWeight: 700, color: "#818cf8",
                      textTransform: "uppercase", letterSpacing: 0.5,
                      marginBottom: 8,
                    }}>
                      <Sparkles style={{ width: 11, height: 11 }} /> AI Project Builder
                    </div>
                  )}
                  {msg.role === "model" ? stripJSONBlock(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 18px", borderRadius: 16,
                background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: `1px solid ${borderColor}`,
                maxWidth: "80%",
                animation: "fadeInUp 0.3s ease forwards",
              }}>
                <Loader2 style={{ width: 16, height: 16, color: "#818cf8", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 600 }}>
                  Crafting project details...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div style={{
            padding: 16, borderTop: `1px solid ${borderColor}`,
            background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)",
          }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-end",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your project or answer AI's questions..."
                rows={1}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 14,
                  border: `1.5px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)"}`,
                  background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                  color: "var(--foreground)", fontSize: 13, fontWeight: 500,
                  resize: "none", outline: "none", lineHeight: 1.5,
                  minHeight: 46, maxHeight: 120,
                  fontFamily: "'Inter', -apple-system, sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                onBlur={e => e.target.style.borderColor = isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)"}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: input.trim() && !loading
                    ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                    : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  opacity: input.trim() && !loading ? 1 : 0.4,
                }}
              >
                <Send style={{ width: 18, height: 18, color: input.trim() && !loading ? "#fff" : "var(--muted-foreground)" }} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview Panel */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* Preview Card */}
          <div style={{
            flex: 1, borderRadius: 20,
            border: `1px solid ${borderColor}`,
            background: cardBg,
            padding: 28,
            display: "flex", flexDirection: "column",
            position: "relative", overflow: "hidden",
          }}>
            {/* Header label */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 24,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 11, fontWeight: 700, color: "#818cf8",
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>
                <FileText style={{ width: 13, height: 13 }} /> Live Preview
              </div>
              {preview && (
                <span style={{
                  fontSize: 9, padding: "3px 10px", borderRadius: 50,
                  background: "rgba(34,197,94,0.1)", color: "#22c55e",
                  fontWeight: 700, border: "1px solid rgba(34,197,94,0.2)",
                }}>
                  ● SYNCED
                </span>
              )}
            </div>

            {!preview ? (
              /* Empty state */
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center", gap: 16, opacity: 0.5,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: `1px dashed ${borderColor}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Layers style={{ width: 22, height: 22, color: "var(--muted-foreground)" }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", maxWidth: 200, lineHeight: 1.5 }}>
                  Your project card will appear here as you describe it to the AI
                </p>
              </div>
            ) : (
              /* Live Preview Content */
              <div style={{
                display: "flex", flexDirection: "column", gap: 20,
                animation: "fadeInUp 0.4s ease forwards",
              }}>
                {/* Project Name */}
                <div>
                  <label style={{
                    fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>Project Name</label>
                  <h2 style={{
                    fontSize: 20, fontWeight: 800, margin: "6px 0 0 0",
                    letterSpacing: -0.5, color: "var(--foreground)",
                    lineHeight: 1.3,
                  }}>
                    {preview.name || "Untitled Project"}
                  </h2>
                </div>

                {/* Tech Stack */}
                <div>
                  <label style={{
                    fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
                    textTransform: "uppercase", letterSpacing: 0.5,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <Code2 style={{ width: 10, height: 10 }} /> Tech Stack
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {preview.tech.length > 0 ? preview.tech.map((t, i) => (
                      <span key={i} style={{
                        fontSize: 11, padding: "4px 12px", borderRadius: 8,
                        background: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
                        border: `1px solid rgba(99,102,241,0.2)`,
                        color: "#818cf8", fontWeight: 600,
                      }}>{t}</span>
                    )) : (
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                        Tech stack will appear as you describe your project
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{
                    fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>Description</label>
                  <p style={{
                    fontSize: 13, lineHeight: 1.7, color: "var(--foreground)",
                    margin: "8px 0 0 0", fontWeight: 500,
                    padding: 16, borderRadius: 12,
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
                    border: `1px solid ${borderColor}`,
                  }}>
                    {preview.description || "Description will appear here..."}
                  </p>
                </div>

                {/* Links */}
                {preview.links && preview.links.length > 0 && (
                  <div>
                    <label style={{
                      fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)",
                      textTransform: "uppercase", letterSpacing: 0.5,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <Link2 style={{ width: 10, height: 10 }} /> Links
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {preview.links.map((l, i) => (
                        <div key={i} style={{
                          fontSize: 12, color: "#818cf8", fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <Link2 style={{ width: 11, height: 11 }} /> {l.label}: {l.url}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!preview || saving || saved}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 24px", borderRadius: 14,
              background: saved
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                : preview && !saving
                  ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                  : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              border: "none",
              color: (preview && !saving) || saved ? "#fff" : "var(--muted-foreground)",
              fontSize: 14, fontWeight: 700,
              cursor: preview && !saving && !saved ? "pointer" : "not-allowed",
              transition: "all 0.3s",
              opacity: preview ? 1 : 0.4,
              boxShadow: preview && !saving
                ? "0 4px 20px rgba(99,102,241,0.3)"
                : "none",
            }}
          >
            {saved ? (
              <><Check style={{ width: 16, height: 16 }} /> Saved! Redirecting...</>
            ) : saving ? (
              <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Saving...</>
            ) : (
              <><Save style={{ width: 16, height: 16 }} /> Save to Profile</>
            )}
          </button>
        </div>
      </div>

      {/* Inline Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        textarea::placeholder {
          color: var(--muted-foreground);
          opacity: 0.6;
        }
        button.btn-add-action:hover {
          border-color: rgba(99,102,241,0.4) !important;
          color: #818cf8 !important;
        }
      `}</style>
    </div>
  );
}
