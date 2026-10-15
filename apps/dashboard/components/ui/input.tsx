import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md bg-[color:var(--bg)] px-3.5 py-2 text-[15px] text-[color:var(--ink)] transition-colors placeholder:text-[color:var(--ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
