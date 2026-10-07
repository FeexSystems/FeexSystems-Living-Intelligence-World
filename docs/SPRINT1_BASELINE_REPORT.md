# Sprint 1 Verification Report — Foundation & Stability

> **Date:** 2026-10-07 · **Plan:** [FRONTEND_MODERNIZATION_PLAN.md](./FRONTEND_MODERNIZATION_PLAN.md) · **Phase 1 / Sprint 1**
> Establishes the measured baseline for all subsequent sprints.

## 1. Baseline Metrics (measured)

| Check | Result |
|-------|--------|
| `npm run typecheck` | **22 errors → 0** (after Sprint 1 fixes; baseline was 1 client + 21 server) |
| `npm test` (Vitest) | **217 failed / 776 passed / 86 skipped** of 1,079 tests in 104 files (37 files failing) — *identical before/after Sprint 1 changes: all failures pre-existing* |
| `npm run build:client` | ✅ passes, 58.5 s, main chunk 1,029.55 kB (gzip 248 kB) |
| `npm run build:server` | ✅ passes, 2.5 s |
| `npm run check:shadows` | ✅ 0 stale `.js` shadows |
| `npx playwright test --list` | ✅ **255 tests in 12 files** (was aborting with 0 — see §2b) |
| CSS entry (`client/global.css`) | ✅ exists; all 4 partials (`global-body-p0/p1/p2`, `sovereign-hud-glass`) resolve; a11y blocks present |

## 2. Critical Issue Found & Fixed: Stale `.js` Shadow Files

**Discovery:** 325 compiled `.js` files (client 92, server + shared the rest)
sat next to their `.ts`/`.tsx` sources — accidentally committed in `b2b6ffe`
(2026-09-14). Evidence of drift: `client/test/utils/mock-factories.js` was a
type-stripped copy of its `.ts` source.

**Impact:**
- The 47 explicit `.js`-suffixed imports in `server/` resolved to the **stale
  shadows** instead of live TS sources (server modules could run outdated code).
- Shadows drifted from sources over time and doubled every grep/IDE result.

**Fix:** All 325 removed (manifest: `.temp/shadow-manifest.txt`; recoverable via
`git checkout -- <path>`). Recurrence guard: `scripts/check-shadow-js.mjs`
(`npm run check:shadows`).

**Verification (zero-regression):**

| Gate | Before | After |
|------|--------|-------|
| typecheck | 22 errors | **0 errors** |
| client build | ✅ 58.5 s | ✅ 66 s — **byte-identical chunk hashes** |
| server build | not measured | ✅ 2.5 s (explicit `.js` imports resolve to `.ts`) |
| test failures | 37 files / 217 tests | 37 files / 217 tests — **0 diff** |

## 2b. Critical Issue Found & Fixed: Broken E2E Imports

**Discovery:** `npx playwright test --list` aborted with *0 tests in 0 files* —
four specs imported helpers via `'../helpers/…'`, which escapes `e2e/` and lands
at a non-existent root-level `helpers/` directory:

| Spec | Bad import | Fixed to |
|------|-----------|----------|
| `e2e/auth.spec.ts` | `'../helpers/test-helpers'` | `'./helpers/test-helpers'` |
| `e2e/billing.spec.ts` | `'../helpers/test-helpers'`, `'../helpers/billing-helpers'` | `'./helpers/…'` |
| `e2e/navigation.spec.ts` | `'../helpers/test-helpers'` | `'./helpers/test-helpers'` |
| `e2e/settings.spec.ts` | `'../helpers/test-helpers'`, `'../helpers/settings-helpers'` | `'./helpers/…'` |

**Impact:** The CI `e2e-tests` job (`npm run test:e2e`) could never collect
tests — it has been structurally broken since these specs were written.

**Verification:** `playwright test --list` now reports **255 tests in 12 files**,
including the 4 new `@visual` specs.

## 3. Type Error Fixes (typecheck 22 → 0)

| File | Fix |
|------|-----|
| `client/lib/auth-state.ts` | Re-export `AuthUser` (consumer `hooks/useAuthHealth.ts` imported a non-exported type) |
| `server/lib/config.ts` | Renamed internal cache `let env` → `let cachedEnv` (duplicate declaration vs exported `const env`); removed cascade of 12 `possibly null` errors |
| `server/lib/config/health.ts` | Import `./config` → `../config` (module never existed at that path — runtime-broken import) |
| `server/routes/admin.ts` | `asyncHandler` param type `Promise<void>` → `Promise<unknown>` (handlers legitimately `return res.json(...)`) |

## 4. Sprint 1 Deliverables

| Task | Deliverable | Status |
|------|-------------|--------|
| 1 — Verify global CSS | All partials + a11y blocks confirmed | ✅ |
| 2 — Import conventions | [`client/CONTRIBUTING.md`](../client/CONTRIBUTING.md) (`@/` alias rules) | ✅ |
| 3 — Visual regression | `test:visual` script + `e2e/visual-regression.spec.ts` (`@visual` tagged, 4 baselines) | ✅ (baselines to generate on first CI run) |
| 4 — Architecture doc | [`docs/FRONTEND_ARCHITECTURE.md`](./FRONTEND_ARCHITECTURE.md) refreshed (entry path `client/src/main.tsx`, `gcTime`, route splitting, doc links) | ✅ |
| 9 — Bundle analysis | [`docs/BUNDLE_ANALYSIS.md`](./BUNDLE_ANALYSIS.md) + visualizer wired in `vite.config.ts` | ✅ |
| (extra) — Critical fix | 325 shadow `.js` files removed + `check:shadows` guard | ✅ |
| (extra) — Typecheck | 22 → 0 errors across client + server | ✅ |
| (extra) — E2E collection | 6 broken helper imports fixed across 4 specs (255 tests now collect) | ✅ |

## 5. Known Issues Queue (prioritized, feeds Sprint 2+)

1. **37 failing test files / 217 failing tests** — root cause is *test/source
   drift*, not infrastructure. Example: `auth-store-simple.test.ts` imports
   `clearAuthStorage` from `test-utils.tsx`, but that helper no longer exists
   anywhere. Remediation: restore missing helpers or rewrite affected tests
   (candidate: Sprint 2 Task 7 test-template work).
2. **Main chunk > 1,000 kB** — see [BUNDLE_ANALYSIS.md](./BUNDLE_ANALYSIS.md)
   finding #1 (react-dom not captured by `react-vendor`).
3. **sonner dual static/dynamic import warning** during build.
4. **CI `type-check` job** should now pass for the first time; the existing
   `test.yml` CI job will still fail on the 217 pre-existing test failures —
   decide whether to fix tests (preferred) or temporarily quarantine broken
   suites before enabling required checks.

## 6. Reproducing the Baseline

```bash
npm run typecheck          # expect 0 errors
npm test                   # baseline: 217 failed / 776 passed
npm run build:client       # emits bundle-stats.html
npm run build:server
npm run check:shadows      # expect ✔
npx playwright test --list # expect 255 tests in 12 files
```
