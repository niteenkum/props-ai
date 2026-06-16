"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /dashboard root — redirects to PropBot AI page by default.
 * The full Outreach Workspace has been moved to /dashboard/workspace.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}

function Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/your-bot");
  }, [router]);
  return null;
}
