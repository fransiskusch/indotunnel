"use client";

import { useState } from "react";

interface RequestItem {
  id: string;
  time: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  status: number;
  duration: string;
}

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
};

export function TerminalDemo() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"cli" | "inspector">("cli");
  const [requests, setRequests] = useState<RequestItem[]>([
    { id: "req-1", time: "14:02:11", method: "POST", path: "/api/webhooks/stripe", status: 200, duration: "18ms" },
    { id: "req-2", time: "14:02:15", method: "GET", path: "/healthz", status: 200, duration: "4ms" },
    { id: "req-3", time: "14:02:22", method: "POST", path: "/api/auth/callback", status: 201, duration: "32ms" },
  ]);

  function simulateNewRequest() {
    const methods: Array<"GET" | "POST" | "PUT"> = ["GET", "POST", "PUT"];
    const paths = ["/api/v1/users", "/webhooks/github", "/oauth/token", "/api/checkout/session"];
    const statuses = [200, 201, 204, 400];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    setRequests((prev) => [
      {
        id: `req-${Date.now()}`,
        time: timeStr,
        method: methods[Math.floor(Math.random() * methods.length)],
        path: paths[Math.floor(Math.random() * paths.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        duration: `${Math.floor(Math.random() * 25 + 5)}ms`,
      },
      ...prev.slice(0, 4),
    ]);
  }

  function copyInstall() {
    navigator.clipboard.writeText("npx indotunnel 3000");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div data-ui className="w-full overflow-hidden text-sm">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: "var(--surface-3)" }}
      >
        <span className="text-[13px] text-[color:var(--ink-muted)]">
          indotunnel-cli
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("cli")}
            className="rounded px-3 py-1 text-[13px] transition-colors"
            style={{
              color: activeTab === "cli" ? "var(--brand-ink)" : "var(--ink-muted)",
              backgroundColor: activeTab === "cli" ? "var(--brand)" : "transparent",
            }}
          >
            Terminal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inspector")}
            className="rounded px-3 py-1 text-[13px] transition-colors"
            style={{
              color: activeTab === "inspector" ? "var(--brand-ink)" : "var(--ink-muted)",
              backgroundColor: activeTab === "inspector" ? "var(--brand)" : "transparent",
            }}
          >
            Inspector
          </button>
        </div>
      </div>

      <div className="p-5" style={{ backgroundColor: "var(--surface-2)" }}>
        {activeTab === "cli" ? (
          <div className="space-y-5">
            <div
              className="flex items-center justify-between rounded-md p-3"
              style={{ backgroundColor: "var(--surface-3)" }}
            >
              <span className="text-[15px] text-[color:var(--ink)]">
                <span className="text-[color:var(--ink-muted)]">$ </span>
                npx indotunnel 3000
              </span>
              <button
                type="button"
                onClick={copyInstall}
                className="rounded px-3 py-1 text-[13px] text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="space-y-1.5 text-[13px]">
              <p className="text-[color:var(--brand)]">
                Connected to id-cgk.gateway.indotunnel.id
              </p>
              <p className="text-[color:var(--ink-muted)]">
                Forwarding https://a8f2x.indotunnel.id to http://localhost:3000
              </p>
              <p className="text-[color:var(--ink-muted)]">
                12ms round trip, HTTP/2, TLS 1.3
              </p>
            </div>

            <div className="space-y-2 pt-4" style={{ backgroundColor: "transparent" }}>
              <div className="flex items-center justify-between text-[13px] text-[color:var(--ink-muted)]">
                <span>Incoming traffic</span>
                <button
                  type="button"
                  onClick={simulateNewRequest}
                  className="text-[color:var(--brand)] transition-opacity hover:opacity-80"
                >
                  Trigger request
                </button>
              </div>

              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-[13px]"
                  style={{ backgroundColor: "var(--surface-3)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[color:var(--ink-muted)]">{r.time}</span>
                    <span className="w-11 font-medium text-[color:var(--ink)]">
                      {r.method}
                    </span>
                    <span className="text-[color:var(--ink)]">{r.path}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-medium"
                      style={{
                        color:
                          r.status < 300 ? "var(--brand)" : "var(--ink-muted)",
                      }}
                    >
                      {r.status} {STATUS_TEXT[r.status] ?? ""}
                    </span>
                    <span className="text-[color:var(--ink-muted)]">{r.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--ink)]">
                POST /api/webhooks/stripe
              </span>
              <span className="text-[color:var(--brand)]">200 OK, 18ms</span>
            </div>

            <div className="space-y-2">
              <div className="text-[color:var(--ink-muted)]">Headers</div>
              <pre
                className="overflow-x-auto rounded-md p-3 text-[13px] text-[color:var(--ink)]"
                style={{ backgroundColor: "var(--surface-3)" }}
              >
{`Host: a8f2x.indotunnel.id
User-Agent: Stripe/1.0
Content-Type: application/json
X-Stripe-Signature: t=169700,v1=9a8b7c6d5e4f`}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[color:var(--ink-muted)]">
                <span>Payload</span>
                <span>JSON, 128 bytes</span>
              </div>
              <pre
                className="overflow-x-auto rounded-md p-3 text-[13px] text-[color:var(--ink)]"
                style={{ backgroundColor: "var(--surface-3)" }}
              >
{`{
  "event": "payment_intent.succeeded",
  "amount": 4900,
  "currency": "usd",
  "customer": "cus_N7xL29a"
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
