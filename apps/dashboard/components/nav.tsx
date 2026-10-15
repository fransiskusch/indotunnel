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

const FOCUS =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]";

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
    <header className="sticky top-0 z-50" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 sm:px-8 md:h-16">
        <Link
          href="/"
          className={cn(
            "text-[18px] font-medium tracking-tight text-[color:var(--ink)]",
            FOCUS,
          )}
        >
          IndoTunnel
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {links.map((l) => {
            const isActive = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-[16px] transition-colors",
                  isActive
                    ? "text-[color:var(--ink)]"
                    : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]",
                  FOCUS,
                )}
                style={{ transitionDuration: "var(--t-hover)" }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* The one action, in the bar at every width. Keeping it here is what
            lets the phone row below stay a single line. */}
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Log out
        </Button>
      </div>

      {/* Phone navigation: one row of section links under the bar. One line, so
          the sticky header keeps its height on a small screen. */}
      <nav
        className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 pb-2.5 sm:px-8 md:hidden"
        aria-label="Sections"
      >
        {links.map((l) => {
          const isActive = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "whitespace-nowrap text-[15px] transition-colors",
                isActive
                  ? "text-[color:var(--ink)]"
                  : "text-[color:var(--ink-muted)]",
                FOCUS,
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
