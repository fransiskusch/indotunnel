import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#how-it-works", label: "How it works" },
      { href: "#pricing", label: "Pricing" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Get started" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/", label: "Home" },
      { href: "#showcase", label: "Inspector" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer style={{ backgroundColor: "var(--surface-2)" }}>
      <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div
              className="font-medium leading-[0.9] tracking-[-0.03em] text-[color:var(--ink)]"
              style={{ fontSize: "var(--step-head)" }}
            >
              IndoTunnel
            </div>
            <p className="mt-6 max-w-[36ch] text-[16px] text-[color:var(--ink-muted)]">
              Expose localhost to the internet in seconds. Built for developer
              velocity.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h3 className="text-[16px] font-medium text-[color:var(--ink)]">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[16px] text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 text-[16px] text-[color:var(--ink-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--brand)" }}
              aria-hidden
            />
            IndoTunnel gateways operational
          </div>
          <p className="text-[16px] text-[color:var(--ink-muted)]">
            © {new Date().getFullYear()} IndoTunnel Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
