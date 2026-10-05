"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tunnel } from "@/lib/api";

export function TunnelCard({ tunnel }: { tunnel: Tunnel }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(tunnel.public_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function stop() {
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

  const online = tunnel.status === "online";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Active tunnel</CardTitle>
        <Badge variant={online ? "success" : "secondary"}>{tunnel.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <a
            href={tunnel.public_url}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm underline"
          >
            {tunnel.public_url}
          </a>
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Forwarding to {tunnel.local_host}:{tunnel.local_port}
        </p>
        {online && (
          <Button variant="destructive" size="sm" onClick={stop} disabled={busy}>
            Stop tunnel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
