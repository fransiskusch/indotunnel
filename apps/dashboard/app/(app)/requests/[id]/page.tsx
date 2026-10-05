import { serverFetch } from "@/lib/api";
import type { RequestLog } from "@/lib/api";
import { RequestDetail } from "@/components/request-detail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tunnel?: string }>;
}) {
  const { id } = await params;
  const { tunnel } = await searchParams;
  if (!tunnel) notFound();

  let request: RequestLog;
  try {
    request = await serverFetch<RequestLog>(`/tunnels/${tunnel}/requests/${id}`);
  } catch {
    notFound();
  }

  return <RequestDetail request={request} tunnelId={tunnel} />;
}
