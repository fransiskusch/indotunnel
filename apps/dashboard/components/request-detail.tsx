"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Terminal, Code2 } from "lucide-react";
import type { RequestLog } from "@/lib/api";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/60 py-2.5 text-sm last:border-0">
      <span className="text-zinc-400 font-sans">{k}</span>
      <span className="font-mono text-right text-zinc-100">{v}</span>
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
  const isSuccess = request.status_code < 400;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/requests?tunnel=${tunnelId}`}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={isSuccess ? "success" : "destructive"}>
            {request.status_code}
          </Badge>
          <span className="font-mono font-bold text-lg text-emerald-400">{request.method}</span>
          <span className="font-mono text-base text-zinc-200">{request.path}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={copyCurl}
          className="ml-auto border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white font-mono text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400 mr-1.5" /> Copied cURL
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy as cURL
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs tabs={["Overview", "Headers", "Query", "Response"]}>
            {(active) => {
              if (active === "Overview") {
                return (
                  <div className="space-y-1">
                    <Row k="Request ID" v={request.request_id} />
                    <Row k="Tunnel ID" v={tunnelId} />
                    <Row k="Host" v={request.host} />
                    <Row k="Time" v={new Date(request.started_at).toLocaleString()} />
                    <Row k="Status" v={<Badge variant={isSuccess ? "success" : "destructive"}>{request.status_code}</Badge>} />
                    <Row k="Duration" v={`${request.duration_ms} ms`} />
                    <Row k="Total Size" v={`${size} bytes`} />
                  </div>
                );
              }
              if (active === "Headers") {
                return (
                  <div className="space-y-1">
                    <Row k="Host" v={request.host} />
                    <Row k="Method" v={request.method} />
                    <Row k="Path" v={request.path} />
                    <Row k="Request Bytes" v={`${request.request_bytes} B`} />
                  </div>
                );
              }
              if (active === "Query") {
                const q = request.path.includes("?") ? request.path.split("?")[1] : "";
                return q ? (
                  <pre className="p-4 rounded-lg bg-zinc-950 text-cyan-300 font-mono text-xs overflow-x-auto border border-zinc-800">
                    {q}
                  </pre>
                ) : (
                  <p className="text-xs text-zinc-500 py-4 font-mono">No query parameters attached to this request.</p>
                );
              }
              return (
                <div className="space-y-1">
                  <Row k="HTTP Status" v={request.status_code} />
                  <Row k="Response Payload Size" v={`${request.response_bytes} bytes`} />
                  <Row k="Execution Time" v={`${request.duration_ms} ms`} />
                </div>
              );
            }}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
