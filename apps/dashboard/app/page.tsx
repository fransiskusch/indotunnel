import Link from "next/link";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import {
  Terminal,
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
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Terminal className="h-5 w-5" />
            </div>
            <span className="font-mono text-lg font-bold tracking-tight text-white flex items-center gap-2">
              IndoTunnel
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#quickstart" className="hover:text-white transition-colors">
              Quickstart
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
            >
              Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:pt-24">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-medium text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sparkles className="h-3.5 w-3.5" />
              High-Performance Reverse Proxy & Localhost Gateway
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
              Expose localhost to the internet{" "}
              <span className="text-emerald-400 font-extrabold">
                in seconds.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Instant public URLs, live HTTP request inspection, webhook replaying, and custom subdomains built for developer velocity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-4 py-2.5 font-mono text-sm text-zinc-300 w-full sm:w-auto justify-between shadow-inner">
                <span className="text-zinc-500">$</span>
                <span className="text-emerald-400 font-semibold">indotunnel http 8080</span>
              </div>
              <Link
                href="/signup"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Interactive Terminal Demo */}
          <div className="mt-14 max-w-4xl mx-auto">
            <TerminalDemo />
          </div>
        </section>

        {/* 3-STEP QUICKSTART SECTION */}
        <section id="quickstart" className="border-t border-zinc-800/80 bg-slate-950/60 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400">
                Workflow
              </h2>
              <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                3 Steps to Public Localhost
              </h3>
              <p className="text-zinc-400 text-sm">
                No complex SSH configs or router port-forwarding required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative rounded-2xl border border-zinc-800 bg-slate-900/40 p-6 space-y-4 hover:border-emerald-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                  01
                </div>
                <h4 className="text-lg font-semibold text-white">Install CLI</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Download IndoTunnel CLI binary for macOS, Linux, or Windows with one command.
                </p>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 font-mono text-xs text-zinc-300">
                  <span className="text-emerald-400">npm</span> i -g indotunnel-cli
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-2xl border border-zinc-800 bg-slate-900/40 p-6 space-y-4 hover:border-cyan-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold">
                  02
                </div>
                <h4 className="text-lg font-semibold text-white">Start Tunnel</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Specify your local server port to get a secure SSL endpoint immediately.
                </p>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 font-mono text-xs text-zinc-300">
                  <span className="text-cyan-400">indotunnel</span> http 3000
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-2xl border border-zinc-800 bg-slate-900/40 p-6 space-y-4 hover:border-purple-500/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-bold">
                  03
                </div>
                <h4 className="text-lg font-semibold text-white">Inspect & Replay</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Open the web dashboard to inspect headers, payloads, and replay webhooks.
                </p>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 font-mono text-xs text-zinc-300">
                  Dashboard ➔ <span className="text-purple-400">localhost:4040</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SHOWCASE */}
        <section id="features" className="py-20 border-t border-zinc-800/80">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
                Developer Ergonomics
              </h2>
              <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Built for High-Speed Engineering
              </h3>
              <p className="text-zinc-400 text-sm">
                Everything you need to test webhooks, show work to clients, and build APIs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:bg-slate-900/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Instant Subdomains</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Get deterministic custom subdomains or random subdomains with HTTPS automatic SSL certificates.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:bg-slate-900/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <RefreshCcw className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Webhook Replaying</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Never trigger a Stripe or GitHub webhook twice. Replay saved requests with 1-click inside dashboard.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:bg-slate-900/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Zap className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Ultra Low Latency</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Powered by Go & Redis gateway nodes in Southeast Asia for minimal round-trip latency.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:bg-slate-900/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Token Authorization</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Protect your public endpoints with HTTP Basic Auth, IP Whitelisting, or Bearer auth tokens.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:bg-slate-900/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Code2 className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">Traffic Metrics & Logs</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Track request throughput, latency histograms, error rates, and bandwidth usage in real-time.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-slate-900/40 p-6 space-y-3 hover:bg-slate-900/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-white">WebSocket Support</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Seamlessly stream WebSocket connections, SSE events, and HTTP/2 multiplexed connections.
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
                    <span className="text-xs text-zinc-400">/ until I don&apos;t know</span>
                  </div>
                  <p className="text-xs text-zinc-400">Perfect for quick local testing and basic webhooks.</p>
                  <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      1 Concurrent Tunnel
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      1,000 Requests / day
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      Random HTTP subdomains
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      HTTP Request Inspector (1 hour log history)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      No credit card, no expiry, no catch
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
        <footer className="border-t border-zinc-800/80 bg-slate-950 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="text-zinc-200">IndoTunnel Gateways Operational</span>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              © {new Date().getFullYear()} IndoTunnel Inc. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
