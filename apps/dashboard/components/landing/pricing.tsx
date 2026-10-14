import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/landing/reveal";

interface Tier {
  name: string;
  badge: string;
  badgeClass: string;
  price: string;
  priceNote?: string;
  blurb: string;
  features: string[];
  checkClass: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    badge: "No Expiry",
    badgeClass:
      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    price: "$0",
    priceNote: "/ forever free",
    blurb: "Perfect for quick local testing and webhook debugging.",
    checkClass: "text-emerald-400",
    features: [
      "1 Concurrent Tunnel",
      "5,000 Requests / day",
      "10 GB Bandwidth / month",
      "Random HTTPS subdomains",
      "Live HTTP Inspector & Webhook Replay",
      "No credit card required",
    ],
  },
  {
    name: "Developer",
    badge: "Pro Dev",
    badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    price: "Coming Soon",
    blurb: "For active developers & freelance API integrators.",
    checkClass: "text-emerald-400",
    featured: true,
    features: [
      "5 Concurrent Tunnels",
      "50,000 Requests / day",
      "Reserved Custom Subdomains",
      "1-Click Webhook Replaying",
      "30-Day Request Inspection History",
    ],
  },
  {
    name: "Team",
    badge: "Organization",
    badgeClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    price: "Coming Soon",
    blurb:
      "For engineering teams, custom CNAME domains & priority gateway.",
    checkClass: "text-cyan-400",
    features: [
      "Unlimited Tunnels",
      "500,000 Requests / day",
      "Custom Domain CNAME (`tunnel.mycompany.com`)",
      "Team Workspace & RBAC",
    ],
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="border-t border-zinc-800/80 bg-slate-950/60 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-2xl space-y-3 text-center">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Transparent Plans
          </h2>
          <h3 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Simple &amp; Predictable Pricing
          </h3>
          <p className="text-sm text-zinc-400">
            Free while we build. Paid tiers are coming, no launch date yet.
          </p>
        </div>

        <Stagger className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3">
          {TIERS.map((tier) => (
            <StaggerItem key={tier.name} className="h-full">
              <div
                className={`relative flex h-full flex-col justify-between space-y-8 rounded-2xl p-7 ${
                  tier.featured
                    ? "border-2 border-emerald-500/80 bg-slate-900/80 glow-emerald"
                    : "border border-zinc-800 bg-slate-900/40"
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-black">
                    Coming Soon
                  </div>
                )}

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-white">
                      {tier.name}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-xs ${tier.badgeClass}`}
                    >
                      {tier.badge}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`font-extrabold tracking-tight ${
                        tier.price === "Coming Soon"
                          ? "text-2xl text-zinc-500"
                          : "text-4xl text-white"
                      }`}
                    >
                      {tier.price}
                    </span>
                    {tier.priceNote && (
                      <span className="text-xs text-zinc-400">
                        {tier.priceNote}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-400">
                    {tier.blurb}
                  </p>

                  <ul className="space-y-3 border-t border-zinc-800 pt-5 text-xs text-zinc-300">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${tier.checkClass}`}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {tier.name === "Free" ? (
                  <Link
                    href="/signup"
                    className="w-full rounded-lg bg-emerald-500 py-2.5 text-center text-xs font-bold text-black transition-colors hover:bg-emerald-400"
                  >
                    Get Started Free
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-lg bg-zinc-800/80 py-2.5 text-center text-xs font-semibold text-zinc-500"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
