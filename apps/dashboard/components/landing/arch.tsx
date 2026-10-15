interface ArchProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * The tunnel-mouth motif. One shape, reused at every scale: the stage the
 * product's interface sits on, panel masks, and the full-width band.
 */
export function Arch({ children, className }: ArchProps) {
  return (
    <div className={className ? `arch ${className}` : "arch"}>{children}</div>
  );
}
