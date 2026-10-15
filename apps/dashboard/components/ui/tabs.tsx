"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  children,
}: {
  tabs: string[];
  children: (active: string) => React.ReactNode;
}) {
  const [active, setActive] = React.useState(tabs[0]);
  return (
    <div>
      <div
        className="inline-flex items-center gap-1 rounded-md p-1"
        style={{ backgroundColor: "var(--surface-3)" }}
        role="tablist"
      >
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={active === t}
            onClick={() => setActive(t)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded px-3.5 py-1.5 text-[15px] font-medium transition-colors",
              active === t
                ? "bg-[color:var(--ink)] text-[color:var(--bg)]"
                : "text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-6">{children(active)}</div>
    </div>
  );
}
