import { serverFetch } from "@/lib/api";
import type { Tunnel, UsageToday, UsageMonth, RequestLog } from "@/lib/api";
import { TunnelCard } from "@/components/tunnel-card";
import { UsageBars } from "@/components/usage-bars";
import { RequestTable } from "@/components/request-table";
import { StatBoard } from "@/components/stat-board";
import { Reveal } from "@/components/reveal";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { tunnels } = await serverFetch<{ tunnels: Tunnel[] }>("/tunnels");
  const tunnel = tunnels[0];

  const [today, month, reqs] = await Promise.all([
    serverFetch<UsageToday>("/usage/today"),
    serverFetch<UsageMonth>("/usage/month"),
    tunnel
      ? serverFetch<{ requests: RequestLog[] }>(`/tunnels/${tunnel.tunnel_id}/requests?limit=5`)
      : Promise.resolve({ requests: [] as RequestLog[] }),
  ]);

  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1
            data-rise
            className="font-medium leading-[1.02] tracking-[-0.03em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-head)" }}
          >
            {tunnel ? "Tunnel online" : "No tunnel running"}
          </h1>
          <p
            data-rise
            className="mt-4 max-w-[46ch] text-[16px] text-[color:var(--ink-muted)]"
          >
            {tunnel
              ? `Forwarding ${tunnel.local_host}:${tunnel.local_port} to the public internet.`
              : "Start a tunnel on your machine and it appears here with its public URL."}
          </p>
        </div>

        <Link
          data-rise
          href="/requests"
          className="text-[16px] text-[color:var(--ink)] underline decoration-[color:var(--ink-muted)] underline-offset-4 transition-colors hover:decoration-[color:var(--brand)]"
        >
          Open the request inspector
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div data-rise className="lg:col-span-2">
          <TunnelCard tunnel={tunnel} />
        </div>
        <div data-rise>
          <UsageBars
            todayUsed={today.used}
            todayLimit={today.limit}
            monthBytes={month.bytes}
            monthLimit={month.limit}
          />
        </div>
      </div>

      <div>
        <div data-rise className="flex items-baseline justify-between gap-4">
          <h2 className="text-[20px] font-medium text-[color:var(--ink)]">
            Latest requests
          </h2>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1 text-[15px] text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div data-rise className="mt-5 overflow-hidden rounded-md bg-[color:var(--surface-2)]">
          <RequestTable requests={reqs.requests} tunnelId={tunnel?.tunnel_id} linkToDetail />
        </div>
      </div>

      {reqs.requests.length > 0 && (
        <div data-rise>
          <h2 className="text-[20px] font-medium text-[color:var(--ink)]">
            Traffic at a glance
          </h2>
          <div className="mt-5">
            <StatBoard
              stats={[
                { label: "Requests shown", value: String(reqs.requests.length) },
                {
                  label: "Errors",
                  value: String(reqs.requests.filter((r) => r.status_code >= 400).length),
                  alert: reqs.requests.some((r) => r.status_code >= 400),
                },
                {
                  label: "Median latency",
                  value: `${(() => {
                    const d = reqs.requests.map((r) => r.duration_ms).sort((a, b) => a - b);
                    return d[Math.floor(d.length / 2)];
                  })()} ms`,
                },
              ]}
            />
          </div>
        </div>
      )}
    </Reveal>
  );
}
