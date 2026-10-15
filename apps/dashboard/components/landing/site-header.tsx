"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FOCUS =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]";

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

  // Solid ground whenever the panel is open: an opaque menu over a transparent
  // bar would sit directly on the hero with nothing separating them.
  const solid = scrolled || open;

  return (
    <header className="sticky top-0 z-50">
      <div
        className="relative transition-colors"
        style={{
          backgroundColor: solid ? "var(--bg)" : "transparent",
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

          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-8 text-[16px] md:flex">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={
                    "text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)] " +
                    FOCUS
                  }
                  style={{ transitionDuration: "var(--t-hover)" }}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <Link
              href="/dashboard"
              className="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-[color:var(--brand-ink)] transition-transform active:scale-[0.97]"
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
              className="-mr-2 flex h-11 w-11 flex-col items-center justify-center gap-[5px] md:hidden"
            >
              <span
                className="block h-[1.5px] w-5 bg-[color:var(--ink)] transition-transform"
                style={{
                  transitionDuration: "var(--t-ui)",
                  transform: open ? "translateY(3.25px) rotate(45deg)" : "none",
                }}
              />
              <span
                className="block h-[1.5px] w-5 bg-[color:var(--ink)] transition-transform"
                style={{
                  transitionDuration: "var(--t-ui)",
                  transform: open ? "translateY(-3.25px) rotate(-45deg)" : "none",
                }}
              />
            </button>
          </div>
        </div>

        {/* Overlays the page instead of joining the flow, so opening the menu
            never shifts the content below it. Positioning and the closed
            state live in CSS behind the .js gate: without JS the panel stays
            in the flow and visible, so the links are still reachable. */}
        <div
          id="mobile-nav"
          data-open={open}
          className="nav-panel md:hidden"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <nav className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={
                  "flex min-h-11 items-center text-[16px] text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)] " +
                  FOCUS
                }
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
