"use client";

/**
 * Settings page — redirects to the unified /dashboard/profile page (Integrations tab).
 * All settings have been merged into the Candidate Profile page.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/profile");
  }, [router]);

  return null;
}
