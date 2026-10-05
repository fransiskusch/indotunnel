"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEvents } from "@/lib/sse";

// LiveRefresher re-renders server data when SSE events arrive (debounced).
export function LiveRefresher() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEvents(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 1000);
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return null;
}
