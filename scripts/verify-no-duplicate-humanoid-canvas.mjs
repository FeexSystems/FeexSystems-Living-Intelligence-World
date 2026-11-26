#!/usr/bin/env node
/**
 * verify-no-duplicate-humanoid-canvas.mjs
 *
 * Enforces the FEEX-SORL one-Canvas rule: within client/landing/**,
 * exactly ONE component may mount a react-three-fiber <Canvas> for the
 * humanoid experience (HumanoidStage). Sovereign surfaces under
 * client/components/sovereign and client/pages are independent and out
 * of scope.
 *
 * Usage: node scripts/verify-no-duplicate-humanoid-canvas.mjs
 * Exit 0 = compliant. Exit 1 = violation (files listed).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "client/landing";
const ALLOWED = new Set(["client/landing/components/humanoid/HumanoidStage.tsx"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(p);
  }
  return out;
}

const offenders = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  if (!/<Canvas[\s>]/.test(src)) continue;
  const rel = relative(process.cwd(), file).replaceAll("\\", "/");
  if (!ALLOWED.has(rel)) offenders.push(rel);
}

if (offenders.length) {
  console.error("FAIL: additional landing <Canvas> mounts detected:");
  for (const f of offenders) console.error(`  - ${f}`);
  console.error("One-Canvas rule: only HumanoidStage may mount <Canvas>.");
  process.exit(1);
}
console.log("OK: exactly one landing humanoid Canvas (HumanoidStage)");
