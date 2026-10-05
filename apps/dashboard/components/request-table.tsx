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
    return <p className="text-sm text-muted-foreground">No requests yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Path</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Size</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.request_id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {new Date(r.started_at).toLocaleTimeString()}
            </TableCell>
            <TableCell className="font-mono">{r.method}</TableCell>
            <TableCell className="max-w-xs truncate font-mono">
              {linkToDetail && tunnelId ? (
                <Link href={`/requests/${r.request_id}?tunnel=${tunnelId}`} className="underline">
                  {r.path}
                </Link>
              ) : (
                r.path
              )}
            </TableCell>
            <TableCell>{r.status_code}</TableCell>
            <TableCell>{r.duration_ms} ms</TableCell>
            <TableCell>{formatBytes(r.response_bytes)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
