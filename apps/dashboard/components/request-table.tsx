import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes } from "@/components/usage-bars";
import type { RequestLog } from "@/lib/api";

function statusColour(code: number) {
  if (code >= 500) return "var(--danger)";
  if (code >= 400) return "var(--warn)";
  if (code >= 300) return "var(--ink-muted)";
  return "var(--brand)";
}

export function RequestTable({
  requests,
  tunnelId,
  linkToDetail = false,
}: {
  requests: RequestLog[];
  tunnelId?: string;
  linkToDetail?: boolean;
}) {
  if (!requests || requests.length === 0) {
    return (
      <p className="px-6 py-10 text-[16px] text-[color:var(--ink-muted)]">
        No requests yet. Traffic shows up here the moment your local server
        answers.
      </p>
    );
  }
  return (
    <div data-ui className="w-full">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Path</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Duration</TableHead>
          <TableHead className="hidden sm:table-cell">Size</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.request_id}>
            <TableCell className="whitespace-nowrap text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums]">
              {new Date(r.started_at).toLocaleTimeString()}
            </TableCell>
            <TableCell className="font-medium">{r.method}</TableCell>
            <TableCell className="max-w-xs truncate">
              {linkToDetail && tunnelId ? (
                <Link
                  href={`/requests/${r.request_id}?tunnel=${tunnelId}`}
                  className="text-[color:var(--ink)] underline decoration-[color:var(--ink-muted)] underline-offset-4 transition-colors hover:decoration-[color:var(--brand)]"
                >
                  {r.path}
                </Link>
              ) : (
                r.path
              )}
            </TableCell>
            <TableCell
              className="font-medium [font-variant-numeric:tabular-nums]"
              style={{ color: statusColour(r.status_code) }}
            >
              {r.status_code}
            </TableCell>
            <TableCell className="hidden text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums] sm:table-cell">
              {r.duration_ms} ms
            </TableCell>
            <TableCell className="hidden text-[color:var(--ink-muted)] [font-variant-numeric:tabular-nums] sm:table-cell">
              {formatBytes(r.response_bytes)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      </Table>
    </div>
  );
}
