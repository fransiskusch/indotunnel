import {
  Globe,
  RefreshCcw,
  Zap,
  ShieldCheck,
  Code2,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { Stagger, StaggerItem } from "@/components/landing/reveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: Globe,
    title: "Instant Subdomains",
    body: "Get deterministic custom subdomains or random subdomains with HTTPS automatic SSL certificates.",
  },
  {
    icon: RefreshCcw,
    title: "Webhook Replaying",
    body: "Never trigger a Stripe or GitHub webhook twice. Replay saved requests with 1-click inside dashboard.",
  },
  {
    icon: Zap,
    title: "Ultra Low Latency",
    body: "Powered by Go & Redis gateway nodes in Southeast Asia for minimal round-trip latency.",
  },
  {
    icon: ShieldCheck,
    title: "Token Authorization",
    body: "Protect your public endpoints with HTTP Basic Auth, IP Whitelisting, or Bearer auth tokens.",
  },
  {
    icon: Code2,
    title: "Traffic Metrics & Logs",
    body: "Track request throughput, latency histograms, error rates, and bandwidth usage in real-time.",
  },
  {
    icon: Layers,
    title: "WebSocket Support",
    body: "Seamlessly stream WebSocket connections, SSE events, and HTTP/2 multiplexed connections.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-zinc-800/80 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Developer Ergonomics
          </h2>
          <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for High-Speed Engineering
          </h3>
          <p className="text-sm text-zinc-400">
            Everything you need to test webhooks, show work to clients, and build
            APIs.
          </p>
        </div>

        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const lead = index === 0;
            return (
              <StaggerItem
                key={feature.title}
                className={lead ? "lg:col-span-2" : undefined}
              >
                <div
                  className={`group h-full rounded-2xl border border-zinc-800 bg-slate-900/40 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-slate-900/60 ${
                    lead ? "p-8" : "p-6"
                  }`}
                >
                  <div className="space-y-3">
                    <div
                      className={`flex items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 ${
                        lead ? "h-12 w-12" : "h-9 w-9"
                      }`}
                    >
                      <Icon className={lead ? "h-6 w-6" : "h-5 w-5"} />
                    </div>
                    <h4
                      className={`font-semibold text-white ${
                        lead ? "text-xl" : "text-base"
                      }`}
                    >
                      {feature.title}
                    </h4>
                    <p
                      className={`leading-relaxed text-zinc-400 ${
                        lead ? "max-w-lg text-sm" : "text-xs"
                      }`}
                    >
                      {feature.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
