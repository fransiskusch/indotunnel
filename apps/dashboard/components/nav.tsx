"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/api";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/requests", label: "Requests" },
  { href: "/usage", label: "Usage" },
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
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <span className="font-semibold">IndoTunnel</span>
        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-muted-foreground hover:text-foreground",
                pathname === l.href && "text-foreground font-medium"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" className="ml-auto" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
