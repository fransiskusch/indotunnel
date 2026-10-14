"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Check, Copy, Sparkles } from "lucide-react";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import { Reveal } from "@/components/landing/reveal";

const TRUST = ["Free to start", "No credit card", "Gateways in Indonesia"];

export function Hero() {
  const [copied, setCopied] = useState(false);
  const { scrollY } = useScroll();
  const gridY = useTransform(scrollY, [0, 600], [0, 80]);
  const demoY = useTransform(scrollY, [0, 600], [0, -40]);

  function copyInstall() {
    navigator.clipboard.writeText("npx indotunnel 3000");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="relative mx-auto max-w-6xl overflow-hidden px-4 pt-16 pb-20 sm:px-6 lg:pt-24">
      <motion.div
        style={{ y: gridY }}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.16),transparent_70%)]"
      />

      <div className="relative">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 font-mono text-xs font-medium text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sparkles className="h-3.5 w-3.5" />
              High-Performance Reverse Proxy &amp; Localhost Gateway
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="text-balance text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Expose localhost to the internet{" "}
              <span className="font-extrabold text-emerald-400">
                in seconds.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Instant public URLs, live HTTP request inspection, webhook
              replaying, and custom subdomains built for developer velocity.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={copyInstall}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 px-4 py-2.5 font-mono text-sm text-zinc-300 shadow-inner transition-colors hover:border-emerald-500/40 sm:w-auto"
              >
                <span className="flex items-center gap-2">
                  <span className="text-zinc-500">$</span>
                  <span className="font-semibold text-emerald-400">
                    npx indotunnel 3000
                  </span>
                </span>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-emerald-400" />
                )}
              </button>
              <Link
                href="/signup"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 font-mono text-xs text-zinc-500">
              {TRUST.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.4} className="mx-auto mt-14 max-w-4xl">
          <motion.div style={{ y: demoY }}>
            <TerminalDemo />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
