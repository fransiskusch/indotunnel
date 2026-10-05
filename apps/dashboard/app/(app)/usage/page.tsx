import { serverFetch } from "@/lib/api";
import type { UsageToday, UsageMonth, DailyUsage } from "@/lib/api";
import { UsageBars } from "@/components/usage-bars";
import { UsageChart } from "@/components/usage-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const [today, month, history] = await Promise.all([
    serverFetch<UsageToday>("/usage/today"),
    serverFetch<UsageMonth>("/usage/month"),
    serverFetch<{ days: DailyUsage[] }>("/usage/history?days=7"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usage</h1>
      <UsageBars
        todayUsed={today.used}
        todayLimit={today.limit}
        monthBytes={month.bytes}
        monthLimit={month.limit}
      />
      <Card>
        <CardHeader>
          <CardTitle>Last 7 days</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart days={history.days} />
        </CardContent>
      </Card>
    </div>
  );
}
