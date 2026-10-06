import { serverFetch } from "@/lib/api";
import type { UsageToday, UsageMonth, DailyUsage } from "@/lib/api";
import { UsageBars } from "@/components/usage-bars";
import { UsageChart } from "@/components/usage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const [today, month, history] = await Promise.all([
    serverFetch<UsageToday>("/usage/today"),
    serverFetch<UsageMonth>("/usage/month"),
    serverFetch<{ days: DailyUsage[] }>("/usage/history?days=7"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <BarChart3 className="h-3.5 w-3.5" /> METRICS & QUOTAS
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Usage & Limits</h1>
        </div>
      </div>

      <UsageBars
        todayUsed={today.used}
        todayLimit={today.limit}
        monthBytes={month.bytes}
        monthLimit={month.limit}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            7-Day Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart days={history.days} />
        </CardContent>
      </Card>
    </div>
  );
}
