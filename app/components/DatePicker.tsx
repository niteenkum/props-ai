"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: string;            // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string;             // YYYY-MM-DD
  max?: string;             // YYYY-MM-DD
  placeholder?: string;
  style?: React.CSSProperties;
  label?: string;
  id?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseYMD(str: string): Date | null {
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDisplay(str: string): string {
  const d = parseYMD(str);
  if (!d) return "";
  return d.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DatePicker({
  value, onChange, min, max, placeholder = "Select date", style, id,
}: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = parseYMD(value);
  const minDate = min ? parseYMD(min) : null;
  const maxDate = max ? parseYMD(max) : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    selectedDate?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selectedDate?.getMonth() ?? today.getMonth()
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [yearInput, setYearInput] = useState(false);
  const [yearDraft, setYearDraft] = useState(String(viewYear));

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setYearInput(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Position popover
  useEffect(() => {
    if (!open || !popoverRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pop = popoverRef.current;
    const popH = 340;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < popH && rect.top > popH) {
      pop.style.bottom = `${rect.height + 6}px`;
      pop.style.top = "auto";
    } else {
      pop.style.top = `${rect.height + 6}px`;
      pop.style.bottom = "auto";
    }
  }, [open]);

  const goMonth = useCallback((delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }, [viewMonth, viewYear]);

  const isDisabled = useCallback((y: number, m: number, d: number): boolean => {
    const dt = new Date(y, m, d);
    if (minDate && dt < minDate) return true;
    if (maxDate && dt > maxDate) return true;
    return false;
  }, [minDate, maxDate]);

  const isToday = (y: number, m: number, d: number) => {
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
  };

  const isSelected = (y: number, m: number, d: number) => {
    return !!selectedDate && y === selectedDate.getFullYear() && m === selectedDate.getMonth() && d === selectedDate.getDate();
  };

  const selectDay = (y: number, m: number, d: number) => {
    if (isDisabled(y, m, d)) return;
    onChange(toYMD(new Date(y, m, d)));
    setOpen(false);
    setYearInput(false);
  };

  // Build calendar grid
  const firstDay = startOfMonth(viewYear, viewMonth).getDay(); // 0=Sun
  const totalDays = daysInMonth(viewYear, viewMonth);
  const prevDays = daysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  const cells: { day: number; month: number; year: number; cur: boolean }[] = [];
  // Prev month overflow
  for (let i = firstDay - 1; i >= 0; i--) {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: prevDays - i, month: pm, year: py, cur: false });
  }
  // Current month
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, cur: true });
  }
  // Next month overflow
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, month: nm, year: ny, cur: false });
  }

  const displayValue = formatDisplay(value);

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      {/* ─── Trigger Button ─── */}
      <button
        id={id}
        type="button"
        onClick={() => { setOpen(o => !o); setYearInput(false); }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          borderRadius: 12,
          border: open ? "1.5px solid #7c3aed" : "1.5px solid #e2e8f0",
          background: open ? "linear-gradient(135deg, #faf5ff, #f5f3ff)" : "#fff",
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: open ? "0 0 0 3px rgba(124,58,237,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        {/* Calendar icon */}
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: displayValue ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "linear-gradient(135deg, #e2e8f0, #f1f5f9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={displayValue ? "#fff" : "#94a3b8"} strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="16" y1="2" x2="16" y2="6" />
          </svg>
        </span>
        {/* Text */}
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: displayValue ? 600 : 400,
          color: displayValue ? "#1e1b4b" : "#94a3b8",
          letterSpacing: "-0.01em",
        }}>
          {displayValue || placeholder}
        </span>
        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ─── Popover Calendar ─── */}
      {open && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            left: 0,
            zIndex: 9999,
            width: 300,
            background: "#fff",
            borderRadius: 18,
            border: "1.5px solid rgba(124,58,237,0.15)",
            boxShadow: "0 24px 60px rgba(124,58,237,0.15), 0 4px 16px rgba(0,0,0,0.08)",
            overflow: "hidden",
            animation: "dpFadeIn 0.15s ease",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            padding: "14px 16px 10px",
          }}>
            {/* Month / Year row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button
                onClick={() => goMonth(-1)}
                style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* Month */}
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                  {MONTHS[viewMonth]}
                </span>
                {/* Year — click to edit */}
                {yearInput ? (
                  <input
                    autoFocus
                    type="number"
                    value={yearDraft}
                    onChange={e => setYearDraft(e.target.value)}
                    onBlur={() => {
                      const y = parseInt(yearDraft, 10);
                      if (!isNaN(y) && y >= 1900 && y <= 2100) setViewYear(y);
                      setYearInput(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const y = parseInt(yearDraft, 10);
                        if (!isNaN(y) && y >= 1900 && y <= 2100) setViewYear(y);
                        setYearInput(false);
                      }
                      if (e.key === "Escape") setYearInput(false);
                    }}
                    style={{
                      width: 62, fontSize: 13, fontWeight: 700, color: "#fff",
                      background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 6, padding: "3px 6px", outline: "none", textAlign: "center",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => { setYearDraft(String(viewYear)); setYearInput(true); }}
                    style={{
                      background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 6,
                      padding: "3px 8px", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff",
                    }}
                  >
                    {viewYear}
                  </button>
                )}
              </div>

              <button
                onClick={() => goMonth(1)}
                style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            {/* Day labels */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", paddingBottom: 4 }}>
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* ── Grid ── */}
          <div style={{ padding: "10px 12px 14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {cells.map((cell, i) => {
                const selected = isSelected(cell.year, cell.month, cell.day);
                const disabled = isDisabled(cell.year, cell.month, cell.day);
                const todayCell = isToday(cell.year, cell.month, cell.day);
                const isHovered = hovered === i;

                let bg = "transparent";
                let color = cell.cur ? "#1e1b4b" : "#cbd5e1";
                let fontWeight = 400;
                let boxShadow = "none";

                if (selected) {
                  bg = "linear-gradient(135deg, #7c3aed, #6d28d9)";
                  color = "#fff";
                  fontWeight = 700;
                  boxShadow = "0 2px 8px rgba(124,58,237,0.4)";
                } else if (todayCell && cell.cur) {
                  bg = "rgba(124,58,237,0.08)";
                  color = "#7c3aed";
                  fontWeight = 700;
                } else if (isHovered && !disabled && cell.cur) {
                  bg = "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(109,40,217,0.08))";
                  color = "#7c3aed";
                  fontWeight = 600;
                }

                return (
                  <button
                    key={i}
                    onClick={() => selectDay(cell.year, cell.month, cell.day)}
                    onMouseEnter={() => !disabled && setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    disabled={disabled}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: 8,
                      border: todayCell && !selected && cell.cur ? "1.5px solid rgba(124,58,237,0.25)" : "1.5px solid transparent",
                      background: bg,
                      color,
                      fontWeight,
                      fontSize: 12.5,
                      fontFamily: "inherit",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.3 : 1,
                      transition: "all 0.12s ease",
                      boxShadow,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Today shortcut */}
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <button
                onClick={() => {
                  const t = new Date();
                  if (!minDate || t >= minDate) {
                    onChange(toYMD(t));
                    setViewYear(t.getFullYear());
                    setViewMonth(t.getMonth());
                    setOpen(false);
                  }
                }}
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(109,40,217,0.05))",
                  border: "1px solid rgba(124,58,237,0.15)",
                  borderRadius: 8, padding: "6px 16px", cursor: "pointer",
                  fontSize: 11.5, fontWeight: 700, color: "#7c3aed",
                  letterSpacing: "-0.01em", fontFamily: "inherit",
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animation ── */}
      <style>{`
        @keyframes dpFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
