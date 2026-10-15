import { Progress } from "@/components/ui/progress";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function Bar({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number;
  format: (n: number) => string;
}) {
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] text-[color:var(--ink-muted)]">{label}</span>
        <span className="text-[15px] text-[color:var(--ink)] [font-variant-numeric:tabular-nums]">
          {format(used)} / {format(limit)}
        </span>
      </div>
      <Progress value={pct} className="mt-3" />
    </div>
  );
}

export function UsageBars({
  todayUsed,
  todayLimit,
  monthBytes,
  monthLimit,
}: {
  todayUsed: number;
  todayLimit: number;
  monthBytes: number;
  monthLimit: number;
}) {
  return (
    <div
      data-ui
      className="flex h-full flex-col gap-7 rounded-md p-6 sm:p-8"
      style={{ backgroundColor: "var(--surface-2)" }}
    >
      <p className="text-[20px] font-medium text-[color:var(--ink)]">Usage this period</p>

      <Bar
        label="Requests today"
        used={todayUsed}
        limit={todayLimit}
        format={(n) => n.toLocaleString()}
      />
      <Bar
        label="Bandwidth this month"
        used={monthBytes}
        limit={monthLimit}
        format={formatBytes}
      />
    </div>
  );
}
