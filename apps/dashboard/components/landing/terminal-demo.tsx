"use client";

import { useState, useEffect } from "react";
import { Terminal, Copy, Check, Play, RefreshCw, ArrowUpRight, Radio } from "lucide-react";

interface RequestItem {
  id: string;
  time: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  status: number;
  duration: string;
}

export function TerminalDemo() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"cli" | "inspector">("cli");
  const [requests, setRequests] = useState<RequestItem[]>([
    { id: "req-1", time: "14:02:11", method: "POST", path: "/api/webhooks/stripe", status: 200, duration: "18ms" },
    { id: "req-2", time: "14:02:15", method: "GET", path: "/healthz", status: 200, duration: "4ms" },
    { id: "req-3", time: "14:02:22", method: "POST", path: "/api/auth/callback", status: 201, duration: "32ms" },
  ]);

  function simulateNewRequest() {
    const methods: Array<"GET" | "POST" | "PUT" | "DELETE"> = ["GET", "POST", "PUT"];
    const paths = ["/api/v1/users", "/webhooks/github", "/oauth/token", "/api/checkout/session"];
    const statuses = [200, 201, 204, 400];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    
    const newReq: RequestItem = {
      id: `req-${Date.now()}`,
      time: timeStr,
      method: methods[Math.floor(Math.random() * methods.length)],
      path: paths[Math.floor(Math.random() * paths.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      duration: `${Math.floor(Math.random() * 25 + 5)}ms`,
    };

    setRequests((prev) => [newReq, ...prev.slice(0, 4)]);
  }

  function copyInstall() {
    navigator.clipboard.writeText("npx indotunnel 3000");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-slate-950/90 shadow-2xl backdrop-blur-xl overflow-hidden glow-emerald">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-4 py-3 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="ml-2 text-zinc-400 flex items-center gap-1.5 font-medium">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            indotunnel-cli v1.0.4
          </span>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950/60 p-1 rounded-md border border-zinc-800/60">
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              activeTab === "cli" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "hover:text-zinc-200"
            }`}
          >
            Live Terminal
          </button>
          <button
            onClick={() => setActiveTab("inspector")}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
              activeTab === "inspector" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "hover:text-zinc-200"
            }`}
          >
            HTTP Inspector
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-5 font-mono text-sm leading-relaxed">
        {activeTab === "cli" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-emerald-400">$</span>
                <span className="text-white font-semibold">npx indotunnel 3000</span>
              </div>
              <button
                onClick={copyInstall}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 bg-zinc-800/60 px-2.5 py-1 rounded border border-zinc-700/50 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2 text-xs text-zinc-300 border-l-2 border-emerald-500/40 pl-3">
              <p className="text-emerald-400 font-semibold flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                STATUS: ONLINE (Connected to id-cgk.gateway.indotunnel.id)
              </p>
              <p className="text-zinc-400">
                Forwarding:{" "}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-cyan-400 underline font-semibold hover:text-cyan-300"
                >
                  https://a8f2x.indotunnel.id
                </a>{" "}
                ➔ <span className="text-white font-mono">http://localhost:3000</span>
              </p>
              <p className="text-zinc-400">Latency: 12ms | Protocol: HTTP/2 TLS 1.3</p>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-900 space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-500 pb-1">
                <span>INCOMING TRAFFIC STREAM</span>
                <button
                  onClick={simulateNewRequest}
                  className="flex items-center gap-1 text-emerald-400 hover:underline cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-current" /> Trigger Request
                </button>
              </div>

              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-900/50 border border-zinc-800/40 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">{r.time}</span>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                        r.method === "GET"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : r.method === "POST"
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      }`}
                    >
                      {r.method}
                    </span>
                    <span className="text-zinc-200 font-mono">{r.path}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-semibold ${
                        r.status < 300 ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {r.status} OK
                    </span>
                    <span className="text-zinc-500">{r.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-400 font-semibold">POST /api/webhooks/stripe</span>
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                200 OK (18ms)
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-zinc-400">Headers:</div>
              <pre className="p-2.5 rounded bg-zinc-900 text-zinc-300 font-mono text-[11px] overflow-x-auto border border-zinc-800">
{`Host: app-dev.indotunnel.com
User-Agent: Stripe/1.0 (+https://stripe.com/docs/webhooks)
Content-Type: application/json
X-Stripe-Signature: t=169700,v1=9a8b7c6d5e4f...`}
              </pre>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Payload:</span>
                <span className="text-[10px] text-cyan-400">JSON (128 bytes)</span>
              </div>
              <pre className="p-2.5 rounded bg-zinc-900 text-emerald-300 font-mono text-[11px] overflow-x-auto border border-zinc-800">
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
