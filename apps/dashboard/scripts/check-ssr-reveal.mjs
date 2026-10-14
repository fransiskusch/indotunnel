// Self-check: the server-rendered landing HTML must not ship content hidden
// behind an inline opacity:0 (that strands reduced-motion and no-JS users on a
// blank page). Run after `npm run build`.
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../.next/server/app/index.html", import.meta.url), "utf8");
const hidden = (html.match(/opacity:\s*0(?!\.)/g) || []).length;

if (hidden > 0) {
  console.error(`FAIL: ${hidden} server-rendered element(s) hidden with opacity:0`);
  process.exit(1);
}
console.log("PASS: no server-rendered content hidden with opacity:0");
