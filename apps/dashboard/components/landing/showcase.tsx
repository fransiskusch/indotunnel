"use client";

import { useRef, useState } from "react";
import { useReveal } from "@/components/landing/motion";

interface RequestRow {
  method: "GET" | "POST";
  path: string;
  status: number;
  duration: string;
  fact: string;
  payload: string;
}

const ROWS: RequestRow[] = [
  {
    method: "POST",
    path: "/api/webhooks/stripe",
    status: 200,
    duration: "18ms",
    fact: "Stripe signature verified, 128 bytes forwarded.",
    payload: `{
  "event": "payment_intent.succeeded",
  "amount": 4900,
  "currency": "usd"
}`,
  },
  {
    method: "GET",
    path: "/healthz",
    status: 200,
    duration: "4ms",
    fact: "Health probe answered by the local server.",
    payload: `{
  "status": "ok",
  "uptime": 84213
}`,
  },
  {
    method: "POST",
    path: "/api/auth/callback",
    status: 201,
    duration: "32ms",
    fact: "OAuth callback created a new session.",
    payload: `{
  "provider": "github",
  "session": "sess_9f2a1c"
}`,
  },
  {
    method: "POST",
    path: "/webhooks/github",
    status: 200,
    duration: "11ms",
    fact: "Push event delivered to the local handler.",
    payload: `{
  "event": "push",
  "branch": "main"
}`,
  },
];

export function Showcase() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useReveal(ref, "[data-rise]");

  const row = ROWS[active];

  return (
    <section
      id="showcase"
      ref={ref}
      className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8"
    >
      <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <h2
            data-rise
            className="mb-8 font-medium leading-[1.0] tracking-[-0.02em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-head)" }}
          >
            Inspect every request
          </h2>

          <ul className="space-y-1" role="radiogroup" aria-label="Request">
            {ROWS.map((r, i) => {
              const on = i === active;
              return (
                <li key={r.path}>
                  <button
                    type="button"
                    data-rise
                    role="radio"
                    aria-checked={on}
                    onClick={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="flex w-full items-center gap-3 py-2 text-left"
                    style={{
                      color: on ? "var(--ink)" : "var(--ink-muted)",
                      fontSize: "var(--step-lead)",
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: on ? "var(--brand)" : "transparent",
                      }}
                      aria-hidden
                    />
                    <span className="font-medium">{r.method}</span>
                    <span>{r.path}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:col-span-7">
          <div
            className="arch w-full"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <div className="px-6 pb-6 pt-16 sm:px-10 sm:pb-10 sm:pt-20">
              <div
                data-ui
                className="rounded-md p-5"
                style={{ backgroundColor: "var(--surface-3)" }}
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[color:var(--ink)]">
                    {row.method} {row.path}
                  </span>
                  <span style={{ color: "var(--brand)" }}>
                    {row.status} {row.duration}
                  </span>
                </div>
                <pre
                  className="mt-4 overflow-x-auto rounded-md p-3 text-[13px] text-[color:var(--ink)]"
                  style={{ backgroundColor: "var(--bg)" }}
                >
                  {row.payload}
                </pre>
                <p className="mt-4 text-[16px] text-[color:var(--ink-muted)]">
                  {row.fact}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
