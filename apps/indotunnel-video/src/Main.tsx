import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Track,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "./theme";
import { Ground } from "./ui/Ground";
import { SceneTypeCommand } from "./scenes/SceneTypeCommand";
import { ScenePublicUrl } from "./scenes/ScenePublicUrl";
import { SceneTunnel } from "./scenes/SceneTunnel";
import { SceneInspect } from "./scenes/SceneInspect";
import { SceneStats } from "./scenes/SceneStats";
import { SceneLogo } from "./scenes/SceneLogo";

/** Scene boundaries in frames at 30fps. */
export const SCENES = {
  command: { from: 0, duration: 120 },
  url: { from: 120, duration: 150 },
  tunnel: { from: 270, duration: 180 },
  inspect: { from: 450, duration: 210 },
  stats: { from: 660, duration: 120 },
  logo: { from: 780, duration: 120 },
} as const;

export const TOTAL_FRAMES = SCENES.logo.from + SCENES.logo.duration;

/**
 * Whole-video fade only. Scenes cut straight between each other: a per-scene
 * fade would stack two 0.5s dips onto the same cut and read as dead air.
 */
const VideoFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(
          frame,
          [0, fps * 0.5, TOTAL_FRAMES - fps * 0.5, TOTAL_FRAMES - 1],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  return (
    <VideoFade>
      <AbsoluteFill style={{ backgroundColor: C.bg }}>
        <Ground />
        <Track name="Scenes">
          <Sequence
            name="1 · Type the command"
            from={SCENES.command.from}
            durationInFrames={SCENES.command.duration}
          >
            <SceneTypeCommand />
          </Sequence>

          <Sequence
            name="2 · Public URL"
            from={SCENES.url.from}
            durationInFrames={SCENES.url.duration}
          >
            <ScenePublicUrl />
          </Sequence>

          <Sequence
            name="3 · Tunnel"
            from={SCENES.tunnel.from}
            durationInFrames={SCENES.tunnel.duration}
          >
            <SceneTunnel />
          </Sequence>

          <Sequence
            name="4 · Inspect and replay"
            from={SCENES.inspect.from}
            durationInFrames={SCENES.inspect.duration}
          >
            <SceneInspect />
          </Sequence>

          <Sequence
            name="5 · Usage"
            from={SCENES.stats.from}
            durationInFrames={SCENES.stats.duration}
          >
            <SceneStats />
          </Sequence>

          <Sequence
            name="6 · Logo"
            from={SCENES.logo.from}
            durationInFrames={SCENES.logo.duration}
          >
            <SceneLogo />
          </Sequence>
        </Track>
      </AbsoluteFill>
    </VideoFade>
  );
};
