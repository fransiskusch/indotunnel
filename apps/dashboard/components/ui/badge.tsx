import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        secondary: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
        destructive: "border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border-zinc-700 text-zinc-300",
        success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-semibold shadow-[0_0_12px_rgba(16,185,129,0.2)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
