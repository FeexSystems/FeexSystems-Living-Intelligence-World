#!/usr/bin/env node
/**
 * verify-feex-lab-provenance.mjs
 *
 * Recomputes SHA-256 for every asset listed in a provenance manifest
 * and verifies the recorded digest matches. Provenance manifests are
 * written by export_feex_sorl_glb.py / build_feex_humanoid_web_export.py
 * as <asset>.manifest.json sidecars.
 *
 * Usage:
 *   node scripts/verify-feex-lab-provenance.mjs <manifest.json> [...more.json]
 *
 * Exit 0 = all digests match. Exit 1 = mismatch/missing. Exit 2 = bad args.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: verify-feex-lab-provenance.mjs <manifest.json> [...]");
  process.exit(2);
}

let failures = 0;
for (const mf of files) {
  const manifest = JSON.parse(readFileSync(mf, "utf8"));
  const assetName = manifest.asset;
  const expected = manifest.sha256;
  if (!assetName || !expected) {
    console.error(`FAIL: ${mf} missing asset/sha256`);
    failures++;
    continue;
  }
  const assetPath = join(dirname(mf), assetName);
  if (!existsSync(assetPath)) {
    console.error(`FAIL: asset missing for ${mf}: ${assetPath}`);
    failures++;
    continue;
  }
  const actual = createHash("sha256").update(readFileSync(assetPath)).digest("hex");
  if (actual !== expected) {
    console.error(`FAIL: provenance mismatch ${assetName}\n  recorded ${expected}\n  actual   ${actual}`);
    failures++;
    continue;
  }
  console.log(`OK: ${assetName} sha256 verified`);
}

if (failures) {
  console.error(`PROVENANCE FAILED: ${failures} problem(s)`);
  process.exit(1);
}
console.log("PROVENANCE VERIFIED");
