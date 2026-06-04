"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Zap, DollarSign, BarChart3, CheckCircle2, XCircle, Clock,
  RefreshCw, ChevronUp, ChevronDown, Search, Filter, TrendingUp,
  FileText, Brain, PenTool, Briefcase,
} from "lucide-react";
import { getAiExpenseLogsAction, getAiExpenseSummaryAction } from "../../actions/expense-actions";
import type { AiExpenseRow, AiExpenseSummary } from "../../actions/expense-actions";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = {
  usd:   (v: number) => v < 0.00001 ? "<$0.00001" : `$${v.toFixed(5)}`,
  usdK:  (v: number) => v >= 1 ? `$${v.toFixed(4)}` : fmt.usd(v),
  tokens:(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
  ms:    (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`,
  date:  (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
  },
};

const API_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pdf_parse:              { label: "PDF Parse",      icon: FileText,  color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  job_analysis:           { label: "Job Analysis",   icon: Brain,     color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  content_cold_email:     { label: "Cold Email",     icon: PenTool,   color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  content_proposal:       { label: "Proposal",       icon: Briefcase, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  content_linkedin:       { label: "LinkedIn",       icon: TrendingUp,color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
  content_cover_letter:   { label: "Cover Letter",   icon: FileText,  color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  pdf_reading:    { label: "PDF Reading",     color: "#8b5cf6" },
  job_analysis:   { label: "Job Analysis",    color: "#3b82f6" },
  content_writing:{ label: "Content Writing", color: "#10b981" },
  formalizing:    { label: "Formalizing",     color: "#0ea5e9" },
};

function getApiMeta(apiType: string) {
  return API_TYPE_META[apiType] ?? { label: apiType, icon: Zap, color: "#6b7280", bg: "rgba(107,114,128,0.12)" };
}

function getCategoryColor(cat: string) {
  return CATEGORY_META[cat]?.color ?? "#6b7280";
}

type SortKey = keyof Pick<AiExpenseRow, "createdAt" | "totalTokens" | "totalCostUsd" | "durationMs">;

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: "var(--card)", borderRadius: 16, padding: "20px 22px",
      border: "1px solid var(--border)", boxShadow: "var(--card-shadow)",
      display: "flex", gap: 16, alignItems: "center", position: "relative", overflow: "hidden",
    }}>
      {/* Glow orb */}
      <div style={{
        position: "absolute", top: -20, right: -20, width: 100, height: 100,
        borderRadius: "50%", background: color, opacity: 0.06, filter: "blur(20px)",
      }} />
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: "var(--foreground)", margin: "2px 0 0" }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Category Bar ────────────────────────────────────────────────────────────
function CategoryBreakdown({ rows }: { rows: AiExpenseSummary["byCategory"] }) {
  const maxCost = Math.max(...rows.map(r => r.costUsd), 0.000001);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => {
        const meta = CATEGORY_META[r.category] ?? { label: r.category, color: "#6b7280" };
        const pct  = (r.costUsd / maxCost) * 100;
        return (
          <div key={r.category}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{meta.label}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.calls} calls</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{fmt.usdK(r.costUsd)}</span>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, width: `${pct}%`,
                background: `linear-gradient(90deg, ${meta.color}aa, ${meta.color})`,
                transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ExpensePage() {
  const [logs,    setLogs]    = useState<AiExpenseRow[]>([]);
  const [summary, setSummary] = useState<AiExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterApiType,  setFilterApiType]  = useState<string>("all");
  const [filterStatus,   setFilterStatus]   = useState<"all" | "success" | "failed">("all");
  const [sortKey,  setSortKey]  = useState<SortKey>("createdAt");
  const [sortAsc,  setSortAsc]  = useState(false);
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const [logsData, sumData] = await Promise.all([
      getAiExpenseLogsAction(),
      getAiExpenseSummaryAction(),
    ]);
    setLogs(logsData);
    setSummary(sumData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived: filtered + sorted rows
  const filtered = logs.filter(r => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (filterApiType  !== "all" && r.apiType  !== filterApiType)  return false;
    if (filterStatus === "success" && !r.success) return false;
    if (filterStatus === "failed"  &&  r.success) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.apiType.includes(q) && !r.model.includes(q) && !(r.userEmail || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(s => !s);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : null;

  const allCategories = [...new Set(logs.map(l => l.category))];
  const allApiTypes   = [...new Set(logs.map(l => l.apiType))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={18} color="#fff" />
            </div>
            AI Expense Center
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0 44px" }}>
            Track every Gemini API call — tokens, cost, latency &amp; more
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)",
            color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard icon={Zap}          label="Total API Calls"   color="#8b5cf6"
            value={String(summary.totalCalls)}
            sub={`${summary.successCalls} success · ${summary.failedCalls} failed`} />
          <StatCard icon={DollarSign}   label="Total Cost"        color="#10b981"
            value={fmt.usdK(summary.totalCostUsd)}
            sub="Gemini 2.5 Flash pricing" />
          <StatCard icon={TrendingUp}   label="Total Tokens"      color="#3b82f6"
            value={fmt.tokens(summary.totalTokens)}
            sub={`In: ${fmt.tokens(summary.totalInputTokens)} · Out: ${fmt.tokens(summary.totalOutputTokens)}`} />
          <StatCard icon={Clock}        label="Avg Latency"       color="#f59e0b"
            value={fmt.ms(summary.avgLatencyMs)}
            sub="per API call" />
        </div>
      )}

      {/* ── Mid Row: Category Breakdown + API Type pills ────────────── */}
      {summary && summary.totalCalls > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* By Category */}
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 20,
            border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 16px",
              display: "flex", alignItems: "center", gap: 8 }}>
              <BarChart3 size={14} style={{ color: "var(--primary)" }} />
              Cost by Category
            </h3>
            <CategoryBreakdown rows={summary.byCategory} />
          </div>

          {/* By API Type */}
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 20,
            border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: "0 0 16px",
              display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={14} style={{ color: "var(--primary)" }} />
              Calls by API Type
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {summary.byApiType.map(r => {
                const meta = getApiMeta(r.apiType);
                const Icon = meta.icon;
                return (
                  <div key={r.apiType} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    borderRadius: 10, background: meta.bg,
                  }}>
                    <Icon size={14} style={{ color: meta.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{meta.label}</span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.calls}×</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{fmt.tokens(r.tokens)} tok</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{fmt.usdK(r.costUsd)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Table Section ─────────────────────────────────────────────── */}
      <div style={{ background: "var(--card)", borderRadius: 20, border: "1px solid var(--border)",
        boxShadow: "var(--card-shadow)", overflow: "hidden" }}>

        {/* Table Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0,
              display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={14} style={{ color: "var(--primary)" }} />
              Usage Log
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                background: "var(--accent)", color: "var(--muted-foreground)", marginLeft: 4 }}>
                {filtered.length} records
              </span>
            </h2>

            {/* Filters row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "var(--muted-foreground)", pointerEvents: "none" }} />
                <input
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search..."
                  style={{ paddingLeft: 30, paddingRight: 10, height: 34, borderRadius: 8, fontSize: 12,
                    border: "1px solid var(--border)", background: "var(--input)", color: "var(--foreground)",
                    width: 160, outline: "none" }}
                />
              </div>

              {/* Category filter */}
              <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
                style={{ height: 34, borderRadius: 8, fontSize: 12, padding: "0 10px",
                  border: "1px solid var(--border)", background: "var(--input)", color: "var(--foreground)", cursor: "pointer" }}>
                <option value="all">All Categories</option>
                {allCategories.map(c => <option key={c} value={c}>{CATEGORY_META[c]?.label ?? c}</option>)}
              </select>

              {/* API Type filter */}
              <select value={filterApiType} onChange={e => { setFilterApiType(e.target.value); setPage(1); }}
                style={{ height: 34, borderRadius: 8, fontSize: 12, padding: "0 10px",
                  border: "1px solid var(--border)", background: "var(--input)", color: "var(--foreground)", cursor: "pointer" }}>
                <option value="all">All Types</option>
                {allApiTypes.map(t => <option key={t} value={t}>{getApiMeta(t).label}</option>)}
              </select>

              {/* Status filter */}
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                {(["all", "success", "failed"] as const).map(s => (
                  <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                    style={{
                      padding: "0 12px", height: 34, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: filterStatus === s ? "var(--primary)" : "var(--input)",
                      color: filterStatus === s ? "var(--primary-foreground)" : "var(--muted-foreground)",
                      transition: "all 0.15s",
                    }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--accent)" }}>
                {[
                  { label: "API Type",     key: null },
                  { label: "Category",     key: null },
                  { label: "Model",        key: null },
                  { label: "In Tokens",    key: null },
                  { label: "Out Tokens",   key: null },
                  { label: "Total Tokens", key: "totalTokens" as SortKey },
                  { label: "Input Cost",   key: null },
                  { label: "Output Cost",  key: null },
                  { label: "Total Cost",   key: "totalCostUsd" as SortKey },
                  { label: "Latency",      key: "durationMs" as SortKey },
                  { label: "Status",       key: null },
                  { label: "Triggered",    key: "createdAt" as SortKey },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={key ? () => handleSort(key) : undefined}
                    style={{
                      padding: "10px 14px", textAlign: "left", fontWeight: 700,
                      color: "var(--muted-foreground)", fontSize: 10, textTransform: "uppercase",
                      letterSpacing: 1, whiteSpace: "nowrap",
                      cursor: key ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {label} {key && <SortIcon k={key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
                      <span>Loading expense data…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <BarChart3 size={32} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No records yet</p>
                      <p style={{ margin: 0, fontSize: 12 }}>AI usage logs will appear here after API calls</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && pageRows.map((row, i) => {
                const meta = getApiMeta(row.apiType);
                const Icon = meta.icon;
                const catColor = getCategoryColor(row.category);
                const isEven = i % 2 === 0;

                return (
                  <tr
                    key={row.id}
                    style={{
                      background: isEven ? "transparent" : "var(--accent)",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--input)")}
                    onMouseLeave={e => (e.currentTarget.style.background = isEven ? "transparent" : "var(--accent)")}
                  >
                    {/* API Type */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: meta.bg,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={13} style={{ color: meta.color }} />
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{meta.label}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 10,
                        fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
                        background: `${catColor}18`, color: catColor,
                      }}>
                        {CATEGORY_META[row.category]?.label ?? row.category}
                      </span>
                    </td>

                    {/* Model */}
                    <td style={{ padding: "10px 14px", color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 11 }}>
                      {row.model}
                    </td>

                    {/* In Tokens */}
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--muted-foreground)" }}>
                      {fmt.tokens(row.inputTokens)}
                    </td>

                    {/* Out Tokens */}
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--muted-foreground)" }}>
                      {fmt.tokens(row.outputTokens)}
                    </td>

                    {/* Total Tokens */}
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--foreground)" }}>
                      {fmt.tokens(row.totalTokens)}
                    </td>

                    {/* Input Cost */}
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 11 }}>
                      {fmt.usd(row.inputCostUsd)}
                    </td>

                    {/* Output Cost */}
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: 11 }}>
                      {fmt.usd(row.outputCostUsd)}
                    </td>

                    {/* Total Cost */}
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "monospace" }}>
                        {fmt.usd(row.totalCostUsd)}
                      </span>
                    </td>

                    {/* Latency */}
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{
                        fontWeight: 600, fontSize: 11,
                        color: row.durationMs > 5000 ? "#ef4444" : row.durationMs > 2000 ? "#f59e0b" : "#10b981",
                      }}>
                        {fmt.ms(row.durationMs)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "10px 14px" }}>
                      {row.success
                        ? <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981" }}>
                            <CheckCircle2 size={13} /><span style={{ fontWeight: 600 }}>OK</span>
                          </div>
                        : <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#ef4444" }}
                            title={row.errorMessage || ""}>
                            <XCircle size={13} /><span style={{ fontWeight: 600 }}>Error</span>
                          </div>
                      }
                    </td>

                    {/* Date */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--muted-foreground)" }}>
                      {fmt.date(row.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              Page {page} of {totalPages} · {filtered.length} records
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                    background: page === p ? "var(--primary)" : "var(--input)",
                    color: page === p ? "var(--primary-foreground)" : "var(--foreground)",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
