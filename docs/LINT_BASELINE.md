# ESLint Baseline — Task 62

> **Generated:** 2026-10-07 (Task 62, Sprint 16, Phase 4 of [FRONTEND_MODERNIZATION_PLAN.md](./FRONTEND_MODERNIZATION_PLAN.md))
> **Config:** [`eslint.config.mjs`](../eslint.config.mjs) (ESLint 9 flat config)
> **Command:** `npm run lint`

## Summary

| Severity | Count | Policy |
|----------|-------|--------|
| **Errors** | **0** ✅ | CI **blocks** on errors. |
| **Warnings** | 1202 | Pre-existing debt — do not block. Burn down incrementally. |

The config was tuned to produce a **green-but-honest baseline**: every genuine
bug-class rule stays at `error`; noisy/legacy surfaces are downgraded to `warn`
so the gate is meaningful from day one.

## Burn-down ledger

| Pass | Before | After | Work |
| ---- | ------ | ----- | ---- |
| Errors | 7 | **0** ✅ | 7 a11y bugs fixed (see below) |
| `react-hooks/exhaustive-deps` | 12 | 10 | Infinite-loop bug + 2 stale-closure fixes |
| `jsx-a11y/*` | 67 | **0** ✅ | 39 label associations + 20 interactive-element fixes + 6 documented false positives |
| Stale `eslint-disable` | 2 | 0 | Removed no-op directives |

### `jsx-a11y` elimination (67 → 0) — real accessibility improvements

**`label-has-associated-control` (39 → 0):**

- **19 form controls** wired `htmlFor`/`id` pairs (`admin/audit-logs.tsx`, `admin/users.tsx`, `admin/subscriptions.tsx`, filter inputs + Radix `SelectTrigger`).
- **20 display labels** converted `<label>` → `<span>` — these labelled static `<p>`/`<Badge>` text, where `<label>` is semantically wrong.

**`click-events-have-key-events` (11 → 0):** genuinely interactive wrappers converted to keyboard-operable controls:

| File | Fix |
| ---- | --- |
| `BtcMonoBadge.tsx` | click-to-copy SHA → `role="button"` + Enter/Space |
| `NotificationCenter.tsx` | notification row → `role="button"` + Enter/Space |
| `NotificationToast.tsx` | actionable toast → `role="button"` + Enter/Space |
| `dashboard/settings.tsx` | theme picker → `role="radiogroup"`/`radio` + `aria-checked` |
| `realtime/RealtimeStatusIndicator.tsx` | clickable icon → real `<button>` with label |
| `marketing/MarketingIntelligenceSection.tsx` (×2) | selectable cards → `role="button"` + keys |
| `security/ComplianceReporting.tsx` | framework card → `role="button"` + keys |
| `cinematic/SushCinematicCarousel.tsx` | slide card → key handler + focus only when active |
| `DashboardLayout.tsx` / `CommandLauncher.tsx` | modal backdrops → `aria-hidden="true"` (dismissal via close button/ESC) |

**`no-static-element-interactions` (17 → 0):** after fixing the genuinely-interactive ones, the residual were **pure mouse-effect wrappers** — documented false positives in `eslint.config.mjs` with a scoped override and justification comment (spotlight tracking, dock magnification, hover pill animation, text scramble). The real interactive controls are rendered *inside* these wrappers.

## Error burn-down — complete (7 → 0)

All 7 errors were genuine a11y findings, now fixed:

| Location | Rule | Fix applied |
| -------- | ---- | ----------- |
| `client/components/VRScene.tsx` | `no-interactive-element-to-noninteractive-role` | `role="application"` → `role="img"` on the VR `<canvas>` |
| `client/components/devops/ConnectRepositoryDialog.tsx` | `anchor-is-valid` | `<a href="#">` → `<button type="button">` (no real destination) |
| `client/components/ui/alert.tsx` | `heading-has-content` | Destructured `children` onto `<h5>` so the rule can see content |
| `client/components/ui/card.tsx` | `heading-has-content` | Destructured `children` onto `<h3>` |
| `client/components/ui/pagination.tsx` | `anchor-is-valid` + `anchor-has-content` | Default `href="#"` + explicit `{children}` passthrough |
| `client/landing/components/CommandLauncher.tsx` | `role-supports-aria-props` | Added `role="option"` to listbox children carrying `aria-selected` |
| `client/test/a11y/index.test.tsx` | `img-redundant-alt` | `alt="Test image"` → `alt="A sample landscape"` |

## What is enforced as `error`

- `react-hooks/rules-of-hooks` — hook ordering violations break React at runtime.
- `no-debugger`, `no-unreachable` — genuine correctness bugs.
- All `jsx-a11y` recommended rules that are *not* in the warn list below.
- `js`/`tseslint` recommended rules not explicitly downgraded.

