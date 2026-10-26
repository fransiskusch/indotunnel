import React from "react";
import { AbsoluteFill } from "remotion";
import { C, sans } from "../theme";

/** A soft radial vignette, matching the landing page's ground. */
export const Ground: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: sans }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, ${C.surface2} 0%, ${C.bg} 62%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
