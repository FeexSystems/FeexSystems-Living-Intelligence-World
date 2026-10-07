# Component Priority Matrix

> **Created:** 2026-10-07 (Sprint 2, Task 8 of [FRONTEND_MODERNIZATION_PLAN.md](./FRONTEND_MODERNIZATION_PLAN.md))
> **Inputs:** usage counts + LOC + a11y findings from [`client/components/ui/COMPONENT_INVENTORY.md`](../client/components/ui/COMPONENT_INVENTORY.md)

## Ranking Method

`priority = usage frequency × complexity (LOC) × a11y risk multiplier`

A11y risk multiplier: **3** = interactive with source score ≤ 2 (flagged ❌),
**2** = form/semantic spine, **1** = Radix baseline, **0.5** = static display.
All 49 components start at **0 tests** — testing weight is equal everywhere
until Sprint 14, so ranking is driven by blast radius × risk.

## Top 10 (improvement order)

| # | Component | Uses | LOC | A11y | Why it ranks here | Sprint assignments |
|---|-----------|------|-----|------|-------------------|--------------------|
| 1 | **input** | 31 | 23 | ❌ 1 | Most-used *flagged* component; every form depends on caller-managed labels/errors (findings H2) | S14 tests + **S15 Task 58** enhancement |
| 2 | **button** | 63 | 58 | 4 | Highest blast radius in the app; variants/loading/focus are exercised everywhere | S14 tests + **S15 Task 57** |
| 3 | **form** | 4 | 178 | ✅ 7 | The a11y role-model (`aria-describedby`/`aria-invalid`); must become the default path (M1) | S14 tests + **S15 Task 59** audit |
| 4 | **ErrorBoundary** | 1 | 175 | ❌ 0 | Router-level fallback with no `role="alert"` (finding H1); wraps the entire app | **S4 Task 13** + S14 tests |
| 5 | **card** | 52 | 87 | 2 | Second-most used; structural semantics/heading guidance (M2) | S14 tests |
| 6 | **dialog** | 13 | 121 | 5 | Focus trap/restore is the highest-risk interaction pattern (Sprint 6 verification) | S6 Task 22 + S14 tests |
| 7 | **badge** | 46 | 37 | 1 | Third-most used; color-only-meaning risk (WCAG 1.4.1) at scale | S8 contrast audit + S14 tests |
| 8 | **textarea** | 6 | 23 | ❌ 1 | Same label/error gap as input (finding H3) | S15 Task 58 scope |
| 9 | **select** | 18 | 159 | 4 | Complex Radix wrapper, high form usage; needs interaction tests | S14 tests |
| 10 | **tabs** | 17 | 52 | 4 | High usage; keyboard arrow-key behavior must be verified with our styling | S14 tests |

## Tier 2 — next wave (Sprint 14 continuation)

`dropdown-menu` (12) · `label` (15) · `separator` (9) · `alert` (6, M3) ·
`scroll-area` (6) · `avatar` (5) · `checkbox` (4) · `switch` (4) · `table` (4, M2) ·
`popover` (3) · `tooltip` (3) · `calendar` (2, H4) · `toast` (2) · `progress` (21 —
tested via dashboard flows)

## Tier 3 — unused (document in Sprint 13 Storybook or review for removal in Sprint 15)

`sidebar` (770 LOC — decide: adopt/document/remove) · `chart` (364, M2) ·
`carousel` (261) · `menubar` (235) · `context-menu` (199) · `command` (154 —
verify against existing CommandLauncher) · `navigation-menu` (129) ·
`pagination` (118) · `drawer` (117) · `input-otp` (70) · `accordion` (57) ·
`toggle-group` (60) · `radio-group` (43) · `resizable` (44) · `collapsible` (10) ·
`aspect-ratio` (6) · `hover-card` (28)

## Coverage Targets

| Milestone | Target |
|-----------|--------|
| After Sprint 14 | Top 10 tested (render/props/a11y/keyboard) — est. +10 test files |
| After Sprint 15 | Tier 1 enhancements landed (input/button/form) |
| Phase 4 exit | ≥ 80 % coverage across all *used* components (32) |
