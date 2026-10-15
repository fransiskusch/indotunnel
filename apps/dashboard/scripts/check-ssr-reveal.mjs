// Self-check: the landing page must render its content with no JavaScript and
// no motion. The GSAP layer may only hide things when html.js is present, and
// the headline must never depend on a stylesheet rule to become visible.
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../.next/server/app/index.html", import.meta.url), "utf8");

const checks = [
  {
    name: "no server-rendered content hidden with inline opacity:0",
    ok: !/opacity:\s*0(?!\.)/.test(html),
  },
  {
    name: "no server-rendered content translated out of its mask",
    ok: !/translateY\(105%\)/.test(html),
  },
  {
    name: "the hero headline is present in the markup",
    ok: html.includes("Expose localhost") && html.includes("to the internet"),
  },
  {
    name: "open accordion panels ship visible",
    ok: html.includes("grid-template-rows:1fr") || html.includes('grid-template-rows: 1fr'),
  },
];

let failed = 0;
for (const c of checks) {
  if (c.ok) {
    console.log(`PASS: ${c.name}`);
  } else {
    console.error(`FAIL: ${c.name}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
