"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Smartphone, CheckCircle2, QrCode, Users, RefreshCw,
  MessageSquare, Clock, ChevronRight, LogOut, Wifi, WifiOff,
  Search, Copy, Check, AlertCircle, Loader2, ArrowRight
} from "lucide-react";
import { useTheme } from "../../components/theme-provider";

// ─── Types ───────────────────────────────────────────────────────────────────
interface WAStatus {
  connected: boolean;
  phone: string | null;
  name: string | null;
  hasQR: boolean;
  error?: string;
}

interface WAGroup {
  id: string;
  name: string;
  participantCount: number;
  description: string;
}

interface WAMessage {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: number;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ step, current, done, label, isDark }: {
  step: number; current: number; done: boolean; label: string; isDark: boolean;
}) {
  const active = step === current;
  const color  = done ? "#22c55e" : active ? "#6366f1" : "var(--muted-foreground)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: step > current ? 0.4 : 1 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: done ? "rgba(34,197,94,0.12)" : active ? "rgba(99,102,241,0.12)" : "transparent",
        border: `2px solid ${color}`,
        transition: "all 0.3s ease",
      }}>
        {done
          ? <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e" }} />
          : <span style={{ fontSize: 13, fontWeight: 700, color }}>{step}</span>
        }
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color }}>{label}</span>
      {step < 3 && (
        <ChevronRight style={{ width: 14, height: 14, color: "var(--muted-foreground)", opacity: 0.4, marginLeft: 4 }} />
      )}
    </div>
  );
}

interface MessageGroup {
  label: string;
  messages: WAMessage[];
}

const getGroupLabel = (timestamp: number): string => {
  const d = new Date(timestamp * 1000);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();
                      
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
};

