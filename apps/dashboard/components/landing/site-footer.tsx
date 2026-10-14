import Link from "next/link";
import { Terminal } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#quickstart", label: "Quickstart" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "#ai", label: "AI Capabilities" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/login", label: "Sign In" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/", label: "Home" },
      { href: "/signup", label: "Get Started" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-slate-950 py-14">
      <Reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Terminal className="h-5 w-5" />
              </div>
              <span className="font-mono text-lg font-bold tracking-tight text-white">
                IndoTunnel
              </span>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed text-zinc-400">
              Expose localhost to the internet in seconds. Built for developer
              velocity.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="space-y-3">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-xs text-zinc-400 transition-colors hover:text-emerald-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-zinc-800/80 pt-8 md:flex-row">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-zinc-200">IndoTunnel Gateways Operational</span>
          </div>
          <p className="font-mono text-xs text-zinc-400">
            © {new Date().getFullYear()} IndoTunnel Inc. All rights reserved.
          </p>
        </div>
      </Reveal>
    </footer>
  );
}
