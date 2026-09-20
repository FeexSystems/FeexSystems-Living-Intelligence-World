#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "docs/architecture/manifest.json"), "utf8"));
const failures = [];
const exists = (p) => fs.existsSync(path.join(root, p));

for (const file of manifest.requiredDocs) {
  if (!exists(file)) failures.push("missing required doc: " + file);
}
for (const asset of manifest.showcaseAssets) {
  if (!exists(asset)) failures.push("missing showcase asset: " + asset);
}

const appSource = fs.readFileSync(path.join(root, manifest.sourceOfTruth.routes), "utf8");
for (const route of manifest.publicRoutes) {
  const escaped = route.replace(/[.*+?^$()|[\\]\\]/g, "\\$&");
  const pattern = new RegExp('<Route\\s+path=["\\\']' + escaped + '["\\\']');
  if (!pattern.test(appSource)) failures.push("route missing from " + manifest.sourceOfTruth.routes + ": " + route);
}

const readme = fs.readFileSync(path.join(root, manifest.sourceOfTruth.readme), "utf8");
const pattern = /!?(?:\\[[^\\]]*\\])\\(([^)]+)\\)/g;
for (const match of readme.matchAll(pattern)) {
  const target = match[1].split("#")[0].trim();
  if (!target || /^https?:\\/\\//i.test(target) || target.startsWith("mailto:")) continue;
  const clean = target.split("?")[0];
  if (clean && !exists(clean)) failures.push("README local reference missing: " + target);
}

if (failures.length) {
  console.error("\nFEEXSYSTEMS documentation verification FAILED\n");
  failures.forEach((failure) => console.error("- " + failure));
  process.exit(1);
}
console.log("FEEXSYSTEMS documentation verification PASSED");
console.log("- " + manifest.requiredDocs.length + " required docs present");
console.log("- " + manifest.showcaseAssets.length + " showcase assets present");
console.log("- " + manifest.publicRoutes.length + " public routes confirmed in source");
console.log("- README local references resolved");
