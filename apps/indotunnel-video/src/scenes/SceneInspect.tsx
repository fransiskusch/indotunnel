import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, easeOut, monospace, sans } from "../theme";

const ROWS: { method: string; path: string; status: number }[] = [
  { method: "POST", path: "/webhooks/stripe", status: 201 },
  { method: "GET", path: "/api/orders/8812", status: 200 },
  { method: "POST", path: "/api/checkout", status: 200 },
  { method: "GET", path: "/health", status: 200 },
  { method: "POST", path: "/webhooks/github", status: 202 },
];

const ROW_START = 0.3;
const ROW_GAP = 0.42;
const HIGHLIGHT_ROW = 2;
const REPLAY_AT = 4.4;

const statusColor = (s: number) =>
  s < 300 ? C.brand : s < 400 ? C.warn : C.danger;

const methodColor = (m: string) => (m === "GET" ? C.inkMuted : C.brand);

export const SceneInspect: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const replayT = interpolate(
    frame,
    [fps * REPLAY_AT, fps * (REPLAY_AT + 0.8)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", fontFamily: sans }}
    >
      <div
        style={{
          width: 1400,
          borderRadius: 20,
          backgroundColor: C.surface2,
          border: `1px solid ${C.surface3}`,
          boxShadow: "0 60px 120px rgba(0,0,0,0.55)",
          overflow: "hidden",
          translate: interpolate(frame, [0, fps * 0.8], ["60px 0px", "0px 0px"], {
            extrapolateRight: "clamp",
            easing: Easing.bezier(...easeOut),
          }),
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 34px",
            backgroundColor: C.surface3,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: C.brand,
                boxShadow: `0 0 16px ${C.brand}`,
              }}
            />
            <span style={{ fontSize: 30, color: C.ink }}>Requests</span>
          </div>
          <span
            style={{
              fontFamily: monospace,
              fontSize: 24,
              color: C.inkMuted,
            }}
          >
            a8f2x.indotunnel.ai.id
          </span>
        </div>

        {/* rows */}
        <div style={{ padding: "10px 0 18px" }}>
          {ROWS.map((row, i) => {
            const start = (ROW_START + i * ROW_GAP) * fps;
            const appear = interpolate(frame, [start, start + fps * 0.35], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(...easeOut),
            });
            const isHi = i === HIGHLIGHT_ROW;
            const flash = isHi ? replayT : 0;

            return (
              <div
                key={row.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  padding: "22px 34px",
                  fontFamily: monospace,
                  fontSize: 28,
                  opacity: appear,
                  translate: interpolate(appear, [0, 1], ["-20px 0px", "0px 0px"], {
                    extrapolateRight: "clamp",
                  }),
                  backgroundColor: isHi
                    ? `rgba(16,185,129,${0.06 + flash * 0.18})`
                    : "transparent",
                  borderLeft: `3px solid ${
                    isHi ? `rgba(16,185,129,${0.4 + flash * 0.6})` : "transparent"
                  }`,
                }}
              >
                <span
                  style={{
                    width: 96,
                    color: methodColor(row.method),
                    fontWeight: 700,
                    fontSize: 24,
                  }}
                >
                  {row.method}
                </span>
                <span style={{ flex: 1, color: C.ink }}>{row.path}</span>
                <span
                  style={{
                    color: statusColor(row.status),
                    fontWeight: 700,
                    width: 74,
                    textAlign: "right",
                  }}
                >
                  {row.status}
                </span>
                {isHi ? (
                  <span
                    style={{
                      marginLeft: 26,
                      padding: "8px 22px",
                      borderRadius: 10,
                      fontSize: 22,
                      fontFamily: sans,
                      fontWeight: 600,
                      backgroundColor: flash > 0 ? C.brand : C.surface3,
                      color: flash > 0 ? C.brandInk : C.inkMuted,
                    }}
                  >
                    {flash > 0.5 ? "Replayed" : "Replay"}
                  </span>
                ) : (
                  <span style={{ width: 118 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
