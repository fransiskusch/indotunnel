import { Nav } from "@/components/nav";
import { LiveRefresher } from "@/components/live-refresher";
import { serverFetch, ApiError } from "@/lib/api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    await serverFetch("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    throw err;
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <LiveRefresher />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
