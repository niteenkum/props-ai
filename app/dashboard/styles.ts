import type React from "react";

export const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 20,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--input)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--foreground)",
  outline: "none",
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
