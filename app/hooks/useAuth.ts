"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthStatus = "PENDING" | "ACTIVE";

interface UseAuthOptions {
  /** If set, redirects when user doesn't match this status. */
  requiredStatus?: AuthStatus;
}

interface UseAuthReturn {
  userEmail: string;
  userName: string;
  /** True once auth check is done and user is allowed on this page. */
  isReady: boolean;
  logout: () => void;
}

/**
 * Guards a page behind authentication.
 *
 * - No token → redirects to /login
 * - requiredStatus "ACTIVE" and user is PENDING → redirects to /pending
 * - requiredStatus "PENDING" and user is ACTIVE → redirects to /dashboard
 */
export function useAuth({ requiredStatus }: UseAuthOptions = {}): UseAuthReturn {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("proposalizer_auth_token");
    const email = localStorage.getItem("proposalizer_user_email") || "";
    const status = localStorage.getItem("proposalizer_user_status") as AuthStatus | null;
    const name = localStorage.getItem("proposalizer_user_name") || "";

    if (!token) {
      router.replace("/login");
      return;
    }

    if (requiredStatus === "ACTIVE" && status !== "ACTIVE") {
      router.replace("/pending");
      return;
    }

    if (requiredStatus === "PENDING" && status === "ACTIVE") {
      router.replace("/dashboard");
      return;
    }

    setUserEmail(email);
    setUserName(name);
    setIsReady(true);
  }, [router, requiredStatus]);

  const logout = () => {
    localStorage.removeItem("proposalizer_auth_token");
    localStorage.removeItem("proposalizer_user_email");
    localStorage.removeItem("proposalizer_user_status");
    localStorage.removeItem("proposalizer_user_name");
    // Clear middleware cookie too
    document.cookie = "thepitchly-session=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  };

  return { userEmail, userName, isReady, logout };
}
