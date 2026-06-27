import type React from "react";

export const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "2.5px solid var(--foreground)",
  borderRadius: 12,
  boxShadow: "6px 6px 0px 0px var(--foreground)",
  padding: 20,
  transition: "all 0.2s ease",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--input)",
  border: "2.5px solid var(--foreground)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--foreground)",
  outline: "none",
  boxShadow: "3px 3px 0px 0px var(--foreground)",
  transition: "all 0.2s ease",
};

export const labelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase" as const,
  fontWeight: 700,
  color: "var(--muted-foreground)",
  opacity: 0.8,
  letterSpacing: 1.2,
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--foreground)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  paddingBottom: 12,
  borderBottom: "1px solid var(--border)",
};
