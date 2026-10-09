#!/usr/bin/env node
/**
 * check-shadow-js.mjs — Detect stale compiled .js files shadowing .ts/.tsx sources.
 *
 * Background: commit b2b6ffe (2026-09-14) accidentally committed ~325 compiled
 * .js files next to their .ts/.tsx sources. Extensionless imports already
 * preferred .ts (verified: byte-identical builds before/after removal), BUT:
 *   - the 47 explicit `.js`-suffixed imports in server/ matched the stale
 *     shadows first, so server modules could run outdated compiled code;
 *   - shadows drifted from their sources (stripped types, stale bodies);
 *   - they doubled every grep/IDE search result with dead copies.
 * (Removed during Sprint 1 of docs/FRONTEND_MODERNIZATION_PLAN.md.)
 *
 * This guard fails (exit 1) if any .js file with a same-basename .ts/.tsx
 * sibling reappears, preventing the problem from recurring.
 *
 * Usage: node scripts/check-shadow-js.mjs   (npm run check:shadows)
 */
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['client', 'server', 'shared'];
const SKIP_PARTS = new Set(['node_modules', '.temp', 'dist', 'build', '.git']);

/**
 * Legit JS files that never have TS siblings (configs, vendored assets).
 * Matched by basename, so the entry covers the file wherever it lives.
 */
const ALLOWLIST = new Set([
  'postcss.config.js',
  'tailwind.config.js',
  'vite.config.js',
  'eslint.config.js',
  'vitest.config.js',
  'playwright.config.js',
  'commitlint.config.js',
  'script.js',
]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_PARTS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const shadows = [];
for (const dir of SCAN_DIRS) {
  const base = join(ROOT, dir);
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    if (!file.endsWith('.js')) continue;
    const name = basename(file);
    if (ALLOWLIST.has(name)) continue;
    const stem = file.slice(0, -3);
    if (existsSync(stem + '.ts') || existsSync(stem + '.tsx')) {
      shadows.push(file.slice(ROOT.length + 1));
    }
  }
}

if (shadows.length > 0) {
  console.error(`\n✖ Found ${shadows.length} stale .js file(s) shadowing TypeScript sources:\n`);
  for (const s of shadows) console.error(`  - ${s}`);
  console.error(
    '\nThese stale copies drift from their sources, double grep/IDE results, and win' +
      '\nresolution for explicit `.js`-suffixed imports (47 exist in server/).' +
      '\nDelete them:  git rm <file>   (the .ts/.tsx source is canonical)\n'
  );
  process.exit(1);
}

console.log('✔ No .js shadows over .ts/.tsx sources.');
