"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useReveal } from "@/components/landing/motion";

interface Plan {
  name: string;
  price: string;
  period?: string;
  blurb: string;
  features: string[];
  cta: { label: string; href?: string };
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb:
      "For quick local testing and webhook debugging. No credit card, no expiry.",
    features: [
      "1 concurrent tunnel",
      "5,000 requests per day",
      "10 GB bandwidth per month",
      "Random HTTPS subdomains",
      "Live HTTP inspector and webhook replay",
    ],
    cta: { label: "Get started free", href: "/signup" },
  },
  {
    name: "Developer",
    price: "Coming soon",
    blurb:
      "For active developers and freelance API integrators who need reserved names and history.",
    features: [
      "5 concurrent tunnels",
      "50,000 requests per day",
      "Reserved custom subdomains",
      "1-click webhook replaying",
      "30-day request inspection history",
    ],
    cta: { label: "Coming soon" },
  },
  {
    name: "Team",
    price: "Coming soon",
    blurb:
      "For engineering teams that need custom domains, shared workspaces and priority routing.",
    features: [
      "Unlimited tunnels",
      "500,000 requests per day",
      "Custom domain CNAME (tunnel.mycompany.com)",
      "Team workspace and RBAC",
    ],
    cta: { label: "Coming soon" },
  },
];

export function Pricing() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(1);
  useReveal(ref, "[data-rise]");

  const plan = PLANS[active];

  return (
    <section
      id="pricing"
      ref={ref}
      className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8"
    >
      <div className="grid gap-16 lg:grid-cols-12">
        <ul className="lg:col-span-6">
          {PLANS.map((p, i) => {
            const on = i === active;
            return (
              <li key={p.name}>
                <button
                  type="button"
                  data-rise
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-pressed={on}
                  className="flex items-center gap-4 py-2 text-left leading-[1.1]"
                  style={{
                    color: on ? "var(--ink)" : "var(--ink-muted)",
                    fontSize: "clamp(32px, 5vw, 64px)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: on ? "var(--brand)" : "transparent",
                    }}
                    aria-hidden
                  />
                  {p.name}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="lg:col-span-5 lg:col-start-8">
          <div data-rise>
            <div className="flex items-baseline gap-3">
              <span
                className="font-medium tracking-[-0.02em] text-[color:var(--ink)]"
                style={{
                  fontSize:
                    plan.price === "Coming soon"
                      ? "clamp(28px, 4vw, 48px)"
                      : "clamp(48px, 9vw, 112px)",
                }}
              >
                {plan.price}
              </span>
              {plan.period && (
                <span className="text-[18px] text-[color:var(--ink-muted)]">
                  {plan.period}
                </span>
              )}
            </div>

            <p
              className="mt-6 max-w-[48ch] text-[color:var(--ink-muted)]"
              style={{ fontSize: "var(--step-body)" }}
            >
              {plan.blurb}
            </p>

            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 text-[color:var(--ink)]"
                  style={{ fontSize: "var(--step-body)" }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--brand)" }}
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              {plan.cta.href ? (
                <Link
                  href={plan.cta.href}
                  className="inline-block rounded-md bg-[color:var(--brand)] px-6 py-3 text-[15px] font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97]"
                >
                  {plan.cta.label}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-block cursor-not-allowed rounded-md px-6 py-3 text-[15px] font-medium text-[color:var(--ink-muted)]"
                  style={{ backgroundColor: "var(--surface-3)" }}
                >
                  {plan.cta.label}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
