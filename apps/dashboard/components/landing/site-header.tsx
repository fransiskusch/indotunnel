"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-colors"
      style={{
        backgroundColor: scrolled ? "var(--bg)" : "transparent",
        transitionDuration: "var(--t-ui)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="text-lg font-medium tracking-tight text-[color:var(--ink)]"
        >
          IndoTunnel
        </Link>

        <nav className="hidden items-center gap-8 text-[15px] md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
              style={{ transitionDuration: "var(--t-hover)" }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="hidden rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97] sm:block"
            style={{ transitionDuration: "var(--t-press)" }}
          >
            Dashboard
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          >
            <span
              className="block h-0.5 w-5 bg-[color:var(--ink)] transition-transform"
              style={{ transform: open ? "translateY(4px) rotate(45deg)" : "none" }}
            />
            <span
              className="block h-0.5 w-5 bg-[color:var(--ink)] transition-transform"
              style={{
                transform: open ? "translateY(-4px) rotate(-45deg)" : "none",
                opacity: open ? 0 : 1,
              }}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="bg-[color:var(--bg)] md:hidden"
      >
        <nav className="mx-auto flex max-w-6xl flex-col px-5 py-4 sm:px-8">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="py-3 text-base text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-3 rounded-md bg-[color:var(--brand)] px-4 py-3 text-center text-sm font-medium text-[color:var(--brand-ink)]"
          >
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
