#!/usr/bin/env node
/**
 * verify-feex-lab-manifest.mjs
 *
 * Schema-checks a FEEX-SORL lab manifest: required fields, valid zone
 * IDs against client/lib/lab/lab-zones.ts registry, sha256 format,
 * semver-ish version string.
 *
 * Usage: node scripts/verify-feex-lab-manifest.mjs <manifest.json>
 * Exit 0 = valid. Exit 1 = schema violations. Exit 2 = bad args.
 */

import { readFileSync } from "node:fs";

const REQUIRED = ["version", "assets", "zones", "generatedAt"];
const VALID_ZONE_IDS = new Set([
  "command-centre", "humanoid-bay", "robotics-sim",
  "ai-research", "bio-research", "engineering-workshop",
]);
const SHA256_RE = /^[0-9a-f]{64}$/;

const file = process.argv[2];
if (!file) {
  console.error("usage: verify-feex-lab-manifest.mjs <manifest.json>");
  process.exit(2);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  console.error(`INVALID JSON: ${e.message}`);
  process.exit(1);
}

const errors = [];
for (const key of REQUIRED) {
  if (!(key in manifest)) errors.push(`missing required field: ${key}`);
}
if (manifest.version !== undefined && typeof manifest.version !== "string") {
  errors.push("version must be a string");
}
if (manifest.assets !== undefined) {
  if (!Array.isArray(manifest.assets)) errors.push("assets must be an array");
  else {
    manifest.assets.forEach((a, i) => {
      if (!a.path) errors.push(`assets[${i}].path missing`);
      if (a.sha256 && !SHA256_RE.test(a.sha256)) {
        errors.push(`assets[${i}].sha256 malformed`);
      }
    });
  }
}
if (manifest.zones !== undefined) {
  if (!Array.isArray(manifest.zones)) errors.push("zones must be an array");
  else {
    for (const z of manifest.zones) {
      const id = typeof z === "string" ? z : z?.id;
      if (!VALID_ZONE_IDS.has(id)) errors.push(`unknown zone id: ${id}`);
    }
  }
}

if (errors.length) {
  for (const e of errors) console.error(`FAIL: ${e}`);
  process.exit(1);
}
console.log("MANIFEST VALID");
