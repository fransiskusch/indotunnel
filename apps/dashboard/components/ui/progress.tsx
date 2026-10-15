import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: "var(--surface-3)" }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{
          width: `${pct}%`,
          backgroundColor: pct >= 90 ? "var(--danger)" : "var(--brand)",
          transitionDuration: "var(--t-ui)",
        }}
      />
    </div>
  );
}
