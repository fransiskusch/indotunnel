import { Nav } from "@/components/nav";
import { LiveRefresher } from "@/components/live-refresher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <LiveRefresher />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
