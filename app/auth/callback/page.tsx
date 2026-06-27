"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLoginSuccess } from "../../hooks/useLoginSuccess";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const { handleLoginSuccess } = useLoginSuccess();

  useEffect(() => {
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const status = searchParams.get("status") as "ACTIVE" | "PENDING" | "INACTIVE";
    const role = searchParams.get("role") || "Developer";

    if (email && name && status) {
      const isNew = searchParams.get("isNew") === "true";
      handleLoginSuccess(email, status, name, role, isNew ? "/dashboard/profile" : undefined);
    }
  }, [searchParams, handleLoginSuccess]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "var(--background)",
      gap: 16, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Loader2 style={{ width: 36, height: 36, color: "#6366f1", animation: "spin 1s linear infinite" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>
        Setting up your workspace...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
