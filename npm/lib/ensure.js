"use strict";

// Ensures the native binary is present before launching it. Re-downloads when
// the recorded version differs from the package version (npm upgrade).
const fs = require("fs");
const path = require("path");
const { target, downloadURL } = require("./platform");

const pkg = require("../package.json");

function download(url, dest, redirects = 0) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("too many redirects"));
    https
      .get(url, { headers: { "User-Agent": "indotunnel-npm" } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          return download(res.headers.location, dest, redirects + 1).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const tmp = dest + ".tmp";
        const out = fs.createWriteStream(tmp);
        res.pipe(out);
        out.on("finish", () => out.close(() => { fs.renameSync(tmp, dest); resolve(); }));
        out.on("error", reject);
      })
      .on("error", reject);
  });
}

async function ensureBinary() {
  const { name, isWindows } = target();
  const binDir = path.join(__dirname, "..", "bin");
  const binName = isWindows ? "indotunnel.exe" : "indotunnel";
  const dest = path.join(binDir, binName);
  const versionFile = path.join(binDir, ".version");

  const current = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, "utf8").trim() : "";
  if (fs.existsSync(dest) && current === pkg.version) return dest;

  fs.mkdirSync(binDir, { recursive: true });
  const url = downloadURL(pkg.version, name);
  process.stderr.write(`indotunnel: downloading ${name}...\n`);
  try {
    await download(url, dest);
    if (!isWindows) fs.chmodSync(dest, 0o755);
    fs.writeFileSync(versionFile, pkg.version);
    return dest;
  } catch (err) {
    throw new Error(
      `could not download the binary (${err.message}).\n` +
        `Tried: ${url}\n` +
        `Set INDOTUNNEL_BIN to use a local build, or check your network.`
    );
  }
}

module.exports = { ensureBinary };
