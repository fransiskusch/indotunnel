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
      className="relative mx-auto max-w-[1600px] px-5 pt-24 pb-32 sm:px-8 lg:pt-32"
    >
      <div className="grid gap-16 lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="space-y-8 lg:col-span-6">
          <h1
            data-rise
            className="text-balance font-medium leading-[0.95] tracking-[-0.03em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-display)" }}
          >
            Expose localhost
            <br />
            to the internet
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

        <div className="lg:col-span-6 lg:pt-2">
          <div
            ref={stageRef}
            className="arch w-full"
            style={{ backgroundColor: "var(--brand)" }}
          >
            <div className="p-6 sm:p-10">
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
