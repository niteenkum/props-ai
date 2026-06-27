"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuthStatus = "PENDING" | "ACTIVE" | "INACTIVE";

interface UseAuthOptions {
  /** If set, redirects when user doesn't match this status. */
  requiredStatus?: AuthStatus;
}

interface UseAuthReturn {
  userEmail: string;
  userName: string;
  userRole: string;
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
  const [userRole, setUserRole] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("proposalizer_auth_token");
    const email = localStorage.getItem("proposalizer_user_email") || "";
    const status = localStorage.getItem("proposalizer_user_status") || "";
    const name = localStorage.getItem("proposalizer_user_name") || "";
    const role = localStorage.getItem("proposalizer_user_role") || "Developer";

    if (!token) {
      router.replace("/login");
      return;
    }

    // Call server action to check account status dynamically from database
    import("../actions/auth-actions").then(({ checkAccountStatusAction }) => {
      checkAccountStatusAction(email).then((res) => {
        if (res.status === "INACTIVE" || !res.status) {
          // Deactivated user -> Force logout!
          localStorage.removeItem("proposalizer_auth_token");
          localStorage.removeItem("proposalizer_user_email");
          localStorage.removeItem("proposalizer_user_status");
          localStorage.removeItem("proposalizer_user_name");
          localStorage.removeItem("proposalizer_user_role");
          document.cookie = "thepitchly-session=; path=/; max-age=0; SameSite=Lax";
          router.replace("/login");
        } else {
          // Sync state if it changed in database
          if (res.status !== status) {
            localStorage.setItem("proposalizer_user_status", res.status);
            const sessionData = { email, status: res.status };
            document.cookie = `thepitchly-session=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=86400; SameSite=Lax`;
          }

          if (requiredStatus === "ACTIVE" && res.status !== "ACTIVE") {
            router.replace("/pending");
            return;
          }

          if (requiredStatus === "PENDING" && res.status === "ACTIVE") {
            router.replace("/dashboard");
            return;
          }

          setUserEmail(email);
          setUserName(name);
          setUserRole(role);
          setIsReady(true);
        }
      });
    }).catch(() => {
      // Fallback if import or check fails
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
      setUserRole(role);
      setIsReady(true);
    });
  }, [router, requiredStatus]);

  const logout = () => {
    localStorage.removeItem("proposalizer_auth_token");
    localStorage.removeItem("proposalizer_user_email");
    localStorage.removeItem("proposalizer_user_status");
    localStorage.removeItem("proposalizer_user_name");
    localStorage.removeItem("proposalizer_user_role");
    // Clear middleware cookie too
    document.cookie = "thepitchly-session=; path=/; max-age=0; SameSite=Lax";
    router.push("/");
  };

  return { userEmail, userName, userRole, isReady, logout };
}
