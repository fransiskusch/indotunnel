import { formatBytes } from "@/components/usage-bars";
import type { DailyUsage } from "@/lib/api";

export function UsageChart({ days }: { days: DailyUsage[] }) {
  if (!days || days.length === 0) {
    return <p className="text-[16px] text-[color:var(--ink-muted)]">No usage recorded yet.</p>;
  }
  const max = Math.max(...days.map((d) => d.request_count), 1);
  return (
    <div data-ui role="img" aria-label="Requests per day">
      <div className="flex h-56 items-stretch gap-2">
        {days.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col justify-end gap-2">
            <span className="text-center text-[13px] text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums]">
              {d.request_count}
            </span>
            {/* Track gives each bar a real height to fill, so a quiet day
                reads as small rather than as a stroke. */}
            <div
              className="relative w-full flex-1 rounded-t"
              style={{ backgroundColor: "var(--surface-3)" }}
              title={`${d.date}: ${d.request_count} req, ${formatBytes(d.bytes_in + d.bytes_out)}`}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t"
                style={{
                  height: `${Math.max((d.request_count / max) * 100, 3)}%`,
                  backgroundColor: "var(--brand)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {days.map((d) => (
          <span
            key={d.date}
            className="flex-1 text-center text-[13px] text-[color:var(--ink-muted)]"
          >
            {d.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}
