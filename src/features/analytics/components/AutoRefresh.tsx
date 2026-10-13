"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the current page's server components on an interval.
// Simple polling; swap for Supabase Realtime later if needed.
export default function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
