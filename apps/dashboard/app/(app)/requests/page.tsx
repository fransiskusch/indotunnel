import { serverFetch } from "@/lib/api";
import type { Tunnel, RequestLog } from "@/lib/api";
import { RequestTable } from "@/components/request-table";
import { StatBoard } from "@/components/stat-board";
import { Reveal } from "@/components/reveal";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
        `/tunnels/${selected.tunnel_id}/requests?limit=${limit}`,
      )
    : { requests: [] as RequestLog[] };

  return (
    <Reveal>
      <div data-rise className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1
            className="font-medium leading-[1.02] tracking-[-0.03em] text-[color:var(--ink)]"
            style={{ fontSize: "var(--step-head)" }}
          >
            Request inspector
          </h1>
          <p className="mt-4 max-w-[54ch] text-[16px] text-[color:var(--ink-muted)]">
            {selected
              ? `Every request that reached ${selected.subdomain}, newest first.`
              : "Start a tunnel to begin recording traffic."}
          </p>
        </div>
        {selected && (
          <Link
            href={`/dashboard`}
            className="rounded-md bg-[color:var(--brand)] px-4 py-2.5 text-[15px] font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97]"
          >
            Back to tunnel
          </Link>
        )}
      </div>

      {tunnels.length > 1 && (
        <div data-rise className="flex flex-wrap gap-2">
          {tunnels.map((t) => {
            const isActive = selected?.tunnel_id === t.tunnel_id;
            return (
              <Link
                key={t.tunnel_id}
                href={`/requests?tunnel=${t.tunnel_id}`}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[15px] transition-colors",
                  isActive
                    ? "bg-[color:var(--brand)] text-[color:var(--brand-ink)]"
                    : "bg-[color:var(--surface-2)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]",
                )}
              >
                {t.subdomain}
              </Link>
            );
          })}
        </div>
      )}

      <div>
        <div data-rise className="flex items-baseline justify-between gap-4">
          <h2 className="text-[20px] font-medium text-[color:var(--ink)]">
            {selected ? `Last ${limit} requests` : "No tunnels"}
          </h2>
          {selected && (
            <span className="inline-flex items-center gap-2 text-[15px] text-[color:var(--ink-muted)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    selected.status === "online" ? "var(--brand)" : "var(--ink-muted)",
                }}
                aria-hidden
              />
              {selected.status}
            </span>
          )}
        </div>
        <div
          data-rise
          className="mt-5 overflow-hidden rounded-md bg-[color:var(--surface-2)]"
        >
          <RequestTable requests={reqs.requests} tunnelId={selected?.tunnel_id} linkToDetail />
        </div>
      </div>

      {reqs.requests.length > 0 && (
        <>
          <div>
            <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
              This window
            </h2>
            <div data-rise className="mt-5">
              <StatBoard
                stats={[
                  { label: "Requests", value: String(reqs.requests.length) },
                  {
                    label: "Errors",
                    value: String(reqs.requests.filter((r) => r.status_code >= 400).length),
                    alert: reqs.requests.some((r) => r.status_code >= 400),
                  },
                  {
                    label: "Median latency",
                    value: `${(() => {
                      const d = reqs.requests.map((r) => r.duration_ms).sort((a, b) => a - b);
                      return d[Math.floor(d.length / 2)];
                    })()} ms`,
                  },
                ]}
              />
            </div>
          </div>

          <div>
            <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">
              By status
            </h2>
            <div
              data-rise
              data-ui
              className="mt-5 rounded-md p-6 sm:p-8"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <ul className="space-y-4">
                {[
                  { label: "2xx success", test: (c: number) => c >= 200 && c < 300 },
                  { label: "3xx redirect", test: (c: number) => c >= 300 && c < 400 },
                  { label: "4xx client error", test: (c: number) => c >= 400 && c < 500 },
                  { label: "5xx server error", test: (c: number) => c >= 500 },
                ].map((band) => {
                  const count = reqs.requests.filter((r) => band.test(r.status_code)).length;
                  const pct = (count / reqs.requests.length) * 100;
                  return (
                    <li key={band.label} className="flex items-center gap-4">
                      <span className="w-40 shrink-0 text-[15px] text-[color:var(--ink-muted)]">
                        {band.label}
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
                      <span className="w-12 shrink-0 text-right text-[15px] text-[color:var(--ink)] [font-variant-numeric:tabular-nums]">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <div>
            <h2 data-rise className="text-[20px] font-medium text-[color:var(--ink)]">Top paths</h2>
            <div
              data-rise
              data-ui
              className="mt-5 rounded-md p-6 sm:p-8"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              <ul className="space-y-4">
                {Object.entries(
                  reqs.requests.reduce<Record<string, number>>((acc, r) => {
                    const key = r.path.split("?")[0];
                    acc[key] = (acc[key] ?? 0) + 1;
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([path, count]) => (
                    <li key={path} className="flex items-baseline justify-between gap-6">
                      <span className="break-all text-[15px] text-[color:var(--ink)]">{path}</span>
                      <span className="shrink-0 text-[15px] text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums]">
                        {count}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Reveal>
  );
}
