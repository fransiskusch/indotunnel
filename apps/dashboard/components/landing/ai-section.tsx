import { RefreshCcw, Code2, Cpu } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/landing/reveal";

const CARDS = [
  {
    icon: RefreshCcw,
    title: "AI Webhook Debugger",
    body: "Claude reads captured HTTP headers and payloads, diagnoses failed callbacks (Stripe, GitHub, payment gateways), and returns the exact fix.",
  },
  {
    icon: Code2,
    title: "Traffic-to-OpenAPI",
    body: "Claude converts live captured traffic into OpenAPI specs plus instant mock responses — docs and mocks generated from real requests.",
  },
  {
    icon: Cpu,
    title: "AI Security Filter",
    body: "Claude classifies inbound tunnel requests and flags injection attempts and anomalous payloads before they reach your localhost.",
  },
];

export function AiSection() {
  return (
    <section
      id="ai"
      className="relative overflow-hidden border-t border-zinc-800/80 bg-slate-950/60 py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_50%_0%,rgba(16,185,129,0.12),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Built on Claude
          </h2>
          <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            AI-Powered Tunnel Intelligence
          </h3>
          <p className="text-sm text-zinc-400">
            Every captured request becomes context for debugging, documentation,
            and protection — powered by the Claude API.
          </p>
        </div>

        <Stagger className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <StaggerItem key={card.title}>
                <div className="h-full rounded-2xl border border-zinc-800 bg-slate-900/40 p-6 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-slate-900/60">
                  <div className="space-y-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-base font-semibold text-white">
                      {card.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      {card.body}
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
