#!/usr/bin/env node
/**
 * check-node.mjs — fail fast when running on an unsupported Node major version.
 *
 * The canonical version lives in `.nvmrc` (mirrored by `.node-version` and the
 * `engines.node` field in package.json). Vitest 5's worker pool does not
 * initialize on Node 24, which surfaces as a cryptic "Vitest failed to find the
 * runner" error across every suite. This guard turns that into a clear message.
 *
 * Exits 0 on a matching major, 1 otherwise. Cross-platform, zero dependencies.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRequiredMajor() {
  // 1) .nvmrc is the single source of truth.
  try {
    const raw = readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
    const m = raw.match(/\d+/);
    if (m) return m[0];
  } catch {
    /* fall through */
  }
  // 2) Fall back to engines.node (e.g. "22.x" -> 22).
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    const m = String(pkg.engines?.node ?? '').match(/\d+/);
    if (m) return m[0];
  } catch {
    /* fall through */
  }
  return null;
}

const required = readRequiredMajor();
const current = process.versions.node;
const currentMajor = current.split('.')[0];

if (required && currentMajor !== required) {
  console.error(
    `\n✖ Wrong Node version.\n` +
      `   Required: v${required}.x (see .nvmrc / package.json "engines")\n` +
      `   Found:    v${current}\n\n` +
      `   Fix: run \`nvm use\` (or install Node ${required}). ` +
      `Tests will not run correctly on this version.\n`
  );
  process.exit(1);
}

console.log(`✔ Node v${current} matches required v${required ?? '?'}.x`);
