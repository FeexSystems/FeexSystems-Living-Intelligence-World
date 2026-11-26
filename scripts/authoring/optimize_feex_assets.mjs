#!/usr/bin/env node
/**
 * optimize_feex_assets.mjs — FEEX-SORL asset optimization (plan §14.2).
 *
 * Usage:
 *   node scripts/authoring/optimize_feex_assets.mjs --manifest <manifest.json>
 *
 * Manifest format:
 *   { "inputs": [{ "path": "...", "output": "..." }, ...] }
 *
 * For each entry:
 *   1. validate input exists and is a GLB
 *   2. run `gltf-transform inspect` (report only)
 *   3. run the approved optimization pipeline into a versioned output dir
 *   4. compare input/output sizes
 *   5. write machine-readable report next to outputs
 *
 * Never deletes sources. Exit 1 on missing input or invalid output.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const args = process.argv.slice(2);
const mi = args.indexOf("--manifest");
const manifestPath = mi >= 0 ? args[mi + 1] : null;
if (!manifestPath) {
  console.error("usage: optimize_feex_assets.mjs --manifest <file.json>");
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const inputs = manifest.inputs ?? [];
if (!inputs.length) {
  console.error("manifest has no inputs");
  process.exit(2);
}

function isGlb(path) {
  const fd = readFileSync(path);
  return fd.length > 4 && fd.readUInt32LE(0) === 0x46546c67;
}

const report = { manifest: manifestPath, results: [], ok: true };

for (const entry of inputs) {
  const { path: input, output } = entry;
  const result = { input, output, status: "pending" };
  try {
    if (!input || !existsSync(input)) throw new Error("missing input");
    if (!isGlb(input)) throw new Error("input is not a GLB");
    result.inputBytes = statSync(input).size;

    mkdirSync(dirname(output), { recursive: true });

    // Inspect (advisory)
    try {
      execFileSync("npx", ["gltf-transform", "inspect", input], {
        stdio: "pipe",
        shell: process.platform === "win32",
      });
      result.inspect = "ok";
    } catch {
      result.inspect = "unavailable-or-warnings";
    }

    // Optimize: weld, simplify(aggressive off by default), compress, texture compress
    execFileSync(
      "npx",
      [
        "gltf-transform", "optimize", input, output,
        "--compress", "draco",
        "--texture-compress", "webp",
      ],
      { stdio: "pipe", shell: process.platform === "win32" },
    );

    if (!existsSync(output) || !isGlb(output)) {
      throw new Error("optimizer produced invalid GLB");
    }
    result.outputBytes = statSync(output).size;
    result.savingsPct =
      result.inputBytes > 0
        ? Math.round((1 - result.outputBytes / result.inputBytes) * 1000) / 10
        : 0;
    result.status = "ok";
  } catch (err) {
    result.status = "failed";
    result.error = String(err.message ?? err);
    report.ok = false;
  }
  report.results.push(result);
}

const reportPath = join(dirname(manifestPath), "optimize-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

for (const r of report.results) {
  console.log(
    `${r.status === "ok" ? "OK  " : "FAIL"} ${basename(r.input)} ` +
      `${r.inputBytes ?? "?"}B -> ${r.outputBytes ?? "?"}B ` +
      `${r.savingsPct !== undefined ? `(${r.savingsPct}% saved)` : ""}` +
      `${r.error ? ` — ${r.error}` : ""}`,
  );
}
console.log(`report: ${reportPath}`);
process.exit(report.ok ? 0 : 1);
