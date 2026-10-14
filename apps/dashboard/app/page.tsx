import Link from "next/link";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Hero } from "@/components/landing/hero";
import { Quickstart } from "@/components/landing/quickstart";
import { Features } from "@/components/landing/features";
import {
  Zap,
  Globe,
  ShieldCheck,
  RefreshCcw,
  Cpu,
  ArrowRight,
  CheckCircle2,
  Code2,
  Layers,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background Decorative Grid */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Header / Navbar */}
      <SiteHeader />

      {/* Main Container */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <Hero />

        {/* 3-STEP QUICKSTART SECTION */}
        <Quickstart />

        {/* FEATURES SHOWCASE */}
        <Features />

        {/* AI SECTION */}
        <section id="ai" className="py-20 border-t border-zinc-800/80 bg-slate-950/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400">
                Built on Claude
              </h2>
              <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                AI-Powered Tunnel Intelligence
              </h3>
              <p className="text-zinc-400 text-sm">
                Every captured request becomes context for debugging, documentation, and protection — powered by the Claude API.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:border-emerald-500/40 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <RefreshCcw className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">AI Webhook Debugger</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Claude reads captured HTTP headers and payloads, diagnoses failed callbacks (Stripe, GitHub, payment gateways), and returns the exact fix.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:border-cyan-500/40 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <Code2 className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Traffic-to-OpenAPI</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Claude converts live captured traffic into OpenAPI specs plus instant mock responses — docs and mocks generated from real requests.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:border-purple-500/40 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Cpu className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">AI Security Filter</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Claude classifies inbound tunnel requests and flags injection attempts and anomalous payloads before they reach your localhost.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-20 border-t border-zinc-800/80 bg-slate-950/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400">
                Transparent Plans
              </h2>
              <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Simple & Predictable Pricing
              </h3>
              <p className="text-zinc-400 text-sm">
                Free while we build. Paid tiers are coming, no launch date yet.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* Free Plan */}
              <div className="rounded-2xl border border-zinc-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-white">Free</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">No Expiry</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-zinc-400">/ forever free</span>
                  </div>
                  <p className="text-xs text-zinc-400">Perfect for quick local testing and webhook debugging.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      1 Concurrent Tunnel
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      5,000 Requests / day
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      10 GB Bandwidth / month
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      Random HTTPS subdomains
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      Live HTTP Inspector & Webhook Replay
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      No credit card required
                    </li>
                  </ul>
                </div>
                <Link
                  href="/signup"
                  className="w-full text-center py-2.5 rounded-lg border border-zinc-700 bg-zinc-800/80 text-white font-semibold text-xs hover:bg-zinc-700 transition-colors"
                >
                  Get Started Free
                </Link>
              </div>

              {/* Developer Plan (Featured) */}
              <div className="relative rounded-2xl border-2 border-emerald-500/80 bg-slate-900/80 p-6 flex flex-col justify-between space-y-6 glow-emerald">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black font-mono text-[10px] font-extrabold tracking-wider uppercase px-3 py-0.5 rounded-full">
                  Coming Soon
                </div>
                <div className="space-y-4 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-white">Developer</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Pro Dev</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-zinc-500">Coming Soon</span>
                  </div>
                  <p className="text-xs text-zinc-400">For active developers & freelance API integrators.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-200 pt-2 border-t border-zinc-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      5 Concurrent Tunnels
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      50,000 Requests / day
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      Reserved Custom Subdomains
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      1-Click Webhook Replaying
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      30-Day Request Inspection History
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full text-center py-2.5 rounded-lg bg-zinc-800/80 text-zinc-500 font-semibold text-xs cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>

              {/* Team Plan */}
              <div className="rounded-2xl border border-zinc-800 bg-slate-900/40 p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-white">Team</span>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">Organization</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-zinc-500">Coming Soon</span>
                  </div>
                  <p className="text-xs text-zinc-400">For engineering teams, custom CNAME domains & priority gateway.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                      Unlimited Tunnels
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                      500,000 Requests / day
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                      Custom Domain CNAME (`tunnel.mycompany.com`)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                      Team Workspace & RBAC
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full text-center py-2.5 rounded-lg bg-zinc-800/80 text-zinc-500 font-semibold text-xs cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <SiteFooter />
      </main>
    </div>
  );
}
