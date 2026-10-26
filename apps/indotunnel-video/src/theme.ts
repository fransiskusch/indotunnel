import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const inter = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

const mono = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const sans = inter.fontFamily;
export const monospace = mono.fontFamily;

// Mirrors apps/dashboard/app/globals.css so the video matches the product.
export const C = {
  bg: "#0b0f14",
  surface2: "#12171f",
  surface3: "#1a212b",
  ink: "#f4f6f8",
  inkMuted: "#98a2b1",
  brand: "#10b981",
  brandInk: "#04140d",
  danger: "#f87171",
  warn: "#fbbf24",
} as const;

export const W = 1920;
export const H = 1080;

/** Ease used across the landing page: cubic-bezier(0.22, 1, 0.36, 1). */
export const easeOut = [0.22, 1, 0.36, 1] as const;
