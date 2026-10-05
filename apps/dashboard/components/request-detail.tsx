"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import type { RequestLog } from "@/lib/api";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-right">{v}</span>
    </div>
  );
}

export function RequestDetail({ request, tunnelId }: { request: RequestLog; tunnelId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCurl() {
    const curl = `curl -i '${request.host}${request.path}'`;
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const size = request.request_bytes + request.response_bytes;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {request.method} {request.path}
        </h1>
        <Button variant="outline" size="sm" onClick={copyCurl}>
          {copied ? "Copied" : "Copy as cURL"}
        </Button>
      </div>

      <Tabs tabs={["Overview", "Headers", "Query", "Response"]}>
        {(active) => {
          if (active === "Overview") {
            return (
              <div>
                <Row k="Request ID" v={request.request_id} />
                <Row k="Tunnel" v={tunnelId} />
                <Row k="Time" v={new Date(request.started_at).toLocaleString()} />
                <Row k="Status" v={request.status_code} />
                <Row k="Duration" v={`${request.duration_ms} ms`} />
                <Row k="Size" v={`${size} bytes`} />
              </div>
            );
          }
          if (active === "Headers") {
            return (
              <div>
                <Row k="Host" v={request.host} />
                <Row k="Method" v={request.method} />
              </div>
            );
          }
          if (active === "Query") {
            const q = request.path.includes("?") ? request.path.split("?")[1] : "";
            return q ? (
              <pre className="whitespace-pre-wrap text-sm">{q}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">No query parameters.</p>
            );
          }
          return (
            <div>
              <Row k="Status code" v={request.status_code} />
              <Row k="Response bytes" v={request.response_bytes} />
            </div>
          );
        }}
      </Tabs>
    </div>
  );
}
