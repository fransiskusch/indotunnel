import { formatBytes } from "@/components/usage-bars";
import type { DailyUsage } from "@/lib/api";

export function UsageChart({ days }: { days: DailyUsage[] }) {
  if (!days || days.length === 0) {
    return <p className="text-sm text-muted-foreground">No usage recorded yet.</p>;
  }
  const max = Math.max(...days.map((d) => d.request_count), 1);
  return (
    <div className="flex h-48 items-end gap-2">
      {days.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">{d.request_count}</span>
          <div
            className="w-full rounded-t bg-primary"
            style={{ height: `${(d.request_count / max) * 100}%`, minHeight: 2 }}
            title={`${d.date}: ${d.request_count} req, ${formatBytes(d.bytes_in + d.bytes_out)}`}
          />
          <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}
