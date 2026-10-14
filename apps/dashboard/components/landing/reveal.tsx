import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Scroll-reveal is CSS-driven so the server-rendered HTML never ships content
 * hidden behind an inline opacity:0. Reduced-motion users and no-JS users both
 * get the visible end state; see `.reveal` in globals.css.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <div
      className={className ? `reveal ${className}` : "reveal"}
      style={{ "--reveal-delay": `${delay}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function Stagger({ children, className }: RevealProps) {
  return <div className={`stagger ${className ?? ""}`.trim()}>{children}</div>;
}

export function StaggerItem({ children, className }: RevealProps) {
  return <div className={className ? `reveal ${className}` : "reveal"}>{children}</div>;
}
