"use client";

import { useRouter } from "next/navigation";

type AuthStatus = "PENDING" | "ACTIVE";

export function useLoginSuccess() {
  const router = useRouter();

  const handleLoginSuccess = (email: string, status: AuthStatus, name: string, role?: string, redirectTo?: string) => {
    // ── 1. localStorage (for useAuth hook) ──────────────────────────────────
    localStorage.setItem("proposalizer_auth_token", "demo-token-active-session");
    localStorage.setItem("proposalizer_user_email", email);
    localStorage.setItem("proposalizer_user_status", status);
    localStorage.setItem("proposalizer_user_name", name);
    localStorage.setItem("proposalizer_user_role", role || "Developer");

    // ── 2. Cookie (for middleware route protection) ─────────────────────────
    const payload = JSON.stringify({ email, status, name, role: role || "Developer" });
    const maxAge  = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `thepitchly-session=${encodeURIComponent(payload)}; path=/; max-age=${maxAge}; SameSite=Lax`;

    // ── 3. Navigate ─────────────────────────────────────────────────────────
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push(status === "ACTIVE" ? "/dashboard" : "/pending");
    }
  };

  return { handleLoginSuccess };
}
