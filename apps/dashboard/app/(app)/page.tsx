import { serverFetch } from "@/lib/api";
import type { Tunnel, UsageToday, UsageMonth, RequestLog } from "@/lib/api";
import { TunnelCard } from "@/components/tunnel-card";
import { UsageBars } from "@/components/usage-bars";
import { RequestTable } from "@/components/request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {tunnel ? (
        <TunnelCard tunnel={tunnel} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tunnel yet. Run <code className="font-mono">indotunnel 3000</code> to start one.
          </CardContent>
        </Card>
      )}

      <UsageBars
        todayUsed={today.used}
        todayLimit={today.limit}
        monthBytes={month.bytes}
        monthLimit={month.limit}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Latest requests</CardTitle>
          <Link href="/requests" className="text-sm underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <RequestTable requests={reqs.requests} tunnelId={tunnel?.tunnel_id} />
        </CardContent>
      </Card>
    </div>
  );
}
