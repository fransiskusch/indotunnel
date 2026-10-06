"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api";
import { Terminal, BarChart3, Activity } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Activity },
  { href: "/requests", label: "Requests", icon: Terminal },
  { href: "/usage", label: "Usage", icon: BarChart3 },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    try {
      await logout();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="font-mono text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              IndoTunnel
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v1.0
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const Icon = l.icon;
              const isActive = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    isActive
                      ? "bg-zinc-800/60 text-emerald-400 border border-zinc-700/50"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-emerald-400" : "text-zinc-500")} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors hidden sm:inline-block"
          >
            Landing Page
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={onLogout}
          >
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
