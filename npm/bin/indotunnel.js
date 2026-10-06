#!/usr/bin/env node
"use strict";

// Launch the native indotunnel binary, forwarding all arguments and inheriting
// stdio so the interactive status output streams straight to the terminal.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ensureBinary } = require("../lib/ensure");

function binaryPath() {
  if (process.env.INDOTUNNEL_BIN) return process.env.INDOTUNNEL_BIN;
  const name = process.platform === "win32" ? "indotunnel.exe" : "indotunnel";
  return path.join(__dirname, name);
}

async function main() {
  let bin = binaryPath();
  if (!fs.existsSync(bin)) {
    bin = await ensureBinary();
  }
  const child = spawn(bin, process.argv.slice(2), { stdio: "inherit" });
  child.on("error", (err) => {
    process.stderr.write(`indotunnel: could not start binary: ${err.message}\n`);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code === null ? 1 : code);
  });
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => child.kill(sig));
  }
}

main().catch((err) => {
  process.stderr.write(`indotunnel: ${err.message}\n`);
  process.exit(1);
});
