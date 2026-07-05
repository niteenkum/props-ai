"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { getJobChatHistoryAction, sendMessageToJobCopilotAction } from "../../../actions/ai-actions";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: string;
}

interface JobChatCopilotProps {
  jobId: string;
  userEmail: string;
  isDark: boolean;
}

const PRESETS = [
  { text: "💵 Negotiate salary/rate expectations", prompt: "Help me draft a professional response to negotiate the rate or salary expectations for this job." },
  { text: "📧 Reply to recruiter email", prompt: "I received a message from the recruiter. Help me draft the perfect response message to send next." },
  { text: "🚀 Pitch my profile for this job", prompt: "Write a high-converting pitch of my profile targeted specifically at this job role and company." },
  { text: "🔍 Prepare for interview questions", prompt: "What are the top technical and situational questions I should prepare for this job interview, and how should I answer them?" }
];

export default function JobChatCopilot({ jobId, userEmail, isDark }: JobChatCopilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history
  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await getJobChatHistoryAction(jobId, userEmail);
      setMessages(history);
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId && userEmail) {
      loadHistory();
    }
  }, [jobId, userEmail]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating]);

  const handleSend = async (contentToSend: string) => {
    if (!contentToSend.trim() || generating) return;
    setGenerating(true);

    // Optimistically add user message to list
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content: contentToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInput("");

    try {
      const res = await sendMessageToJobCopilotAction(jobId, userEmail, contentToSend);
      if (res.success && res.responseMessage) {
        setMessages(prev => {
          // Filter out temporary user message if database returns actual record
          const cleanHistory = prev.filter(m => m.id !== tempUserMsg.id);
          // Insert actual user message and response
          return [
            ...cleanHistory,
            { id: Math.random().toString(), role: "user", content: contentToSend, createdAt: new Date().toISOString() },
            res.responseMessage
          ];
        });
      } else {
        alert(res.error || "Failed to generate reply.");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "550px",
      background: isDark ? "#09090b" : "#ffffff",
      border: `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 16
    }}>
      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
            <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: "var(--primary)" }} />
            <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <Sparkles style={{ width: 24, height: 24, color: isDark ? "#818cf8" : "#6366f1" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>AI Negotiation &amp; Chat Copilot</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 360, margin: "0 0 16px", lineHeight: 1.5 }}>
              Ask questions, paste conversation threads from Upwork/LinkedIn, or negotiate rates. The AI is fully grounded in your profile and this job post.
            </p>
            {/* Presets Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 380 }}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.prompt)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                    color: "var(--foreground)",
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  className="preset-btn"
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    alignItems: "flex-start",
                    gap: 10
                  }}
                >
                  {!isUser && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                      🤖
                    </div>
                  )}
                  <div style={{ maxWidth: "78%" }}>
                    <div style={{
                      padding: "12px 16px",
                      borderRadius: 14,
                      background: isUser
                        ? "var(--primary)"
                        : (isDark ? "#121214" : "#f4f4f5"),
                      color: isUser ? "var(--primary-foreground)" : "var(--foreground)",
                      border: isUser
                        ? "none"
                        : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap"
                    }}>
                      {msg.content}
                    </div>
                    
                    {!isUser && (
                      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 4 }}>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--muted-foreground)",
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 6px",
                            borderRadius: 4,
                            transition: "background 0.1s"
                          }}
                          className="copy-btn"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={10} style={{ color: "#10b981" }} />
                              <span style={{ color: "#10b981" }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={10} />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {generating && (
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                  🤖
                </div>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: isDark ? "#121214" : "#f4f4f5",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  color: "var(--muted-foreground)",
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />
                  <span>Thinking &amp; writing response...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preset Pills for Quick Chat */}
      {messages.length > 0 && !loading && (
        <div style={{
          display: "flex",
          gap: 6,
          padding: "8px 12px",
          borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
          background: isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.005)",
          overflowX: "auto",
          whiteSpace: "nowrap" as const,
          scrollbarWidth: "none"
        }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p.prompt)}
              disabled={generating}
              style={{
                padding: "4px 10px",
                borderRadius: 50,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: isDark ? "#09090b" : "#ffffff",
                color: "var(--muted-foreground)",
                fontSize: 10.5,
                fontWeight: 700,
                cursor: generating ? "not-allowed" : "pointer"
              }}
            >
              {p.text}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend(input); }}
        style={{
          display: "flex",
          padding: "12px",
          borderTop: `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          background: isDark ? "#09090b" : "#ffffff",
          gap: 8
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={generating || loading}
          placeholder="Ask a question or paste chat history (e.g. from LinkedIn/Upwork)..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1.5px solid var(--foreground)`,
            background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
            color: "var(--foreground)",
            fontSize: 13,
            outline: "none"
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || generating || loading}
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            border: "none",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: (!input.trim() || generating || loading) ? "not-allowed" : "pointer",
            opacity: (!input.trim() || generating || loading) ? 0.6 : 1,
            transition: "opacity 0.15s"
          }}
        >
          <Send style={{ width: 14, height: 14 }} />
        </button>
      </form>
    </div>
  );
}
