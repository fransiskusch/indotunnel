import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, easeOut, monospace, sans } from "../theme";

/** Packets travel laptop -> globe along the connector. */
const PROTOCOLS = ["HTTP/2", "WebSocket", "SSE"];
const PACKET_COUNT = 3;
const CYCLE = 1.4;

const Node: React.FC<{
  label: string;
  sub: string;
  children: React.ReactNode;
  appear: number;
}> = ({ label, sub, children, appear }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        opacity: appear,
        scale: interpolate(appear, [0, 1], [0.85, 1], {
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        }),
      }}
    >
      <div
        style={{
          width: 190,
          height: 190,
          borderRadius: 40,
          backgroundColor: C.surface2,
          border: `1px solid ${C.surface3}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.ink,
        }}
      >
        {children}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 34, color: C.ink, fontWeight: 500 }}>{label}</div>
        <div
          style={{ fontSize: 24, color: C.inkMuted, fontFamily: monospace }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
};

const LaptopIcon: React.FC = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="5"
      width="18"
      height="12"
      rx="2"
      stroke={C.ink}
      strokeWidth="1.5"
    />
    <path d="M2 20h20" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const GlobeIcon: React.FC = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={C.brand} strokeWidth="1.5" />
    <ellipse cx="12" cy="12" rx="4" ry="9" stroke={C.brand} strokeWidth="1.5" />
    <path d="M3 12h18" stroke={C.brand} strokeWidth="1.5" />
  </svg>
);

export const SceneTunnel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const laptopIn = interpolate(frame, [0, fps * 0.45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...easeOut),
  });
  const globeIn = interpolate(frame, [fps * 0.25, fps * 0.85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...easeOut),
  });
  const lineIn = interpolate(frame, [fps * 0.7, fps * 1.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...easeOut),
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        fontFamily: sans,
        gap: 60,
      }}
    >
      <div
        style={{
          fontSize: 84,
          fontWeight: 500,
          color: C.ink,
          letterSpacing: "-0.02em",
        }}
      >
        One persistent connection
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <Node label="localhost" sub=":3000" appear={laptopIn}>
          <LaptopIcon />
        </Node>

        {/* connector */}
        <div
          style={{
            position: "relative",
            width: 520,
            height: 190,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: C.surface3,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              height: 2,
              width: `${lineIn * 100}%`,
              backgroundColor: C.brand,
              boxShadow: `0 0 24px ${C.brand}aa`,
            }}
          />

          {Array.from({ length: PACKET_COUNT }).map((_, i) => {
            const t = ((frame / fps + (i * CYCLE) / PACKET_COUNT) % CYCLE) / CYCLE;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${t * 100}%`,
                  width: 16,
                  height: 16,
                  marginLeft: -8,
                  borderRadius: 999,
                  backgroundColor: C.brand,
                  boxShadow: `0 0 22px ${C.brand}`,
                  opacity: lineIn * interpolate(t, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
                }}
              />
            );
          })}
        </div>

        <Node label="indotunnel.ai.id" sub="edge gateway" appear={globeIn}>
          <GlobeIcon />
        </Node>
      </div>

      <div style={{ display: "flex", gap: 26 }}>
        {PROTOCOLS.map((p, i) => {
          const start = fps * (1.6 + i * 0.28);
          return (
            <div
              key={p}
              style={{
                padding: "14px 30px",
                borderRadius: 999,
                border: `1px solid ${C.surface3}`,
                backgroundColor: C.surface2,
                color: C.inkMuted,
                fontFamily: monospace,
                fontSize: 26,
                opacity: interpolate(frame, [start, start + fps * 0.4], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {p}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
