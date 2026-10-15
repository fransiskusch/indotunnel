import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--brand)] text-[color:var(--brand-ink)]",
        secondary: "bg-[color:var(--surface-3)] text-[color:var(--ink-muted)]",
        destructive: "bg-[color:var(--danger-surface)] text-[color:var(--danger)]",
        outline: "bg-[color:var(--surface-3)] text-[color:var(--ink-muted)]",
        success: "bg-[color:var(--brand)] text-[color:var(--brand-ink)]",
        warn: "bg-[color:var(--warn-surface)] text-[color:var(--warn)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
