import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C, easeOut, monospace, sans } from "../theme";

const WORD = "IndoTunnel";
const TAGLINE = "localhost, live on the internet.";

export const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const underline = interpolate(frame, [fps * 0.9, fps * 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...easeOut),
  });
  const tagline = interpolate(frame, [fps * 1.5, fps * 2.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(...easeOut),
  });

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", fontFamily: sans }}
    >
      <div style={{ display: "flex", position: "relative", paddingBottom: 26 }}>
        {WORD.split("").map((ch, i) => {
          const start = fps * (i * 0.055 - 0.12);
          const appear = interpolate(frame, [start, start + fps * 0.32], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(...easeOut),
          });
          return (
            <span
              key={`${ch}-${i}`}
              style={{
                fontSize: 168,
                fontWeight: 600,
                letterSpacing: "-0.035em",
                color: C.ink,
                opacity: appear,
                translate: interpolate(appear, [0, 1], ["0px 30px", "0px 0px"], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {ch}
            </span>
          );
        })}

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 8,
            width: `${underline * 100}%`,
            borderRadius: 999,
            backgroundColor: C.brand,
            boxShadow: `0 0 40px ${C.brand}88`,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 44,
          fontSize: 52,
          fontFamily: monospace,
          color: C.inkMuted,
          opacity: tagline,
          translate: interpolate(tagline, [0, 1], ["0px 18px", "0px 0px"], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {TAGLINE}
      </div>
    </AbsoluteFill>
  );
};
