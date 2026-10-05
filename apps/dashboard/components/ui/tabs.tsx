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
      <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
              active === t && "bg-background text-foreground shadow"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-4">{children(active)}</div>
    </div>
  );
}
