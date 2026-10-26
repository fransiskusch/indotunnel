import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, easeOut, monospace, sans } from "../theme";

const CARDS: { value: string; label: string; suffix?: string }[] = [
  { value: "5,000", label: "requests per day", suffix: "" },
  { value: "1", label: "active tunnel", suffix: "" },
  { value: "0", label: "config files", suffix: "" },
];

/** Counts from 0 to the numeric part of `value` over `dur` frames. */
const CountUp: React.FC<{ value: string; progress: number }> = ({
  value,
  progress,
}) => {
  const numeric = Number(value.replace(/,/g, ""));
  const shown = Math.round(numeric * progress);
  return <>{shown.toLocaleString("en-US")}</>;
};

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        fontFamily: sans,
        gap: 80,
      }}
    >
      <div
        style={{
          fontSize: 76,
          color: C.ink,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        Free forever. No expiry.
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        {CARDS.map((card, i) => {
          const start = fps * (0.35 + i * 0.3);
          const appear = interpolate(frame, [start, start + fps * 0.55], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...easeOut),
          });
          const count = interpolate(
            frame,
            [start, start + fps * 1.1],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...easeOut),
            },
          );

          return (
            <div
              key={card.label}
              style={{
                width: 380,
                padding: "54px 44px",
                borderRadius: 18,
                backgroundColor: C.surface2,
                border: `1px solid ${C.surface3}`,
                opacity: appear,
                scale: interpolate(appear, [0, 1], [0.88, 1], {
                  extrapolateRight: "clamp",
                  output: "perceptual-scale",
                }),
                translate: interpolate(appear, [0, 1], ["0px 26px", "0px 0px"], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              <div
                style={{
                  fontSize: 104,
                  fontWeight: 500,
                  color: C.brand,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <CountUp value={card.value} progress={count} />
              </div>
              <div
                style={{
                  marginTop: 22,
                  fontSize: 30,
                  color: C.inkMuted,
                  fontFamily: monospace,
                }}
              >
                {card.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
