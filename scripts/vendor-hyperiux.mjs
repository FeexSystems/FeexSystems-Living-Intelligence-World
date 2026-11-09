#!/usr/bin/env node
/**
 * vendor-hyperiux.mjs
 *
 * Vendors the free (MPL 2.0) Hyperiux effects from a local clone of
 * https://github.com/Hyperiux-Immersion-Labs/hyperiux-components
 * into client/components/effects/<effect-name>/.
 *
 * Usage:
 *   node scripts/vendor-hyperiux.mjs [path-to-clone]
 *
 * Default clone path: %TEMP%/hyperiux-components (or /tmp/hyperiux-components)
 *
 * What it does:
 *   - Reads every registry/effects/<category>/<name>/registry.json
 *   - Copies each declared file into client/components/effects/<name>/
 *   - Strips "use client" directives (no-op under Vite)
 *   - Collects the union of npm dependencies into a JSON report
 *   - Writes client/components/effects/manifest.json for the EffectGate registry
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'client', 'components', 'effects');

const clonePath = process.argv[2]
  || join(process.env.TEMP || tmpdir(), 'hyperiux-components')
  || '/tmp/hyperiux-components';

const EFFECTS_SRC = join(clonePath, 'registry', 'effects');

if (!existsSync(EFFECTS_SRC)) {
  console.error(`Effects source not found: ${EFFECTS_SRC}`);
  console.error('Clone the repo first:');
  console.error('  git clone --depth 1 https://github.com/Hyperiux-Immersion-Labs/hyperiux-components.git %TEMP%/hyperiux-components');
  process.exit(1);
}

const categories = readdirSync(EFFECTS_SRC).filter((d) =>
  statSync(join(EFFECTS_SRC, d)).isDirectory()
);

const manifest = [];
const depSet = new Set();
const problems = [];
let copied = 0;

for (const category of categories) {
  const catDir = join(EFFECTS_SRC, category);
  for (const name of readdirSync(catDir)) {
    const effectDir = join(catDir, name);
    if (!statSync(effectDir).isDirectory()) continue;

    const regPath = join(effectDir, 'registry.json');
    if (!existsSync(regPath)) {
      problems.push(`${category}/${name}: missing registry.json`);
      continue;
    }

    let reg;
    try {
      reg = JSON.parse(readFileSync(regPath, 'utf8'));
    } catch (err) {
      problems.push(`${category}/${name}: invalid registry.json (${err.message})`);
      continue;
    }

    if (reg.tier && reg.tier !== 'free') {
      problems.push(`${category}/${name}: SKIPPED tier=${reg.tier}`);
      continue;
    }

    // Determine source files: prefer explicit files[] list, else all files except registry.json
    let srcFiles = [];
    if (Array.isArray(reg.files) && reg.files.length > 0) {
      srcFiles = reg.files.map((f) => f.path || f.target).filter(Boolean);
    } else {
      srcFiles = readdirSync(effectDir).filter((f) => f !== 'registry.json');
    }

    const outDir = join(OUT_DIR, name);
    mkdirSync(outDir, { recursive: true });

    const written = [];
    for (const rel of srcFiles) {
      const src = join(effectDir, rel);
      if (!existsSync(src)) {
        problems.push(`${category}/${name}: declared file missing on disk: ${rel}`);
        continue;
      }
      const dest = join(outDir, basename(rel));
      let content = readFileSync(src, 'utf8');
      // Normalize: strip "use client" directive (Vite doesn't need it)
      content = content.replace(/^['"]use client['"];?\s*\r?\n?/m, '');
      writeFileSync(dest, content, 'utf8');
      written.push(basename(rel));
      copied++;
    }

    for (const dep of reg.dependencies || []) depSet.add(dep);

    manifest.push({
      name: reg.name || name,
      title: reg.title || name,
      category,
      exportName: reg.exportName || null,
      exportKind: reg.exportKind || 'named',
      main: reg.main || 'index.tsx',
      dependencies: reg.dependencies || [],
      files: written,
      tier: reg.tier || 'free',
    });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ source: 'https://github.com/Hyperiux-Immersion-Labs/hyperiux-components', license: 'MPL-2.0', effects: manifest }, null, 2),
  'utf8'
);
writeFileSync(
  join(OUT_DIR, 'dependencies.json'),
  JSON.stringify({ union: [...depSet].sort() }, null, 2),
  'utf8'
);

console.log(`Vendored ${manifest.length} effects, ${copied} files -> ${OUT_DIR}`);
console.log('Dependency union:', [...depSet].sort().join(', ') || '(none)');
if (problems.length) {
  console.log('\nProblems:');
  for (const p of problems) console.log('  - ' + p);
}
