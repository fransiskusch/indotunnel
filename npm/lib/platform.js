"use strict";

// Maps the current platform to a release asset name. Raw binaries (no archive)
// so the installer needs no tar/zip dependency.
const os = require("os");

const BINARIES = {
  "win32-x64": "indotunnel-windows-amd64.exe",
  "darwin-x64": "indotunnel-darwin-amd64",
  "darwin-arm64": "indotunnel-darwin-arm64",
  "linux-x64": "indotunnel-linux-amd64",
  "linux-arm64": "indotunnel-linux-arm64",
};

function target(platform = process.platform, arch = process.arch) {
  const key = `${platform}-${arch}`;
  const name = BINARIES[key];
  if (!name) {
    throw new Error(
      `Unsupported platform: ${platform}-${arch}.\n` +
        `Install from source instead: go install github.com/fransiskusch/indotunnel/cmd/agent@latest`
    );
  }
  return { key, name, isWindows: platform === "win32" };
}

// Repo hosting the GitHub Releases. Override with INDOTUNNEL_REPO for forks.
function repo() {
  return process.env.INDOTUNNEL_REPO || "fransiskusch/indotunnel";
}

function downloadURL(version, asset) {
  return `https://github.com/${repo()}/releases/download/v${version}/${asset}`;
}

module.exports = { target, downloadURL, repo, BINARIES };
