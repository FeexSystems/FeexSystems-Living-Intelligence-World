#!/usr/bin/env node
/**
 * verify-no-physical-actuation-surface.mjs
 *
 * Heuristic honesty gate for FEEX-SORL: scans client sources for copy
 * that claims live agent connection, hardware control, physical
 * actuation, or real lip sync — UNLESS the same line carries an
 * explicit negation/disclaimer (NO/NOT/DISABLED/SIMULATED/PROPOSED).
 *
 * This is a lint, not a proof: it catches accidental claim regressions.
 *
 * Usage: node scripts/verify-no-physical-actuation-surface.mjs
 * Exit 0 = clean. Exit 1 = violations listed.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["client"];
const SKIP = /node_modules|dist|\.test\.|\.spec\.|fixtures\//;

// Claims that require an on-line disclaimer to be legal copy.
const CLAIMS = [
  /physical actuation(?!.*\b(?:no|not|disabled|simulation|simulated)\b)/i,
  /live agent (?:connection|request|runtime)/i,
  /hardware control(?:\s+enabled)?(?!.*\b(?:no|not|disabled)\b)/i,
  /real[- ]?time lip sync/i,
  /controls? (?:the )?(?:robot|hardware|actuator)/i,
];
const NEGATION = /\b(?:no|not|never|without|disabled|simulation|simulated|proposed|preview|disclosure)\b/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (!SKIP.test(p)) walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !SKIP.test(p)) {
      out.push(p);
    }
  }
  return out;
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      const t = line.trim();
      // Skip pure comment lines — they document prohibitions, not claims.
      if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
      for (const re of CLAIMS) {
        if (re.test(line) && !NEGATION.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      }
    });
  }
}

if (violations.length) {
  console.error("FAIL: potential unnegated actuation/live-agent claims:");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log("OK: no unnegated physical-actuation / live-agent claims found");
