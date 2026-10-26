import React from "react";
import { C, monospace } from "../theme";

/** Terminal chrome: title bar with three dots and a label. */
export const Terminal: React.FC<{
  title?: string;
  width?: number;
  children?: React.ReactNode;
}> = ({ title = "indotunnel", width = 1180, children }) => {
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        backgroundColor: C.surface2,
        border: `1px solid ${C.surface3}`,
        boxShadow: "0 60px 120px rgba(0,0,0,0.55)",
        overflow: "hidden",
        fontFamily: monospace,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 24px",
          backgroundColor: C.surface3,
        }}
      >
        {["#f87171", "#fbbf24", "#10b981"].map((c) => (
          <span
            key={c}
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: c,
              opacity: 0.75,
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 12,
            fontSize: 22,
            color: C.inkMuted,
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: "36px 44px 44px" }}>{children}</div>
    </div>
  );
};

/** A caret that blinks on a 2-frame-on / 2-frame-off cadence. */
export const Caret: React.FC<{ visible: boolean }> = ({ visible }) => {
  return (
    <span
      style={{
        display: "inline-block",
        width: 18,
        height: 40,
        marginLeft: 4,
        verticalAlign: "text-bottom",
        backgroundColor: C.brand,
        opacity: visible ? 1 : 0,
      }}
    />
  );
};
