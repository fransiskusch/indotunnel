import { serverFetch } from "@/lib/api";
import type { Tunnel, RequestLog } from "@/lib/api";
import { RequestTable } from "@/components/request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
      <h1 className="text-2xl font-semibold">Requests</h1>

      {tunnels.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {tunnels.map((t) => (
            <Link
              key={t.tunnel_id}
              href={`/requests?tunnel=${t.tunnel_id}`}
              className={`rounded-md border px-3 py-1 ${
                selected?.tunnel_id === t.tunnel_id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {t.subdomain}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selected ? `${selected.subdomain} — last ${limit}` : "No tunnel"}
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
