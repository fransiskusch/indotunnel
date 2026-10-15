"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/requests", label: "Requests" },
  { href: "/usage", label: "Usage" },
  { href: "/settings", label: "Settings" },
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
    <header
      className="sticky top-0 z-50"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-[18px] font-medium tracking-tight text-[color:var(--ink)]">
            IndoTunnel
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => {
              const isActive = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "text-[16px] transition-colors",
                    isActive
                      ? "text-[color:var(--ink)]"
                      : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]",
                  )}
                  style={{ transitionDuration: "var(--t-hover)" }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={onLogout}
          >
            Log out
          </Button>
        </div>
      </div>

      {/* Phone navigation: a plain row of links under the wordmark. */}
      <nav
        className="flex flex-wrap gap-x-6 gap-y-2 px-5 pb-3 sm:px-8 md:hidden"
        aria-label="Dashboard sections"
      >
        {links.map((l) => {
          const isActive = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "whitespace-nowrap text-[16px] transition-colors",
                isActive
                  ? "text-[color:var(--ink)]"
                  : "text-[color:var(--ink-muted)]",
              )}
            >
              {l.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onLogout}
          className="whitespace-nowrap text-[16px] text-[color:var(--ink-muted)] sm:hidden"
        >
          Log out
        </button>
      </nav>
    </header>
  );
}
