# FeexSystems Frontend Modernization Initiative — Revised Plan (v2)

> **Revision v2** — Validated against the actual codebase on 2026-10-07 (commit `99dcb7c`).
> Tasks already implemented are verified, re-scoped, or removed. Corrections applied:
> `@/` path alias notation, `client/src/main.tsx` entry point, `vitest-axe` instead of
> `jest-axe`, existing CI workflows, and corrected test-coverage metrics.

## Problem Statement

The FeexSystems Living Intelligence World frontend has a strong architectural foundation but requires systematic improvements across accessibility, performance, developer experience, and visual polish. This plan establishes a phased, continuous-improvement approach for a solo developer.

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Verified complete in codebase — no action required |
| 🔧 | Partially done — scope reduced to wiring, verification, or flag-flipping |
| ➕ | Genuinely missing — full task applies |

## Corrections Applied in v2

1. **Task 1** — `client/global.css` **exists** with all 4 partial imports, `.sr-only`, `:focus-visible`, `prefers-reduced-motion`, and `forced-colors` blocks. Task converted to verification-only.
2. **Task 2** — Path alias is `@/*` → `./client/*` (consistent across `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`). Garbled backtick notation corrected throughout.
3. **Task 3** — Playwright installed (`@playwright/test` ^1.40.0, `playwright.config.ts`, 13 specs in `e2e/`, `test:e2e` scripts). `client/test/` already has setup, mocks, README, templates, 50+ tests. Re-scoped to visual-regression extension only.
4. **Task 4** — `docs/FRONTEND_ARCHITECTURE.md` exists (577 lines). Re-scoped to refresh/diff.
5. **Task 10** — All routes except landing are `lazy()` in `App.tsx`; `manualChunks` already defined (`react-vendor`, `three-vendor`, `r3f-vendor`, `ui-vendor`, `query-vendor`). Measurement-only.
6. **Task 45** — React Query caching configured (`staleTime: 5min`, `gcTime: 10min`, 401-aware retry). ✅
7. **Task 56** — Use `vitest-axe` (Vitest stack) + `@axe-core/playwright`, **not** `jest-axe`.
8. **Task 59** — `form.tsx` (shadcn FormField pattern) exists in `client/components/ui/`. Audit-first.
9. **Task 62** — No ESLint config or dependency exists anywhere (only Prettier + `globals`). **Greenfield** ESLint 9 flat-config setup, not a rule tweak.
10. **Task 63** — `strict: true` already enabled. Scope reduced to `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `noImplicitReturns`.
11. **Task 71** — `breadcrumb.tsx` exists. Audit-and-integrate task.
12. **CI tasks (20, 85–87)** — `.github/workflows/test.yml` already runs unit, integration, e2e, and typecheck jobs (plus `deploy.yml`, `pass10-production-smoke.yml`). All CI tasks **extend the existing workflow**.
13. **Task 81** — `@sentry/node` installed **server-side only**; client tracking requires new dep `@sentry/react`.
14. **Entry point** — `index.html` loads `/client/src/main.tsx` (not `client/main.tsx`).
15. **Success metrics** — Test coverage is **not** 0%: 50+ tests exist (auth-heavy). Metric corrected to "UI component coverage".

## Phase Overview

```
Phase 1: Foundation & Stability (Sprints 1-4)
Phase 2: Accessibility & Compliance (Sprints 5-8)
Phase 3: Performance & Optimization (Sprints 9-12)
Phase 4: Component Library & DX (Sprints 13-16)
Phase 5: Visual Polish & UX (Sprints 17-20)
Phase 6: Continuous Improvement Systems (Sprints 21-24)
```


---

## PHASE 1: FOUNDATION & STABILITY

*Goal: Eliminate critical issues, establish testing infrastructure, and create a stable foundation.*

### Sprint 1: Critical Fixes & File Structure (REVISED)

**Task 1: Verify Global CSS Entry Point** ✅ → verification only

- Run dev server; confirm zero CSS 404s in DevTools Network tab
- Confirm glassmorphism, hud-bracket pseudo-elements, and scanline overlay render
- Confirm `.sr-only`, `:focus-visible`, `prefers-reduced-motion`, `forced-colors` blocks active
- **Demo:** App loads with all styles intact, no missing-CSS console errors

**Task 2: Document Import Conventions** 🔧

- Document `@/*` → `./client/*` and `@shared/*` → `./shared/*` aliases
- Keep tsconfig paths ⇄ vite aliases ⇄ vitest aliases in sync (all three confirmed aligned)
- Audit stray deep relative imports (`../../..`) and normalize to `@/`
- Create `client/CONTRIBUTING.md` with import conventions
- **Demo:** Clean `npm run typecheck` and `npm run build` with no resolution warnings

**Task 3: Extend Test Infrastructure for Visual Regression** 🔧

- Existing: Vitest + jsdom + MSW + `client/test/` + Playwright + `e2e/` (13 specs)
- Add visual snapshot capability: dedicated Playwright project or `@visual` grep
- Add script: `"test:visual": "playwright test --grep @visual"`
- Generate baseline screenshots for key pages and top components
- **Demo:** `npm run test:visual` produces and compares baselines

**Task 4: Refresh Architecture Documentation** 🔧

- Diff `docs/FRONTEND_ARCHITECTURE.md` against current reality (routes, chunks, entry path)
- Update stale sections; keep existing structure
- **Demo:** Architecture doc matches codebase

### Sprint 2: Component Inventory & Audit

**Task 5: Complete Component Inventory** ✅ → **complete**

- `client/components/ui/COMPONENT_INVENTORY.md` created: 49 UI components + 17 unused + dependency paths
- Data pipeline: `scripts/analyze-ui-components.mjs` + `.temp/ui-analysis.json`

### Sprint 2 (continued): Audit, Priority & Test Templates

**Task 6: Accessibility Audit & Baseline** ✅ → **complete**

- `client/components/ui/ACCESSIBILITY_REPORT.md` created: baseline score distribution, HIGH/MEDIUM findings (H1–H4, M1–M4), WCAG snapshot, remediation roadmap
- Baseline: "Needs Remediation" — 4 HIGH source findings; 0 runtime-verified violations yet (axe arrives Sprint 5)

**Task 7: Component Test Templates** ✅ → **complete**

- Template extended with variants/edge-case/axe-scan blocks; `client/test/README.md` adds usage + priority guidance
- Template instantiated and verified: `client/test/components/button.test.tsx` — **8/8 tests pass** (`npx vitest run client/test/components/button.test.tsx`)
- `docs/COMPONENT_PRIORITY.md` with top-10 ranking + coverage targets

### Sprint 2 Inventory of Deliverables

| Deliverable | Status |
|-------------|--------|
| `client/components/ui/COMPONENT_INVENTORY.md` (49 rows) | ✅ |
| `client/components/ui/ACCESSIBILITY_REPORT.md` | ✅ |
| `docs/COMPONENT_PRIORITY.md` | ✅ |
| `client/test/templates/component.test.tsx.template` | ✅ (axe block, Sprint 5 guard) |
| `client/test/README.md` (component testing section) | ✅ |
| `client/test/components/button.test.tsx` (8/8 green) | ✅ |
| `scripts/analyze-ui-components.mjs` maintenance run | ✅ |

### Sprint 3: Build System Optimization

**Task 9: Analyze Bundle Size** 🔧 (dep already installed)

- `rollup-plugin-visualizer` is in devDependencies — **wire it into `vite.config.ts` only**
- Run production build and analyze output; document in `docs/BUNDLE_ANALYSIS.md`
- Identify largest dependencies, code-splitting and lazy-load candidates
- **Test:** Build succeeds; visualizer generates readable report with specific optimization targets

**Task 10: Verify Code Splitting Strategy** ✅ → measurement only

- Verified: all routes `lazy()` except landing; manualChunks defined for react/three/r3f/ui/query vendors
- Measure before/after initial bundle sizes and record in `docs/BUNDLE_ANALYSIS.md`
- Look for regressions (new eager imports in `App.tsx`)
- **Test:** Initial bundle within budget; no chunk-loading runtime errors

**Task 11: Add Build Performance Monitoring** ➕

- Create `scripts/measure-build.js` capturing build duration, bundle sizes, chunk count
- Store results in `.build-metrics/`; set thresholds for warnings
- Add `"build:measure"` script
- **Test:** Script captures metrics accurately; history preserved

**Task 12: Configure Dependency Budgets** ➕

- Add `bundlesize` (or `size-limit`) config: JS < 500 kB gzipped, CSS < 100 kB gzipped (calibrate after Task 9 baseline)
- Wire into CI to fail on budget violation
- Document rationale in `docs/PERFORMANCE_BUDGETS.md`
- **Test:** CI fails when bundle exceeds budget; values realistic

### Sprint 4: Error Handling & Logging

**Task 13: Enhance Error Boundary System** 🔧

- Exists: `ErrorBoundary.tsx` (with tests) + `globalErrorHandler` in `client/lib/error-handler.ts` + router-level boundary in `App.tsx`
- Add: error ID for support, recovery actions (retry/home/report), Canvas/WebGL boundary, form submission boundary
- **Test:** Errors caught gracefully; recovery works; errors logged with context

**Task 14: Add Structured Logging** ➕

- Create `client/lib/logger.ts` with debug/info/warn/error levels, timestamp, context, env-based filtering
- Replace noisy `console.log` calls progressively
- **Test:** Level filtering works; no sensitive data in logs

**Task 15: Create User-Facing Error Messages** ➕

- Create `client/components/ErrorStates/`: `ErrorPage.tsx` (500/offline/feature-unavailable), `InlineError.tsx`, `ToastError.tsx`

---

## PHASE 2: ACCESSIBILITY & COMPLIANCE

*Goal: Achieve WCAG 2.1 AA compliance with automated enforcement. This is the highest-value phase — currently zero automated a11y testing exists.*

### Sprint 5: Accessibility Infrastructure

**Task 17: Automated Accessibility Testing** ➕

- Install `vitest-axe` (+ `axe-core`) for unit level and `@axe-core/playwright` for E2E
- Add dev-mode runtime audit via `@axe-core/react` in `client/src/main.tsx` (guarded by `import.meta.env.DEV` — note Vite, not `process.env.NODE_ENV`)
- Create a11y test suite in `client/test/a11y/`
- **Test:** axe runs in dev mode and in Vitest; violations reported clearly

**Task 18: Accessibility Testing Utilities** ➕

- Create `client/test/utils/a11y-helpers.ts`: keyboard-nav check, focus-trap check, contrast-ratio assertion
- Works with both Vitest (jsdom) and Playwright
- **Test:** Utilities produce clear failure messages; documented in test README

**Task 19: Document Accessibility Standards** ➕

- Create `docs/ACCESSIBILITY_GUIDELINES.md`: WCAG 2.1 AA, keyboard patterns, screen reader, contrast, focus, motion
- Include PR-review checklist and code examples
- **Test:** Guidelines cover all major concerns; examples runnable

**Task 20: CI Accessibility Checks** ➕ (extend existing `.github/workflows/test.yml`)

- Add `npm run test:a11y` step to the **existing** workflow (do not create a new workflow)
- Zero critical violations threshold; upload report artifact; PR comment summary
- **Test:** CI runs a11y checks on every PR; critical violations block merge

### Sprint 6: Keyboard Navigation & Focus Management

**Task 21: Audit Keyboard Navigation** ➕

- Test all pages: Tab/Shift+Tab/Enter/Space/Escape/Arrows
- Document in `docs/KEYBOARD_NAVIGATION_AUDIT.md`; fix focus traps, missing indicators, tab order, skip links
- **Test:** All interactive elements keyboard-reachable; visible focus everywhere

**Task 22: Focus Management System** ➕

- Create `client/lib/focus-management.ts`: `trapFocus`, `restoreFocus`, `announceToScreenReader`
- Apply to dialogs, dropdowns, command launcher; restore focus after route changes
- **Test:** Focus trapped in modals, restored on close, no loss after async ops

**Task 23: Enhance Focus Indicators** 🔧 (global `:focus-visible` exists in `global.css`)

- Audit component-level focus styles against the global baseline; verify 3:1 contrast on all theme backgrounds
- Document the focus indicator specification
- **Test:** Focus visible on all interactive elements; consistent across components

**Task 24: Add Skip Navigation Links** ➕

- Add skip link + `id="main-content"` targets to page layouts (landing, dashboard, auth)
- Style to appear on focus only (`.sr-only` pattern already available in `global.css`)
- **Test:** Tab on load reveals skip link; activation moves focus to main content

### Sprint 7: Screen Reader Compatibility

**Task 25: Screen Reader Audit** ➕

- Test with NVDA (Windows) + VoiceOver (macOS); document in `docs/SCREEN_READER_AUDIT.md`
- **Test:** All key pages tested; issues rated with remediation plan

**Task 26: ARIA Landmarks** ➕

- Add `banner`/`navigation`/`main`/`contentinfo` landmarks with unique labels to all layout templates
- **Test:** Landmark navigation works; no duplicate unlabeled landmarks

**Task 27: Form Accessibility** 🔧 (`form.tsx` FormField pattern exists)

- Audit `form.tsx` + `input.tsx`: label association, `aria-describedby` errors, `aria-required`
- Fix gaps; add form submission announcements (Task 28 utility)
- **Test:** All fields labeled; errors announced; required indication clear

---

## PHASE 3: PERFORMANCE & OPTIMIZATION

*Goal: Achieve Core Web Vitals targets and optimize resource loading.*

### Sprint 9: Core Web Vitals Baseline

**Task 33: Establish Performance Baseline** ➕

- Run Lighthouse on `/`, `/world`, `/navigator`, `/projects` (3× each, averaged)
- Record LCP/FID-or-INP/CLS/TTFB/TBT in `docs/PERFORMANCE_BASELINE.md`
- Targets: LCP < 2.5s, INP < 200ms, CLS < 0.1
- **Test:** Baseline documented with targets

**Task 34: Real User Monitoring** ➕

- Install `web-vitals`; create `client/lib/performance-monitor.ts` initialized from `client/src/main.tsx`
- Send metrics to analytics endpoint; simple trend dashboard
- **Test:** Metrics captured per page load and delivered

**Task 35: Critical Rendering Path** ➕

- Inline critical above-fold CSS; defer non-critical; verify no render-blocking scripts
- Font preconnect already present in `index.html` — extend where needed
- **Test:** First paint improved; no render-blocking resources

**Task 36: Font Loading Optimization** ➕

- `font-display: swap` already set via Google Fonts URL — add `preload` for critical self-hosted fonts if introduced, `font-size-adjust` fallbacks to prevent layout shift
- Audit the 7-family Google Fonts request in `index.html`; trim to essential families
- **Test:** No layout shift on font swap; minimal font payload

### Sprint 10: Asset Optimization

**Task 37: Image Optimization** 🔧

- `scripts/optimize-all-media.mjs` exists (`npm run optimize:images`) — audit coverage and formats
- Add `<picture>`/srcset `OptimizedImage` component for responsive delivery; WebP/AVIF where missing
- **Test:** Modern formats served; fallbacks work; lazy loading correct

**Task 38: Video Loading Optimization** ➕

- Audit `/media/landing/scenes/` videos: WebM/MP4 codecs, poster images, `preload="none"`
- Intersection-based loading exists in CinematicScene — verify per-scene
- **Test:** Videos play within 2s of scroll; posters immediate; non-viewed scenes unloaded

**Task 39: Service Worker / PWA** 🔧 (dep already installed)

- `vite-plugin-pwa` is in devDependencies — **wire `VitePWA()` into `vite.config.ts` only**
- Cache strategies: static = cache-first, API = network-first, images = stale-while-revalidate
- Coordinate with Task 16 offline detection
- **Test:** SW registers; repeat visits served from cache; basic offline works

**Task 40: WebGL Performance** 🔧 (DPR clamp + quality detection exist)

- Verify `dpr={[1, 2]}` across all canvases; add frame-rate monitor + performance mode toggle
- Tune particle counts per device tier
- **Test:** 60 FPS mid-range, 30 FPS low-end, no context loss

### Sprint 11: JavaScript Optimization

**Task 41: Reduce JS Bundle Size** ➕

- `npx depcheck` for unused deps; ensure `sideEffects` flags; terser `drop_console` for production
- Replace oversized libs where justified
- **Test:** No unused deps; measurable bundle reduction

**Task 42: Third-Party Script Optimization** ➕

- Audit third-party scripts; `defer`/`async` non-critical; facade heavy widgets
- Evaluate self-hosting fonts vs Google Fonts CDN
- **Test:** No third-party render blocking

**Task 43: Component-Level Lazy Loading** ➕

- Lazy-load modals, charts (`recharts`), carousels via `React.lazy` + `Suspense` skeletons
- **Test:** Heavy components load on demand; skeletons shown; no layout shift

**Task 44: Optimize React Rendering** ➕

- React DevTools Profiler pass; targeted `memo`/`useMemo`/`useCallback`; virtualize long lists (`@tanstack/react-virtual` if justified)
- **Test:** No unnecessary re-renders; interaction response < 100ms

---

## PHASE 4: COMPONENT LIBRARY & DEVELOPER EXPERIENCE

*Goal: A documented, tested, developer-friendly component library.*

### Sprint 13: Component Documentation

**Task 49: Setup Storybook** ➕

- `npx storybook@latest init` (Vite + React + TS); docs addon; theme matched to FeexSystems design
- **Test:** Storybook at localhost:6006 with hot reload and docs tab

**Task 50: Document Core Components** ➕

- Stories for priority components (from `docs/COMPONENT_PRIORITY.md`): default/variants/sizes/playground/a11y notes
- **Test:** All core components documented; props tables auto-generated

**Task 51: Component Examples & Recipes** ➕

- Pattern stories: form layout, card grid, navigation, data display, modal workflow
- **Test:** Examples copy-paste ready and functional

**Task 52: Design Tokens Documentation** ➕

- Create `docs/DESIGN_TOKENS.md` (colors, type, spacing, radii, shadows, durations) with visual examples; expose as Storybook "Design System" section
- **Test:** All tokens documented with visuals

### Sprint 14: Component Testing

**Task 53: Unit Tests for Core Components** ➕

- Test files colocated per conventions used in `client/test/components/`; 80%+ coverage on priority components
- Run `npm test -- --coverage`
- **Test:** 80%+ coverage; no failing tests

**Task 54: Visual Regression Tests** 🔧 (Playwright exists)

- Use `expect(page).toMatchSnapshot()` in dedicated `@visual` project (from Task 3)
- Baselines for variants, states, responsive breakpoints; CI diff on PR
- **Test:** Visual diffs detected; CI fails on regression

**Task 55: Interaction Tests** ➕

- `@testing-library/user-event` already installed — click/input/dropdown/modal/keyboard tests
- **Test:** Interactions simulate real usage; edge cases covered

**Task 56: Per-Component Accessibility Tests** ➕ (CORRECTED)

- Use **`vitest-axe`** (NOT jest-axe — stack is Vitest) + `@axe-core/playwright` for E2E
- Add to all priority component tests; document waivers
- **Test:** Components pass axe; regressions blocked

### Sprint 15: Component Improvements

**Task 57: Enhance Button Component** ➕ — variants, loading spinner, disabled styling, icon positioning; update docs/tests
**Task 58: Enhance Input Component** ➕ — label association, error/helper states, icon affixes; update docs/tests
**Task 59: FormField Component** 🔧 — `form.tsx` exists: audit against needs (description/error slots, a11y wiring); extend rather than recreate
**Task 60: DataTable Component** ➕ — `@tanstack/react-table` new dep; sortable/filterable/paginated/selectable; glassmorphism styling; accessible + responsive

### Sprint 16: Developer Tooling

**Task 61: Component Generator** ➕

---

## PHASE 5: VISUAL POLISH & UX

*Goal: Production-quality visual design and user experience. Tasks 65–80 carry over from the original plan largely unchanged (all validated as genuine gaps); key notes below.*

### Sprint 17: Landing Page Polish

**Task 65: Audit Scene Transitions** — all 7 landing scene transitions: timing consistency, no content flash, poster crossfade, text readability; respect reduced motion
**Task 66: Enhance CinematicScene** — video loading/error/retry states, scene progress indicator, tests (component has an existing test to extend)
**Task 67: Improve WorldInspector** — open/close animation, keyboard navigation, loading skeleton, share, screen reader testing
**Task 68: Enhance CommandLauncher** — command history (localStorage), fuzzy search, usage-based suggestions, shortcuts display; thorough keyboard tests

### Sprint 18: Navigation Polish

**Task 69: Improve FullWidthNav** — dropdown keyboard nav + animation, active trail, mobile drawer gestures, search shortcut
**Task 70: Enhance AppleDock** — tooltip delay, click feedback, context menu, a11y labels, responsive behavior
**Task 71: Breadcrumb Integration** 🔧 — `breadcrumb.tsx` exists: integrate into dashboard/admin/evidence nested routes; responsive collapse; screen reader testing
**Task 72: Progress Indicators** — linear/spinner/skeleton variants for Navigator, Projects, Evidence; reduced-motion safe

### Sprint 19: Form & Input Polish

**Task 73: Form Validation UX** — real-time inline validation, error summary, auto-focus first error, character counters
**Task 74: Advanced Inputs** — SearchInput, CurrencyInput, DateInput, TagInput, CodeInput on the base Input API; a11y + Storybook
**Task 75: Search Experience** — Navigator history, suggestions, filters display, result highlighting, empty-state guidance, timeout indication
**Task 76: Copy & Share** — `CopyButton` / `ShareButton` components (Web Share API) on evidence, navigator results, inspector, code snippets

### Sprint 20: Animation & Motion

**Task 77: Animation Performance Audit** — 60 FPS profiling, layout thrashing, paint storms, GPU acceleration, memory
**Task 78: Micro-Interactions** — button press, card lift, link underline, toggle/checkbox animation, toast/modal transitions (reduced-motion safe)
**Task 79: Loading States** — branded skeletons/progress/logo animation for page load, route transitions, data fetching, images
**Task 80: Success/Error Animations** — checkmark, shake, pulse; consistent durations; non-blocking

---

## PHASE 6: CONTINUOUS IMPROVEMENT SYSTEMS

*Goal: Processes and tools for ongoing quality.*

### Sprint 21: Monitoring & Analytics

**Task 81: Error Tracking** ➕ (CORRECTED) — `@sentry/node` covers **server only**; install **`@sentry/react`** for client with source maps (note `sourcemap: false` in vite config — revisit), alerting, dashboards
**Task 82: User Analytics** — GA4/Plausible/PostHog; track page views, feature usage, search, command usage; privacy considerations
**Task 83: Performance Dashboard** — CWV trends, bundle history, error rates, uptime; thresholds + runbook
**Task 84: Feature Flags** — `client/lib/features.ts` + `useFeature()`; A/B, gradual rollouts, beta features

### Sprint 22: Testing Automation

**Task 85: Visual Regression in CI** — extend existing `test.yml` (not new workflow); baseline storage; PR diff comments; easy baseline updates
**Task 86: Accessibility CI Checks** — extend `test.yml` with `test:a11y`; critical violations block merge; report artifact; score tracking
**Task 87: Performance Budget CI** — add `@lhci/cli` + `lighthouserc.js` assertions; extend `test.yml`; track scores
**Task 88: E2E Critical Flows** — Playwright suite **exists** (13 specs incl. auth, navigation, omni-command, protected-routes, smoke): close gaps, de-flake, run on every PR

### Sprint 23: Documentation & Knowledge Base

---

## Summary & Success Metrics

### Phase Deliverables Summary (v2)

| Phase | Focus | Tasks | Status Notes |
|-------|-------|-------|--------------|
| 1 | Foundation & Stability | 19 | 1 ✅ verified, 6 🔧, 12 ➕ — Sprint 2 audit/priority/test templates added |
| 2 | Accessibility & Compliance | 16 | 2 ✅→verify, 2 🔧, 12 ➕ — highest-value phase |
| 3 | Performance & Optimization | 16 | 1 ✅, 3 🔧 (deps installed), 12 ➕ |
| 4 | Component Library & DX | 16 | 2 🔧, 14 ➕ (incl. greenfield ESLint) |
| 5 | Visual Polish & UX | 16 | 1 🔧 (breadcrumb exists), 15 ➕ |
| 6 | Continuous Improvement | 16 | 1 🔧 (E2E suite exists), 15 ➕ |

### Success Metrics (corrected baselines)

| Metric | Current (verified) | Target | Measurement |
|--------|--------------------|--------|-------------|
| Lighthouse Performance | not yet measured | 90+ | Lighthouse CI (Task 87) |
| Lighthouse Accessibility | not yet measured | 95+ | Lighthouse CI (Task 87) |
| Initial JS Bundle | to be measured (Task 9) | <500 kB gzip | bundlesize (Task 12) |
| UI Component Test Coverage | ~0% (50+ auth tests exist) | 80% | Vitest coverage |
| WCAG Critical Violations | unmeasured (no axe installed) | 0 | vitest-axe + @axe-core/playwright |
| Build Time | unmeasured | <2 min | `scripts/measure-build.js` |
| Component Documentation | 0 / 49 components | 100% | Storybook |
| TypeScript Strict | `strict: true` ON; 4 flags off | all flags ON | `npm run typecheck` |
| ESLint | none (greenfield) | configured + CI | `npm run lint` |

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Prioritized tasks with acceptance criteria; ✅/🔧/➕ status prevents rework |
| Solo developer burnout | Verification-only tasks absorb slack; sustainable pace |
| Breaking changes | Existing Vitest + Playwright suites; visual regression baselines |
| A11y regressions | Automated CI checks from Sprint 5 onward |
| Performance regressions | Budget enforcement (Tasks 12/87) + monitoring (Tasks 34/83) |

### Continuous Improvement Cadence (post Phase 6)

1. **Weekly:** performance metrics + error reports
2. **Bi-weekly:** accessibility feedback, dependency updates
3. **Monthly:** component audit, analytics review
4. **Quarterly:** full Lighthouse audit, major dependency upgrades
5. **Annually:** comprehensive accessibility audit, architecture review


**Task 89: Component Docs Site** — build Storybook static site; deploy (GitHub Pages/Vercel); search + versioning
**Task 90: API Documentation** — OpenAPI 3 spec for `/api/*` routes; Swagger/Redoc; deploy with docs
**Task 91: User Guide** — `docs/USER_GUIDE.md` covering landing, Navigator, World, Evidence, dashboard with screenshots
**Task 92: Contributor Guide** — root `CONTRIBUTING.md` (repo has none): code of conduct, setup, PR process, standards; issue/PR templates

### Sprint 24: Automation & Tooling

**Task 93: Release Automation** — GitHub Actions release workflow (extend existing `deploy.yml` patterns): version bump, changelog, artifacts, semver
**Task 94: Dependency Updates** — `.github/dependabot.yml` weekly npm; auto-merge patches/dev deps; security alerts
**Task 95: Code Quality Automation** — SonarQube/CodeClimate quality gates (coverage, complexity, duplication) on PRs
**Task 96: Developer CLI** — `scripts/cli.js` conveniences: dev, test, component, analyze, docs, lint, typecheck with helpful output


- `plop` with templates: component + test + story + docs stub
- **Test:** Generator output compiles and passes tests

**Task 62: ESLint Setup (GREENFIELD)** ➕

- **No ESLint exists today.** Install ESLint 9 flat config: `typescript-eslint`, `react-hooks`, `jsx-a11y`, `import`
- Add `npm run lint` + `lint:fix`; wire into existing `test.yml` CI
- **Test:** Lint runs clean or with documented baseline; CI enforces

**Task 63: TypeScript Strict Residuals** 🔧

- `strict: true` already on. Flip remaining: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess` — fix fallout incrementally
- **Test:** `npm run typecheck` clean with all flags on

**Task 64: Development Documentation** ➕

- `client/DEVELOPMENT.md`: setup, workflow, testing, component creation, styling/import conventions, PR requirements
- **Test:** Documentation accurate; workflows reproducible


### Sprint 12: Network Optimization

**Task 45: API Response Caching** ✅ → verify only

- React Query configured in `App.tsx` (`staleTime` 5m, `gcTime` 10m, 401-aware retry)
- Verify aggressive caching for World Model endpoints; add optimistic updates where beneficial
- **Test:** Repeated queries served from cache

**Task 46: Request Compression** 🔧 (dep already installed)

- `vite-plugin-compression2` in devDependencies — **wire into `vite.config.ts` build plugins**
- Verify Express compression for API responses in production mode
- **Test:** br/gzip headers on text responses; measurable size reduction

**Task 47: Prefetching** ➕

- React Router 7 `Link prefetch` on primary nav targets; prefetch critical API data on landing
- **Test:** Hover-prefetch visible in Network tab; navigation feels instant

**Task 48: SSE / Real-Time Optimization** ➕

- Audit `/api/world-model/telemetry/stream` and `/omni-command/stream`: heartbeats, reconnection, batching, leak checks
- **Test:** Stable streams; reconnect after failure; no memory leaks


**Task 28: Live Region Announcements** ➕

- Create `client/lib/announcements.ts` with polite/assertive priorities; add live region to app root in `client/src/main.tsx`
- Use for form results, loading states, navigation changes, command execution
- **Test:** Announcements fire at appropriate times without spam

### Sprint 8: Color & Motion Accessibility

**Task 29: Color Contrast Audit** ➕

- Audit all text/background combos; document in `docs/CONTRAST_REPORT.md`
- Add contrast tokens to CSS (`--text-on-dark`, `--text-muted`)
- **Test:** All text meets 4.5:1 / 3:1; automated contrast check passes

**Task 30: Reduced Motion Support** ✅ → component verification only

- Global `@media (prefers-reduced-motion: reduce)` block exists in `global.css`
- Verify per-component behavior: MagneticGlowButton, carousels, WarpStarfield, TransitionVisualizer, framer-motion sequences
- Fix any components that bypass the global rule (e.g., JS-driven animations)
- **Test:** OS reduced-motion disables all significant animation; no information loss

**Task 31: High Contrast Mode** ✅ → component verification only

- Global `@media (forced-colors: active)` block exists in `global.css`
- Verify all components render in Windows High Contrast; add system-color focus states where missing
- **Test:** Content visible and interactive elements indicated in forced-colors mode

**Task 32: Accessibility Compliance Report** ➕

- Create `docs/ACCESSIBILITY_COMPLIANCE_REPORT.md`: WCAG criteria status, methodology, known issues, timeline
- **Test:** Report accurate to current implementation

- Verify existing 404 quality; add recovery suggestions per error type
- **Test:** Each state renders correctly at all screen sizes; recovery actions functional

**Task 16: Implement Offline Detection** ➕

- Create `client/hooks/useOnlineStatus.ts`; add offline indicator + toast; queue retryable actions
- Optional service worker (coordinate with Task 39 PWA)
- **Test:** Status detected < 1s; user notified; queued actions retry on reconnect

- Per component: path, dependencies, props interface, a11y features, test status, usage, status icon
- **Demo:** Complete inventory with no undocumented components

**Task 6: Accessibility Audit per Component** ➕

- Assess each component against WCAG 2.1 AA: ARIA, keyboard, focus, screen reader, contrast
- Create `client/components/ui/ACCESSIBILITY_REPORT.md` with checklist + severity
- **Demo:** Component-by-component compliance status

**Task 7: Create Component Test Templates** 🔧

- `client/test/templates/` exists — verify it covers render/props/a11y/keyboard/focus cases
- Add missing templates; extend `client/test/README.md`
- **Demo:** New component test created from template passes

**Task 8: Identify High-Impact Components** ➕

- Rank by usage frequency × complexity × a11y impact (start: `button`, `input`, `card`, `dialog`, `form`, `select`, `command`)
- Create `docs/COMPONENT_PRIORITY.md`
- **Demo:** Priority matrix with top 10 components
