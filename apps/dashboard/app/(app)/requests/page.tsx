import { serverFetch } from "@/lib/api";
import type { Tunnel, RequestLog } from "@/lib/api";
import { RequestTable } from "@/components/request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Terminal, Filter, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tunnel?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  const { tunnels } = await serverFetch<{ tunnels: Tunnel[] }>("/tunnels");

  const selected = sp.tunnel
    ? tunnels.find((t) => t.tunnel_id === sp.tunnel)
    : tunnels[0];

  const limit = Math.min(500, Math.max(10, Number(sp.limit) || 100));

  const reqs = selected
    ? await serverFetch<{ requests: RequestLog[] }>(
        `/tunnels/${selected.tunnel_id}/requests?limit=${limit}`
      )
    : { requests: [] as RequestLog[] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Terminal className="h-3.5 w-3.5" /> REAL-TIME TRAFFIC LOGS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">HTTP Request Inspector</h1>
        </div>
      </div>

      {tunnels.length > 1 && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Select Tunnel:
          </span>
          <div className="flex flex-wrap gap-2">
            {tunnels.map((t) => (
              <Link
                key={t.tunnel_id}
                href={`/requests?tunnel=${t.tunnel_id}`}
                className={`rounded-lg border px-3 py-1.5 transition-all ${
                  selected?.tunnel_id === t.tunnel_id
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white"
                }`}
              >
                {t.subdomain}.indotunnel.com
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-mono text-zinc-300">
            {selected ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {selected.subdomain} — Showing last {limit} requests
              </span>
            ) : (
              "No Active Tunnels"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RequestTable
            requests={reqs.requests}
            tunnelId={selected?.tunnel_id}
            linkToDetail
          />
        </CardContent>
      </Card>
    </div>
  );
}
