"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewScanPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/your-bot?tab=scan");
  }, [router]);

  return null;
}
