"use client";

import { useRef } from "react";
import { useReveal } from "@/components/landing/motion";

/**
 * Reveals the [data-rise] elements inside a server-rendered page once, in
 * reading order. Without JS, or under reduced motion, everything is visible.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref, "[data-rise]");
  return (
    <div ref={ref} className="space-y-10">
      {children}
    </div>
  );
}
