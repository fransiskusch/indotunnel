"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { RequestLog } from "@/lib/api";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <span className="text-[15px] text-[color:var(--ink-muted)]">{k}</span>
      <span className="break-all text-right text-[15px] text-[color:var(--ink)] [font-variant-numeric:tabular-nums]">
        {v}
      </span>
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
  const isWarn = request.status_code >= 400 && request.status_code < 500;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/requests?tunnel=${tunnelId}`}
          className="inline-flex items-center gap-2 text-[15px] text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
        >
          <ArrowLeft className="h-4 w-4" /> All requests
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className="text-[13px] font-medium"
            style={{
              color: isSuccess
                ? "var(--brand)"
                : isWarn
                  ? "var(--warn)"
                  : "var(--danger)",
            }}
          >
            {request.status_code}
          </span>
          <span className="text-[17px] font-medium text-[color:var(--ink)]">{request.method}</span>
          <span className="break-all text-[17px] text-[color:var(--ink-muted)]">{request.path}</span>
        </div>

        <div className="mt-6">
          <Button variant="secondary" size="sm" onClick={copyCurl}>
            {copied ? "Copied" : "Copy as cURL"}
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-[color:var(--surface-2)] p-6 sm:p-8">
        <Tabs tabs={["Overview", "Headers", "Query", "Response"]}>
          {(active) => {
            if (active === "Overview") {
              return (
                <div>
                  <Row k="Request ID" v={request.request_id} />
                  <Row k="Tunnel ID" v={tunnelId} />
                  <Row k="Host" v={request.host} />
                  <Row k="Time" v={new Date(request.started_at).toLocaleString()} />
                  <Row
                    k="Status"
                    v={
                      <Badge variant={isSuccess ? "success" : isWarn ? "warn" : "destructive"}>
                        {request.status_code}
                      </Badge>
                    }
                  />
                  <Row k="Duration" v={`${request.duration_ms} ms`} />
                  <Row k="Total size" v={`${size} bytes`} />
                </div>
              );
            }
            if (active === "Headers") {
              return (
                <div>
                  <Row k="Host" v={request.host} />
                  <Row k="Method" v={request.method} />
                  <Row k="Path" v={request.path} />
                  <Row k="Request bytes" v={`${request.request_bytes} B`} />
                </div>
              );
            }
            if (active === "Query") {
              const q = request.path.includes("?") ? request.path.split("?")[1] : "";
              return q ? (
                <pre
                  className="overflow-x-auto rounded-md p-4 text-[14px] text-[color:var(--ink)]"
                  style={{ backgroundColor: "var(--bg)" }}
                >
                  <code>{q}</code>
                </pre>
              ) : (
                <p className="py-2 text-[16px] text-[color:var(--ink-muted)]">
                  No query parameters on this request.
                </p>
              );
            }
            return (
              <div>
                <Row k="HTTP status" v={request.status_code} />
                <Row k="Response payload" v={`${request.response_bytes} bytes`} />
                <Row k="Execution time" v={`${request.duration_ms} ms`} />
              </div>
            );
          }}
        </Tabs>
      </div>
    </div>
  );
}