const groupMessages = (msgs: WAMessage[]): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  msgs.forEach(msg => {
    const label = getGroupLabel(msg.timestamp);
    let group = groups.find(g => g.label === label);
    if (!group) {
      group = { label, messages: [] };
      groups.push(group);
    }
    group.messages.push(msg);
  });
  return groups;
};

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isDark, onUseAsLead }: {
  msg: WAMessage; isDark: boolean; onUseAsLead: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  
  const date = new Date(msg.timestamp * 1000);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: 14,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      display: "flex", flexDirection: "column", gap: 8,
      transition: "all 0.2s ease",
    }}
    onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)")}
    onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `hsl(${msg.sender.charCodeAt(0) * 10 % 360}, 60%, ${isDark ? "40%" : "65%"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {(msg.senderName || msg.sender).charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            {msg.senderName || msg.sender}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{time}</span>
          <button
            onClick={handleCopy}
            style={{
              padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "transparent", color: "var(--muted-foreground)", fontSize: 11,
              display: "flex", alignItems: "center", gap: 4,
            }}
            title="Copy message"
          >
            {copied ? <Check style={{ width: 12, height: 12, color: "#22c55e" }} /> : <Copy style={{ width: 12, height: 12 }} />}
          </button>
          <button
            onClick={() => onUseAsLead(msg.text)}
            style={{
              padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "rgba(99,102,241,0.1)",
              color: isDark ? "#818cf8" : "#6366f1",
              fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.2s ease",
            }}
            title="Use as job lead"
          >
            Use as lead <ArrowRight style={{ width: 10, height: 10 }} />
          </button>
        </div>
      </div>
      {/* Text */}
      <p style={{
        margin: 0, fontSize: 13, lineHeight: 1.6,
        color: "var(--foreground)", wordBreak: "break-word",
      }}>
        {msg.text}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  // Step: 1 = Link WA, 2 = Select Group, 3 = Messages
  const [step, setStep]               = useState(1);
  const [status, setStatus]           = useState<WAStatus | null>(null);
  const [qrDataUrl, setQrDataUrl]     = useState<string | null>(null);
  const [groups, setGroups]           = useState<WAGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<WAGroup | null>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("wa_linked_group");
      return s ? JSON.parse(s) : null;
    }
    return null;
  });
  const [messages, setMessages]       = useState<WAMessage[]>([]);
  const [isSyncing, setIsSyncing]     = useState(false);
  const [syncStatus, setSyncStatus]   = useState<string>("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [search, setSearch]           = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [serviceOffline, setServiceOffline] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const qrPollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAllPolling = useCallback(() => {
    if (qrPollRef.current)     { clearInterval(qrPollRef.current);     qrPollRef.current = null; }
    if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
  }, []);

  const startPolling = useCallback((fetchStatus: () => void, fetchQR: () => void) => {
    stopAllPolling();
    qrPollRef.current     = setInterval(fetchQR,     3000);
    statusPollRef.current = setInterval(fetchStatus, 8000);
  }, [stopAllPolling]);

  // ─── Poll status ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch("/api/whatsapp/status");
      const data = await res.json() as WAStatus;
      setStatus(data);
      setServiceOffline(false);

      if (data.connected) {
        // Connected — stop all polling, go to right step
        stopAllPolling();
        setQrDataUrl(null);
        setStep(prev => prev < 2 ? 2 : prev);
        const saved = localStorage.getItem("wa_linked_group");
        if (saved) setStep(3);
      }
    } catch {
      setServiceOffline(true);
    }
  }, [stopAllPolling]);

  // ─── Poll QR ────────────────────────────────────────────────────────────────
  const fetchQR = useCallback(async () => {
    try {
      const res  = await fetch("/api/whatsapp/qr");
      const data = await res.json();
      if (data.connected) {
        stopAllPolling();
        fetchStatus();
        return;
      }
      if (data.qr) setQrDataUrl(data.qr);
    } catch {}
  }, [fetchStatus, stopAllPolling]);

  // ─── Sync today's messages ───────────────────────────────────────────────────
  const syncMessages = useCallback(async () => {
    if (!selectedGroup) return;
    setIsSyncing(true);
    setSyncStatus("Fetching today's messages...");
    try {
      const res  = await fetch(`/api/whatsapp/messages/${encodeURIComponent(selectedGroup.id)}`);
      const data = await res.json();
      const msgs = data.messages || [];
      const sortedMsgs = [...msgs].sort((a: WAMessage, b: WAMessage) => b.timestamp - a.timestamp);
      setMessages(sortedMsgs);
      setLastSyncTime(new Date());
      setSyncStatus("");
    } catch {
      setMessages([]);
      setSyncStatus("");
    } finally {
      setIsSyncing(false);
    }
  }, [selectedGroup]);





  // ─── On mount ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    // Only start polling if not already connected (status check above will stop it)
    startPolling(fetchStatus, fetchQR);
    return () => stopAllPolling();
  }, [fetchStatus, fetchQR, startPolling, stopAllPolling]);

  // Restore step from saved group
  useEffect(() => {
    if (selectedGroup && status?.connected) setStep(3);
  }, [selectedGroup, status]);

  // ─── Load groups ─────────────────────────────────────────────────────────────
  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const res  = await fetch("/api/whatsapp/groups");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };



  // ─── Disconnect ──────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      setStep(1);
      setQrDataUrl(null);
      setGroups([]);
      setSelectedGroup(null);
      setMessages([]);
      localStorage.removeItem("wa_linked_group");
      setStatus({ connected: false, phone: null, name: null, hasQR: false });
    } finally {
      setIsDisconnecting(false);
      // Start QR poll again
      qrPollRef.current = setInterval(fetchQR, 3000);
    }
  };

  // ─── Use message as job lead ─────────────────────────────────────────────────
  const handleUseAsLead = (text: string) => {
    // Redirect to /dashboard/new with the text pre-filled
    const params = new URLSearchParams({ text });
    window.location.href = `/dashboard/new?${params}`;
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const card: React.CSSProperties = {
    background:   isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    border:       `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
    borderRadius: 20,
    padding:      28,
  };

  return (
    <div style={{
      maxWidth: 860,
      margin: "0 auto",
      padding: "32px 24px 80px",
      fontFamily: "var(--font-sans)",
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #25d366, #128c7e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(37,211,102,0.3)",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
              WhatsApp Groups
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>
              Sync job leads from your WhatsApp groups
            </p>
          </div>

          {status?.connected && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20,
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>
                  {status.name || status.phone || "Connected"}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                style={{
                  padding: "6px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2",
                  color: "#ef4444", fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {isDisconnecting ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <LogOut style={{ width: 12, height: 12 }} />}
                Unlink
              </button>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "14px 18px", borderRadius: 14, marginTop: 16,
          background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
        }}>
          <StepDot step={1} current={step} done={step > 1} label="Link WhatsApp" isDark={isDark} />
          <StepDot step={2} current={step} done={step > 2} label="Select Group" isDark={isDark} />
          <StepDot step={3} current={step} done={false} label="Sync Messages" isDark={isDark} />
        </div>
      </div>

      {/* ── Service offline warning ── */}
      {serviceOffline && (
        <div style={{
          ...card, marginBottom: 20,
          borderColor: "rgba(239,68,68,0.2)",
          background: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle style={{ width: 18, height: 18, color: "#ef4444", flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
                WhatsApp Service Offline
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: isDark ? "#f87171" : "#dc2626" }}>
                Start the WA service: <code style={{ background: "rgba(0,0,0,0.1)", padding: "1px 6px", borderRadius: 4 }}>cd wa-service && npm start</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 1 — Link WhatsApp
      ══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div style={card}>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
              Scan QR Code
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
              Open WhatsApp → Linked Devices → Link a Device → Scan this code
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", margin: "24px 0" }}>
            {qrDataUrl ? (
              <div style={{
                padding: 16, borderRadius: 20,
                background: "#fff",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}>
                <img src={qrDataUrl} alt="WhatsApp QR Code" style={{ width: 260, height: 260, display: "block" }} />
              </div>
            ) : (
              <div style={{
                width: 292, height: 292, borderRadius: 20,
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                border: `2px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <Loader2 style={{ width: 32, height: 32, color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  {serviceOffline ? "Start wa-service first" : "Generating QR code..."}
                </span>
              </div>
            )}
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: 8,
            padding: "16px", borderRadius: 12,
            background: isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)",
            border: `1px solid ${isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)"}`,
          }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: isDark ? "#a5b4fc" : "#6366f1" }}>
              📱 How to link:
            </p>
            {["Open WhatsApp on your phone", "Tap Menu (⋮) or Settings → Linked Devices", "Tap 'Link a Device'", "Point camera at the QR code above"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 12, color: isDark ? "#a5b4fc" : "#6366f1", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 2 — Select Group
      ══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Select a Group</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground)" }}>
                Choose the group you want to monitor for job leads
              </p>
            </div>
            <button
              onClick={loadGroups}
              disabled={isLoadingGroups}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              {isLoadingGroups
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : <RefreshCw style={{ width: 14, height: 14 }} />}
              Load Groups
            </button>
          </div>

          {groups.length > 0 && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--muted-foreground)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search groups..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px 10px 38px", borderRadius: 10,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  background: isDark ? "rgba(255,255,255,0.04)" : "#fafafa",
                  color: "var(--foreground)", fontSize: 13, outline: "none",
                }}
              />
            </div>
          )}

          {groups.length === 0 && !isLoadingGroups && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted-foreground)" }}>
              <Users style={{ width: 36, height: 36, margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Click "Load Groups" to fetch your WhatsApp groups</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group);
                  localStorage.setItem("wa_linked_group", JSON.stringify(group));
                  setStep(3);
                  setMessages([]);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12, border: "none",
                  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `hsl(${group.name.charCodeAt(0) * 8 % 360}, 55%, ${isDark ? "35%" : "60%"})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff",
                }}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                    {group.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                    {group.participantCount} participants
                    {group.description && ` · ${group.description.slice(0, 60)}...`}
                  </p>
                </div>
                <ChevronRight style={{ width: 16, height: 16, color: "var(--muted-foreground)" }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 3 — Messages
      ══════════════════════════════════════════════════════════════ */}
      {step === 3 && selectedGroup && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Group header */}
          <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: `hsl(${selectedGroup.name.charCodeAt(0) * 8 % 360}, 55%, ${isDark ? "35%" : "60%"})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff",
              }}>
                {selectedGroup.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
                  {selectedGroup.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>
                  {selectedGroup.participantCount} participants · Today's messages
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => { setStep(2); loadGroups(); }}
                style={{
                  padding: "8px 14px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  background: "transparent", color: "var(--foreground)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Change Group
              </button>
              <button
                onClick={syncMessages}
                disabled={isSyncing}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 18px", borderRadius: 10, border: "none",
                  background: isSyncing ? "#128c7e" : "linear-gradient(135deg, #25d366, #128c7e)",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
                  minWidth: 140,
                }}
              >
                {isSyncing
                  ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  : <RefreshCw style={{ width: 14, height: 14 }} />}
                {isSyncing ? "Syncing..." : "Sync Today"}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare style={{ width: 16, height: 16, color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {messages.length > 0 ? `${messages.length} messages today` : "No messages synced yet"}
                </span>
              </div>
              {lastSyncTime && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 12 }}>
                  <Clock style={{ width: 13, height: 13 }} />
                  Last sync: {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>

            {/* Sync status message */}
            {isSyncing && syncStatus && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                background: isDark ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.06)",
                border: "1px solid rgba(37,211,102,0.2)",
              }}>
                <Loader2 style={{ width: 13, height: 13, color: "#25d366", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#25d366", fontWeight: 500 }}>{syncStatus}</span>
              </div>
            )}

            {messages.length === 0 && !isSyncing ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
                <MessageSquare style={{ width: 40, height: 40, margin: "0 auto 16px", opacity: 0.25 }} />
                <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600 }}>No messages yet</p>
                <p style={{ margin: 0, fontSize: 13 }}>
                  Click "Sync Today" to load today's messages from this group.
                  <br />
                  <span style={{ opacity: 0.7, fontSize: 12 }}>Only messages received while the WA service is running will appear.</span>
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupMessages(messages).map(group => (
                  <div key={group.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Date Divider */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      margin: "20px 0 10px",
                      gap: 12
                    }}>
                      <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--muted-foreground)",
                        padding: "4px 12px",
                        borderRadius: 12,
                        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                      }}>
                        {group.label}
                      </span>
                      <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
                    </div>

                    {/* Messages under this group */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {group.messages.map(msg => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          isDark={isDark}
                          onUseAsLead={handleUseAsLead}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
