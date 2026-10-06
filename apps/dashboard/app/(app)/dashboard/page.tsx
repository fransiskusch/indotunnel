import { serverFetch } from "@/lib/api";
import type { Tunnel, UsageToday, UsageMonth, RequestLog } from "@/lib/api";
import { TunnelCard } from "@/components/tunnel-card";
import { UsageBars } from "@/components/usage-bars";
import { RequestTable } from "@/components/request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Activity, Radio, ArrowUpRight, Terminal, Zap, HardDrive } from "lucide-react";

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
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            LIVE AGENT OVERVIEW
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
          >
            <Terminal className="h-3.5 w-3.5" /> Live Inspector
          </Link>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Tunnel Card */}
        <div className="lg:col-span-2">
          {tunnel ? (
            <TunnelCard tunnel={tunnel} />
          ) : (
            <Card className="border-dashed border-zinc-800 bg-slate-900/30">
              <CardContent className="py-12 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700/50">
                  <Terminal className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">No active tunnel detected</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Start a tunnel on your local machine using the CLI tool.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 font-mono text-xs text-emerald-400">
                  <span>$ indotunnel http 8080</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Usage Summary Widget */}
        <div>
          <UsageBars
            todayUsed={today.used}
            todayLimit={today.limit}
            monthBytes={month.bytes}
            monthLimit={month.limit}
          />
        </div>
      </div>

      {/* Latest Requests Section */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Latest Tunnel Requests
          </CardTitle>
          <Link
            href="/requests"
            className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
          >
            View all logs <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <RequestTable requests={reqs.requests} tunnelId={tunnel?.tunnel_id} linkToDetail={true} />
        </CardContent>
      </Card>
    </div>
  );
}
