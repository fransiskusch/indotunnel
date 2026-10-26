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

/** How long the caret sits idle before the first keystroke. */
const LEAD_IN = 0.6;
/** Seconds between keystrokes. */
const KEY_GAP = 0.055;

export const SceneTypeCommand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chars = Math.floor(
    Math.max(0, frame / fps - LEAD_IN) / KEY_GAP,
  );
  const typed = COMMAND.slice(0, Math.min(chars, COMMAND.length));
  const done = typed.length === COMMAND.length;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          translate: interpolate(
            frame,
            [0, 4 * fps],
            ["0px 40px", "0px 0px"],
            { extrapolateRight: "clamp", easing: Easing.bezier(...easeOut) },
          ),
          scale: interpolate(
            frame,
            [0, 4 * fps],
            [0.94, 1],
            {
              extrapolateRight: "clamp",
              easing: Easing.bezier(...easeOut),
              output: "perceptual-scale",
            },
          ),
        }}
      >
        <Terminal title="~/projects/my-app">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 46,
              fontFamily: monospace,
              color: C.ink,
            }}
          >
            <span style={{ color: C.brand, marginRight: 18 }}>❯</span>
            <span>{typed}</span>
            <Caret visible={done ? Math.floor(frame / (fps / 3)) % 2 === 0 : true} />
          </div>
        </Terminal>
      </div>
    </AbsoluteFill>
  );
};
