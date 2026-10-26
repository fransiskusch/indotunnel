import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, easeOut, monospace } from "../theme";
import { Caret, Terminal } from "../ui/Terminal";

const COMMAND = "npx indotunnel 3000";

const ROWS: { label: string; value: string; accent?: boolean }[] = [
  { label: "Status:", value: "Connected" },
  { label: "Local:", value: "http://127.0.0.1:3000" },
  { label: "Public:", value: "https://a8f2x.indotunnel.ai.id", accent: true },
  { label: "Region:", value: "jakarta" },
  { label: "Plan:", value: "Free" },
];

const ROW_START = 0.25;
const ROW_GAP = 0.34;

export const ScenePublicUrl: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Terminal title="~/projects/my-app">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 40,
            fontFamily: monospace,
            color: C.inkMuted,
            marginBottom: 34,
          }}
        >
          <span style={{ color: C.brand, marginRight: 16 }}>❯</span>
          <span>{COMMAND}</span>
        </div>

        {ROWS.map((row, i) => {
          const start = (ROW_START + i * ROW_GAP) * fps;
          const appear = interpolate(frame, [start, start + fps * 0.35], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...easeOut),
          });

          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                gap: 24,
                fontSize: row.accent ? 44 : 38,
                fontFamily: monospace,
                lineHeight: 1.6,
                opacity: appear,
                translate: interpolate(
                  appear,
                  [0, 1],
                  ["-14px 0px", "0px 0px"],
                  { extrapolateRight: "clamp" },
                ),
              }}
            >
              <span style={{ color: C.inkMuted, width: 190 }}>{row.label}</span>
              <span
                style={{
                  color: row.accent ? C.brand : C.ink,
                  fontWeight: row.accent ? 700 : 400,
                  textShadow: row.accent
                    ? `0 0 42px ${C.brand}66`
                    : undefined,
                }}
              >
                {row.value}
              </span>
            </div>
          );
        })}

        <div
          style={{
            marginTop: 34,
            fontSize: 30,
            fontFamily: monospace,
            color: C.inkMuted,
            opacity: interpolate(
              frame,
              [fps * 3.1, fps * 3.6],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          Press Ctrl+C to stop
          <Caret visible={Math.floor(frame / (fps / 3)) % 2 === 0} />
        </div>
      </Terminal>
    </AbsoluteFill>
  );
};
