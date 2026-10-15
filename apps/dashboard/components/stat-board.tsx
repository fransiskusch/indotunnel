// A small readout of the numbers a developer actually watches. Rendered as a
// real interface fragment (data-ui) so it reads as the product's own panel.
export function StatBoard({
  stats,
}: {
  stats: { label: string; value: string; note?: string; alert?: boolean }[];
}) {
  return (
    <div data-ui className="grid gap-6 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col justify-end rounded-md p-6 sm:min-h-[200px]"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <span className="text-[15px] text-[color:var(--ink-muted)]">{s.label}</span>
          <span
            className="mt-2 text-[28px] font-medium [font-variant-numeric:tabular-nums]"
            style={{ color: s.alert ? "var(--danger)" : "var(--ink)" }}
          >
            {s.value}
          </span>
          {s.note && (
            <span className="mt-1 text-[15px] text-[color:var(--ink-muted)]">{s.note}</span>
          )}
        </div>
      ))}
    </div>
  );
}
