"use client";

import Link from "next/link";
import { useRef } from "react";
import { Arch } from "@/components/landing/arch";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import { useReveal, useShutter } from "@/components/landing/motion";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useReveal(sectionRef, "[data-rise]");
  useShutter(stageRef);

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto max-w-[1600px] px-5 pt-20 pb-24 sm:px-8 lg:pt-28"
    >
      <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="space-y-8 lg:col-span-7">
          <h1
            data-rise
            className="text-balance font-medium leading-[0.98] tracking-[-0.03em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-display)" }}
          >
            Expose localhost to the internet
          </h1>

          <p
            data-rise
            className="max-w-[40ch] text-[color:var(--ink-muted)]"
            style={{ fontSize: "var(--step-body)" }}
          >
            Instant public URLs, live HTTP inspection and webhook replay for
            local servers. One command, no configuration.
          </p>

          <Link
            data-rise
            href="/signup"
            className="inline-block rounded-md bg-[color:var(--brand)] px-6 py-3 text-[15px] font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97]"
            style={{ transitionDuration: "var(--t-press)" }}
          >
            Start free
          </Link>
        </div>

        <div className="lg:col-span-5 lg:pt-2">
          <div
            ref={stageRef}
            className="arch w-full"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <div className="px-6 pb-6 pt-16 sm:px-10 sm:pb-10 sm:pt-20">
              <div
                className="w-full overflow-hidden rounded-md"
                style={{ backgroundColor: "var(--surface-2)" }}
              >
                <TerminalDemo />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