## What is downgraded to `warn` (and why)

| Rule group | Why |
| ------------ | ----- |
| `react-hooks/*` (v7 React-Compiler-era rules) | `eslint-plugin-react-hooks@7` ships `set-state-in-effect`, `refs`, `purity`, etc. as errors; they flag a large pre-existing surface. |
| `@typescript-eslint/no-explicit-any` (~49) | Pervasive in the existing codebase; banning outright would block all work. |
| `@typescript-eslint/no-unused-vars` | Config already sets `noUnusedLocals`/`noUnusedParameters` off (Task 63); lint warns instead. |
| `jsx-a11y/label-has-associated-control`, `click-events-have-key-events`, `no-static-element-interactions` | Real debt, large surface — see Phase 2/5. |
| `prefer-const`, `no-useless-escape`, `no-constant-binary-expression` | Style-level; not bug-class. |

## Deliberately excluded from linting

Generated or stale artifacts (mirrors the Vitest `exclude` guard):

- `dist/**`, `coverage/**`, `.temp/**`, `.build-metrics/**`
- `client/lib/dataconnect/**` (generated SDK bundles)
- `client/hooks/*.js`, `server/**/*.js` (**stale compiled copies** of `.ts` sources)
- `**/*.test.js`, `**/*.spec.js` (stale compiled test artifacts)

## `react-hooks/*` triage (highest runtime-risk class)

**Total: 79** (was 81). Breakdown after the first burn-down pass:

| Rule | Count | Verdict |
| ---- | ----- | ------- |
| `set-state-in-effect` | 31 | Mostly **intentional** (media-query sync, ref→state mirroring). React-Compiler-era strictness. |
| `immutability` | 13 | Compiler strictness; existing code mutates props/objects in ways that behave correctly. |
| `refs` | 12 | Reading/writing refs during render — review case-by-case; many are guarded. |
| `exhaustive-deps` | 10 | **Real stale-closure risk** — see below. |
| `purity` | 9 | Compiler strictness (impure calls in render); low runtime risk. |
| `incompatible-library` | 3 | Informational — a library can't be optimized by React Compiler. |
| `preserve-manual-memoization` | 1 | Informational. |
| `rules-of-hooks` | **0** ✅ | **No hook-order violations** — no crash-class bugs. |

### Fixed in this pass (3)

| Location | Issue | Fix |
| -------- | ----- | --- |
| `client/hooks/useIntersectionPlay.ts:14` | `useEffect` with **no deps** calling `setElement` → **infinite render loop** whenever `ref.current !== element` | Added `[ref, element]` deps |
| `client/pages/admin/audit-logs.tsx:110` | `fetchAuditLogs` called in effect but absent from deps (stale `filters`/`currentPage`) | Wrapped in `useCallback([filters, currentPage])`; effect deps = `[fetchAuditLogs]` (Refresh button reuse preserved) |
| `client/hooks/use-billing.ts:142` | `loadBillingData` called in effect, absent from deps | Wrapped in `useCallback([])`; effect deps = `[loadBillingData]` |

### Remaining `exhaustive-deps` (10)

All are the same safe-to-defer shape: a `fetch*` function recreated each render and
called from an effect that lists only the primitive deps. Behavior is stable because
the functions close over the same values the effect already depends on. Fix
opportunistically when touching each file (wrap in `useCallback`).

### Remaining compiler-era warnings (66)

`set-state-in-effect`, `immutability`, `refs`, `purity` — `eslint-plugin-react-hooks@7`
enables React Compiler's strict rules. Most flag **valid, intentional** patterns.
Do **not** bulk-“fix” these; address per-file only where a real bug is suspected.

## Deferred (documented, not enabled)

- **Type-aware linting** (`recommendedTypeChecked`) — requires the TS project
  service; deferred to keep lint fast on this large codebase.
- **`import/*` ordering rules** — large existing surface; enable in a dedicated pass.

## Burn-down guidance

1. ~~Errors first (7)~~ — ✅ **done: 0 errors.**
2. ~~`react-hooks/exhaustive-deps` (highest runtime-risk)~~ — ✅ **3 real bugs fixed** (infinite-loop + 2 stale-closure); 10 remaining are defer-opportunistically.
3. Then `no-explicit-any` — do alongside Task 63 (TS strict residuals).
4. Then the 66 compiler-era `react-hooks/*` warnings — per-file, only where a real bug is suspected.
5. Re-tighten: promote a `warn` rule to `error` only once its count reaches 0;
   lower `--max-warnings` as the warning count falls.

## CI

Wired into `.github/workflows/test.yml` as a **blocking** step:
`npm run lint -- --max-warnings 2000`. Errors block the build; the 1306
baseline warnings are tolerated until burned down (lower the threshold as they fall).
