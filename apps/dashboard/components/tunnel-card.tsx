"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tunnel } from "@/lib/api";

const LABEL = "text-[13px] text-[color:var(--ink-muted)]";

export function TunnelCard({ tunnel }: { tunnel?: Tunnel }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    if (!tunnel) return;
    await navigator.clipboard.writeText(tunnel.public_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function stop() {
    if (!tunnel) return;
    setBusy(true);
    try {
      await fetch(`/api/tunnels/${tunnel.tunnel_id}/stop`, {
        method: "POST",
        credentials: "same-origin",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!tunnel) {
    return (
      <div
        className="flex h-full flex-col justify-between gap-8 rounded-md p-6 sm:p-8"
        style={{ backgroundColor: "var(--surface-2)" }}
      >
        <div>
          <p className="text-[20px] font-medium text-[color:var(--ink)]">
            Nothing is listening yet
          </p>
          <p className="mt-3 max-w-[44ch] text-[16px] text-[color:var(--ink-muted)]">
            Run one command in your project directory to open a public URL for
            your local server.
          </p>
        </div>
        <pre
          data-ui
          className="overflow-x-auto rounded-md px-4 py-3 text-[14px] text-[color:var(--ink)]"
          style={{ backgroundColor: "var(--bg)" }}
        >
          <code>indotunnel http 8080</code>
        </pre>
      </div>
    );
  }

  const online = tunnel.status === "online";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md" style={{ backgroundColor: "var(--surface-2)" }}>
      {/* The motif: the tunnel mouth, holding the address a request passes through. */}
      <div
        data-ui
        className="arch px-6 pb-10 pt-14 sm:px-8 sm:pt-20"
        style={{ backgroundColor: online ? "var(--brand)" : "var(--surface-3)" }}
      >
        <a
          href={tunnel.public_url}
          target="_blank"
          rel="noreferrer"
          className="block [overflow-wrap:anywhere] font-medium leading-[1.08] tracking-[-0.02em] underline decoration-2 underline-offset-[8px]"
          style={{
            fontSize: "clamp(1.25rem, 0.7rem + 2.6vw, 3.25rem)",
            color: online ? "var(--brand-ink)" : "var(--ink)",
          }}
        >
          <span className="sm:hidden">{tunnel.subdomain}.indotunnel.id</span>
          <span className="hidden sm:inline">
            {tunnel.public_url.replace(/^https?:\/\//, "")}
          </span>
        </a>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span
            className="arch-live h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "var(--brand-ink)" }}
            aria-hidden
          />
          <Badge
            variant="secondary"
            className="bg-[color:var(--bg)] text-[color:var(--ink)]"
          >
            {tunnel.status}
          </Badge>
          <span
            className="text-[15px]"
            style={{ color: online ? "var(--brand-ink)" : "var(--ink-muted)" }}
          >
            HTTPS live · {tunnel.protocol}
          </span>
        </div>
      </div>

      <div data-ui className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-8">
        <dl className="grid grid-cols-2 gap-6">
          <div>
            <dt className={LABEL}>Forwarding to</dt>
            <dd className="mt-1 text-[16px] text-[color:var(--ink)]">
              {tunnel.local_host}:{tunnel.local_port}
            </dd>
          </div>
          <div>
            <dt className={LABEL}>Tunnel</dt>
            <dd className="mt-1 break-all text-[16px] text-[color:var(--ink)]">
              {tunnel.subdomain}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy public URL"}
          </Button>
          {online && (
            <Button variant="destructive" size="sm" onClick={stop} disabled={busy}>
              {busy ? "Stopping…" : "Stop tunnel"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
