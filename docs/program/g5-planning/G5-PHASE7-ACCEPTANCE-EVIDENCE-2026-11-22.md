# Phase 7 — Landing Projection Playwright Acceptance Evidence

**Date:** 2026-11-22
**Suite:** `e2e/eil-landing-projection.spec.ts` (14 cases) via `e2e/playwright.eil.config.ts`
**Browser:** Chromium (Playwright `Desktop Chrome`, SwiftShader WebGL)
**Server:** `npm run dev` (Vite + Express) on `127.0.0.1:8080`
**Result:** **14/14 PASS** — final clean run 23.9m total, workers=1

## Execution environment notes

- `DATABASE_URL`/`REDIS_URL` supplied as unreachable-local placeholders; infrastructure init is non-blocking by design (Redis connection errors in server log are expected and unrelated to the projection).
- Suite fixes required for honest execution (see PR):
  - `page.goto` uses `domcontentloaded` — the cinematic hero holds `load` well past budget on cold Vite dev.
  - `#hero canvas` was ambiguous — the sibling `dot-transition` Effect renders its own canvas; all canvas assertions are scoped to the `div.pointer-events-none[aria-hidden]` EIL overlay.
  - Scroll assertions target the inner `.snap-y` snap container, not `window`.
  - Chromium launch args disable background timer throttling — without them headless timers ran ~10x slow and the demo THINKING window never settled inside assertion budgets.
  - Per-test timeout raised to 180s; dev-server page loads run 40–100s each.

## Verified behaviors

| # | Case | Result |
|---|---|---|
| 1 | reduced-motion pre-nav → no mount | PASS |
| 2 | save-data → no mount | PASS |
| 3 | low-power (≤4 cores) → no mount | PASS |
| 4 | coarse pointer → no mount | PASS |
| 5 | WebGL probe failure → no mount | PASS |
| 6 | hero leaves ≥50% view → projection unmounts | PASS |
| 7 | gates pass → lazy canvas + SIMULATED + NO PHYSICAL ACTUATION | PASS |
| 8 | overlay `pointer-events:none`; ENTER FEEX WORLD CTA navigates to `/world` | PASS |
| 9 | HUD exposes resolved committed presentation state (IDLE/THINKING) | PASS |
| 10 | bounded cursor zone: IDLE→AWARE inside, →IDLE outside | PASS |
| 11 | kill-switch source gates on all three surfaces | PASS |
| 12 | reduced-motion change after mount → unmount | PASS |
| 13 | no network/storage/RTDB/transport surfaces from projection | PASS |
| 14 | demo never claims SPEAKING; `/world` navigation unmounts projection | PASS |

## Boundaries

- Acceptance evidence covers the **landing showcase projection only**. It does not verify `/world` EIL runtime behavior, HoloKai session projection (Phase 5 unit-tested separately), or any release artifact.
- G6/G7 remain FROZEN. This record is not release or deployment authorization.
