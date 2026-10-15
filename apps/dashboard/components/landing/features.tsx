"use client";

import { useRef } from "react";
import { useReveal } from "@/components/landing/motion";

interface Tile {
  span: string;
  name?: string;
  line?: string;
  ui?: React.ReactNode;
}

const CAP = "text-[color:var(--ink)]";
const MUTED = "text-[color:var(--ink-muted)]";

export function Features() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref, "[data-rise]");

  const tiles: Tile[] = [
    {
      span: "lg:col-span-4 lg:row-span-2",
      ui: (
        <div data-ui className="flex h-full flex-col justify-center gap-4 p-6">
          <span
            className="text-3xl font-medium"
            style={{ color: "var(--brand)" }}
          >
            Online
          </span>
          <span className="text-[15px] text-[color:var(--ink-muted)]">
            Tunnel live at id-cgk.gateway.indotunnel.id
          </span>
        </div>
      ),
      name: "Instant subdomains",
      line: "Deterministic or random subdomains with automatic HTTPS.",
    },
    {
      span: "lg:col-span-2",
      ui: (
        <div data-ui className="flex items-center justify-between p-6">
          <span className="text-[15px] text-[color:var(--ink)]">Replay</span>
          <span
            className="rounded-md px-3 py-1 text-[13px] font-medium"
            style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}
          >
            1-click
          </span>
        </div>
      ),
      name: "Webhook replaying",
      line: "Re-send saved requests from the dashboard.",
    },
    {
      span: "lg:col-span-2",
      ui: (
        <div className="flex h-full items-center justify-center gap-1 p-6">
          {["G", "o", "R", "e"].map((c, i) => (
            <span
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-md text-[18px] font-medium"
              style={{
                backgroundColor: "var(--surface-3)",
                color: "var(--ink)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      ),
      name: "Ultra low latency",
      line: "Go and Redis gateways in Southeast Asia.",
    },
    {
      span: "lg:col-span-2",
      ui: (
        <div data-ui className="p-6">
          <div className="flex items-center gap-3">
            <span
              className="relative h-6 w-11 rounded-full"
              style={{ backgroundColor: "var(--brand)" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full"
                style={{ left: "22px", backgroundColor: "var(--brand-ink)" }}
              />
            </span>
            <span className="text-[15px] text-[color:var(--ink)]">Bearer</span>
          </div>
        </div>
      ),
      name: "Token authorization",
      line: "Basic auth, bearer tokens or IP allowlists.",
    },
    {
      span: "lg:col-span-2",
      ui: (
        <div data-ui className="p-6">
          <span className="text-4xl font-medium text-[color:var(--ink)]">
            5,000
          </span>
          <span className="ml-2 text-[15px] text-[color:var(--ink-muted)]">
            req / day
          </span>
        </div>
      ),
      name: "Traffic metrics",
      line: "Throughput, latency and error rates in real time.",
    },
    {
      span: "lg:col-span-4",
      ui: (
        <div className="flex h-full flex-col justify-center p-6">
          <h2
            className="font-medium leading-[1.05] tracking-[-0.02em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-head)" }}
          >
            Built for speed
          </h2>
        </div>
      ),
    },
    {
      span: "lg:col-span-4",
      ui: (
        <div className="p-6">
          <div className="flex items-center gap-3 text-[15px]">
            <span className="text-[color:var(--ink)]">WebSocket</span>
            <span className="text-[color:var(--ink-muted)]">SSE</span>
            <span className="text-[color:var(--ink-muted)]">HTTP/2</span>
          </div>
        </div>
      ),
      name: "WebSocket support",
      line: "Streaming connections, multiplexed.",
    },
  ];

  return (
    <section
      id="features"
      ref={ref}
      className="mx-auto max-w-[1600px] px-5 py-28 sm:px-8"
    >
      <div className="grid grid-flow-dense grid-cols-1 gap-2 lg:grid-cols-12">
        {tiles.map((tile, i) => (
          <div
            key={i}
            data-rise
            className={`${tile.span} flex flex-col rounded-md`}
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <div className="min-h-[160px] flex-1">{tile.ui}</div>
            {tile.name && (
              <div className="px-6 pb-6">
                <p className={`text-[18px] font-medium ${CAP}`}>{tile.name}</p>
                <p className={`mt-1 text-[15px] ${MUTED}`}>{tile.line}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
