#!/usr/bin/env node
/**
 * analyze-ui-components.mjs — Static analysis of client/components/ui/*.
 *
 * Powers the Component Inventory (Task 5), Accessibility Audit (Task 6), and
 * Priority ranking (Task 8) of FRONTEND_MODERNIZATION_PLAN.md (Sprint 2).
 *
 * Outputs .temp/ui-analysis.json with per-component:
 *   exports, dependencies (Radix flagged), a11y signals (aria/role/keyboard/
 *   ref forwarding), LOC, usage (importing files), and test coverage.
 *
 * Usage: node scripts/analyze-ui-components.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UI_DIR = join(ROOT, 'client', 'components', 'ui');
const SKIP = new Set(['node_modules', '.temp', 'dist', '.git', 'coverage']);

/** Recursively collect source files under a dir. */
function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const clientFiles = walk(join(ROOT, 'client'), ['.ts', '.tsx']);
const testFiles = clientFiles.filter((f) => /\.(test|spec)\.[tj]sx?$/.test(f));
const appFiles = clientFiles.filter((f) => !/\.(test|spec)\.[tj]sx?$/.test(f) && !f.endsWith('.template'));
const uiFiles = readdirSync(UI_DIR).filter((f) => f.endsWith('.tsx')).sort();

// Pre-read all app + test files once for usage matching.
const appFileContents = appFiles.map((f) => ({ f, src: readFileSync(f, 'utf8') }));
const testFileContents = testFiles.map((f) => ({ f, src: readFileSync(f, 'utf8') }));

const results = [];
for (const file of uiFiles) {
  const name = basename(file, '.tsx');
  const full = join(UI_DIR, file);
  const src = readFileSync(full, 'utf8');
  const loc = src.split('\n').length;

  // Dependencies from import/export-from statements.
  const deps = [...src.matchAll(/(?:import|export)[^;]*?from\s+['"]([^'"]+)['"]/gs)].map((m) => m[1]);
  const radixDeps = deps.filter((d) => d.startsWith('@radix-ui/'));
  const externalDeps = deps.filter((d) => !d.startsWith('.') && !d.startsWith('@/'));
  const localDeps = deps.filter((d) => d.startsWith('@/') || d.startsWith('.'));

  // Exports (declarations + `export { A, B }` lists).
  const exports = [
    ...[...src.matchAll(/export\s+(?:const|function|interface|type|class)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]),
    ...[...src.matchAll(/export\s*\{([^}]+)\}/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop())),
  ];
  const hasDefault = /export\s+default/.test(src);

  // Accessibility signals.
  const ariaAttrs = new Set([...src.matchAll(/\b(aria-[a-z-]+)=/g)].map((m) => m[1]));
  const roleAttrs = new Set([...src.matchAll(/\brole=["{]([^"'}]*)/g)].map((m) => m[1]));
  const hasKeyboard = /onKey(?:Down|Up|Press)=/.test(src);
  const hasTabIndex = /tabIndex=/.test(src);
  const hasFocusHandlers = /onFocus|onBlur|onFocusCapture|onBlurCapture/.test(src);
  const forwardsRef = /forwardRef/.test(src) || /ref=\{/.test(src);
  const hasLabel = /aria-label|<label|aria-labelledby|visually-hidden|sr-only/.test(src);
  const hasNativeInteractive = /<(button|a|input|textarea|select)\b/.test(src);
  const extendsHtml =
    /(?:Button|Anchor|Input|Textarea|Select|Form)HTMLAttributes|Ctrl\s*\}\s*>/.test(src);
  // Radix primitives render interactive semantics themselves (Dialog, Select…).
  const isInteractive = hasNativeInteractive || extendsHtml || radixDeps.length > 0;

  // Usage: files that import this component (alias, ../ui, or ./name paths).
  const usagePatterns = [
    new RegExp(`@/components/ui/${name}['"]`),
    new RegExp(`['"][^'"]*/ui/${name}['"]`),
    new RegExp(`from\\s+['"]\\./${name}['"]`),
  ];
  const usedBy = appFileContents
    .filter(({ f, src: s }) => f !== full && usagePatterns.some((re) => re.test(s)))
    .map(({ f }) => f.slice(ROOT.length + 1));

  // Test coverage: any test file importing this component.
  const coveredByTests = testFileContents
    .filter(({ src: s }) => usagePatterns.some((re) => re.test(s)))
    .map(({ f }) => f.slice(ROOT.length + 1));

  results.push({
    name,
    file: `client/components/ui/${file}`,
    loc,
    exports,
    hasDefault,
    deps: externalDeps,
    radixDeps,
    localDeps,
    ariaAttrs: [...ariaAttrs],
    roleAttrs: [...roleAttrs],
    hasKeyboard,
    hasTabIndex,
    hasFocusHandlers,
    forwardsRef,
    hasLabel,
    isInteractive,
    usedByCount: usedBy.length,
    usedBy: usedBy.slice(0, 10),
    tests: coveredByTests,
  });
}

// --- A11y heuristic score (0-10): informational baseline for the audit ------
for (const r of results) {
  let score = 0;
  if (r.radixDeps.length > 0) score += 3; // Radix primitives ship keyboard/ARIA behavior
  if (r.ariaAttrs.length > 0) score += 2;
  if (r.roleAttrs.length > 0) score += 1;
  if (r.hasKeyboard) score += 1;
  if (r.hasFocusHandlers) score += 1;
  if (r.hasLabel || r.roleAttrs.length > 0 || r.ariaAttrs.length > 0) score += 1;
  if (r.forwardsRef) score += 1;
  if (!r.isInteractive) score += 1; // static components carry less a11y risk
  r.a11yScore = Math.min(score, 10);
  r.category = r.radixDeps.length > 0 ? 'radix-wrapper' : r.isInteractive ? 'native-interactive' : 'static';
}

results.sort((a, b) => b.usedByCount - a.usedByCount || a.name.localeCompare(b.name));

const outDir = join(ROOT, '.temp');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'ui-analysis.json');
writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), componentCount: results.length, results }, null, 2));

const tested = results.filter((r) => r.tests.length > 0).length;
const interactive = results.filter((r) => r.isInteractive).length;
const withRadix = results.filter((r) => r.radixDeps.length > 0).length;
console.log(`✔ Analyzed ${results.length} components → ${outPath.slice(ROOT.length + 1)}`);
console.log(`  Radix-based: ${withRadix} · Interactive: ${interactive} · With tests: ${tested}/${results.length}`);
console.log('  Top used:', results.slice(0, 10).map((r) => `${r.name}(${r.usedByCount})`).join(', '));

