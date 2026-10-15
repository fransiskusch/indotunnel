import { serverFetch } from "@/lib/api";
import type { UsageToday, UsageMonth, DailyUsage } from "@/lib/api";
import { UsageBars, formatBytes } from "@/components/usage-bars";
import { UsageChart } from "@/components/usage-chart";
import { StatBoard } from "@/components/stat-board";
import { Reveal } from "@/components/reveal";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const [today, month, history] = await Promise.all([
    serverFetch<UsageToday>("/usage/today"),
    serverFetch<UsageMonth>("/usage/month"),
    serverFetch<{ days: DailyUsage[] }>("/usage/history?days=7"),
  ]);

  const total = history.days.reduce((sum, d) => sum + d.request_count, 0);
  const bytes = history.days.reduce((sum, d) => sum + d.bytes_in + d.bytes_out, 0);
  const peak = history.days.reduce(
    (best, d) => (d.request_count > best.request_count ? d : best),
    history.days[0] ?? { date: "—", request_count: 0, bytes_in: 0, bytes_out: 0 },
  );

  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1
            data-rise
            className="font-medium leading-[1.02] tracking-[-0.03em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-head)" }}
          >
            Usage
          </h1>
          <p
            data-rise
            className="mt-4 max-w-[54ch] text-[16px] text-[color:var(--ink-muted)]"
          >
            Requests and bandwidth against your plan limits. Daily quotas reset
            at midnight, bandwidth on the first of the month.
          </p>
        </div>
        <Link
          data-rise
          href="/settings"
          className="rounded-md bg-[color:var(--brand)] px-4 py-2.5 text-[15px] font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97]"
        >
          View plan and keys
        </Link>
      </div>

      <div data-rise>
        <UsageBars
          todayUsed={today.used}
          todayLimit={today.limit}
          monthBytes={month.bytes}
          monthLimit={month.limit}
        />
      </div>

      <div>
        <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
          Requests per day
        </h2>
        <div
          data-rise
          data-ui
          className="mt-5 rounded-md p-6 sm:p-8"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <UsageChart days={history.days} />
        </div>
      </div>

      <div>
        <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
          Day by day
        </h2>
        <div
          data-rise
          data-ui
          className="mt-5 rounded-md p-6 sm:p-8"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <ul className="space-y-4">
            {history.days.map((d) => {
              const bytesD = d.bytes_in + d.bytes_out;
              const pct = total > 0 ? (d.request_count / total) * 100 : 0;
              return (
                <li key={d.date} className="flex items-center gap-4">
                  <span className="w-20 shrink-0 text-[15px] text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums]">
                    {d.date.slice(5)}
                  </span>
                  <span
                    className="h-2 flex-1 overflow-hidden rounded-full"
                    style={{ backgroundColor: "var(--surface-3)" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: "var(--brand)" }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-[15px] text-[color:var(--ink)] [font-variant-numeric:tabular-nums]">
                    {d.request_count.toLocaleString()}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-[15px] text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums] sm:block">
                    {formatBytes(bytesD)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div>
        <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
          Last seven days
        </h2>
        <div data-rise className="mt-5">
          <StatBoard
            stats={[
              { label: "Total requests", value: total.toLocaleString() },
              { label: "Bandwidth", value: formatBytes(bytes) },
              {
                label: "Busiest day",
                value: peak.date.slice(5),
                note: `${peak.request_count.toLocaleString()} requests`,
              },
            ]}
          />
        </div>
      </div>
    </Reveal>
  );
}
