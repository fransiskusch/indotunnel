# indotunnel-video

Remotion launch video for IndoTunnel. Renders the 30-second 16:9 product demo
described in the video brief: CLI command, public URL, tunnel diagram, request
inspector with replay, usage stats, logo.

```bash
npm i
npm run dev      # Remotion Studio at http://localhost:3000
npm run render   # out/launch.mp4
```

## Composition

`Launch` — 1920×1080, 30fps, 900 frames (30s).

| Scene | Frames | Seconds | File |
|---|---|---|---|
| 1 · Type the command | 0–120 | 0–4 | `src/scenes/SceneTypeCommand.tsx` |
| 2 · Public URL | 120–270 | 4–9 | `src/scenes/ScenePublicUrl.tsx` |
| 3 · Tunnel | 270–450 | 9–15 | `src/scenes/SceneTunnel.tsx` |
| 4 · Inspect and replay | 450–660 | 15–22 | `src/scenes/SceneInspect.tsx` |
| 5 · Usage | 660–780 | 22–26 | `src/scenes/SceneStats.tsx` |
| 6 · Logo | 780–900 | 26–30 | `src/scenes/SceneLogo.tsx` |

Scene boundaries live in `SCENES` in `src/Main.tsx`; `TOTAL_FRAMES` derives from
them, so changing a duration updates the composition automatically.

## Brand

`src/theme.ts` mirrors the CSS custom properties in
`apps/dashboard/app/globals.css` — same ground, ink, accent and easing curve.
Change them there first, then here.

## Notes

- All copy is real HTML/SVG, so text is pixel-exact. This is why the video is
  programmatic instead of AI-generated: video models cannot render readable
  terminal output.
- Silent by design. Add a voiceover or music track in post.
- Whole-video fade only; scenes cut straight. A per-scene fade stacks two dips
  on each cut and reads as dead air.
