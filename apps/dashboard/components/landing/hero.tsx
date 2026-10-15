"use client";

import Link from "next/link";
import { useRef } from "react";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import { useReveal, useShutter, useDrift, gsap, useGSAP } from "@/components/landing/motion";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);

  useReveal(sectionRef, "[data-rise]");
  useShutter(stageRef);
  useDrift(driftRef, 40);

  // The signature move's companion: the headline rises from behind its own
  // baselines before the stage opens. Two lines, so it reads as one gesture.
  // GSAP owns the start state, so nothing can leave the headline hidden.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = gsap.utils.toArray<HTMLElement>("[data-line]", sectionRef.current ?? undefined);
        if (!lines.length) return;
        gsap.fromTo(
          lines,
          { yPercent: 105 },
          {
            yPercent: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.11,
            delay: 0.15,
            clearProps: "transform",
          },
        );
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto max-w-[1600px] px-5 pt-20 pb-24 sm:px-8 lg:pt-28"
    >
      <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="min-w-0 space-y-8 lg:col-span-7">
          <h1
            className="font-medium leading-[0.98] tracking-[-0.03em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-display)" }}
          >
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
              <span data-line className="block">
                Expose localhost
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
              <span data-line className="block">
                to the internet
              </span>
            </span>
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
            className="inline-block rounded-md bg-[color:var(--brand)] px-6 py-3 text-[16px] font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97]"
            style={{ transitionDuration: "var(--t-press)" }}
          >
            Start free
          </Link>
        </div>

        <div className="min-w-0 lg:col-span-5 lg:pt-2">
          <div ref={driftRef}>
            <div
              ref={stageRef}
              className="arch w-full max-w-full"
              style={{ backgroundColor: "var(--brand)" }}
            >
              <div className="px-5 pb-5 pt-14 sm:px-10 sm:pb-10 sm:pt-20">
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
      </div>
    </section>
  );
}
