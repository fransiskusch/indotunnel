"use strict";

// postinstall: fetch the platform binary so the first `indotunnel` run is fast.
// Failures here are non-fatal — the bin launcher retries on demand.
const { ensureBinary } = require("./lib/ensure");

ensureBinary().catch((err) => {
  process.stderr.write(`indotunnel: postinstall could not fetch the binary (${err.message})\n`);
  process.stderr.write("indotunnel: it will be downloaded on first run instead.\n");
});
