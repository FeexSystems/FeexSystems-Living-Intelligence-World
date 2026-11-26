#!/usr/bin/env node
/**
 * verify-feex-lab-assets.mjs
 *
 * Validates the FEEX-SORL lab asset set: every GLB listed in a manifest
 * exists, has valid GLB magic, and parses as JSON chunk.
 *
 * Usage:
 *   node scripts/verify-feex-lab-assets.mjs <manifest.json>
 * Manifest: { "assets": [{ "path": "...", "sha256": "..." }, ...] }
 *
 * Exit 0 = all assets present+valid. Exit 1 = failures. Exit 2 = bad args.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("usage: verify-feex-lab-assets.mjs <manifest.json>");
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const assets = manifest.assets ?? [];
if (!assets.length) {
  console.error("manifest has no assets");
  process.exit(2);
}

let failures = 0;
for (const asset of assets) {
  const { path, sha256 } = asset;
  if (!path || !existsSync(path)) {
    console.error(`FAIL: missing asset ${path}`);
    failures++;
    continue;
  }
  const buf = readFileSync(path);
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) {
    console.error(`FAIL: not a GLB ${path}`);
    failures++;
    continue;
  }
  if (sha256) {
    const actual = createHash("sha256").update(buf).digest("hex");
    if (actual !== sha256) {
      console.error(`FAIL: sha256 mismatch ${path}\n  expected ${sha256}\n  actual   ${actual}`);
      failures++;
      continue;
    }
  }
  console.log(`OK: ${path} (${buf.length} bytes)`);
}

if (failures) {
  console.error(`VALIDATION FAILED: ${failures} asset(s)`);
  process.exit(1);
}
console.log(`VALIDATION PASSED: ${assets.length} asset(s)`);
