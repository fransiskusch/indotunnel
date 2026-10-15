import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[15px] font-medium transition-[transform,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--brand)] text-[color:var(--brand-ink)] hover:brightness-110",
        secondary: "bg-[color:var(--surface-3)] text-[color:var(--ink)] hover:bg-[color:var(--surface-hover)]",
        outline: "bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--surface-3)]",
        ghost: "bg-transparent text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--surface-3)]",
        destructive: "bg-[color:var(--danger-surface)] text-[color:var(--danger)] hover:brightness-125",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-[14px]",
        lg: "h-12 px-6 text-[16px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
