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
    <div className="min-h-svh">
      <Nav />
      <LiveRefresher />
      <main className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">{children}</main>
    </div>
  );
}
