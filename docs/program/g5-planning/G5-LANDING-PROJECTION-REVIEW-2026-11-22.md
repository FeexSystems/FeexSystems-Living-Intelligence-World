# G5 — Landing Humanoid Projection: Post-Merge Review Record

**Date:** 2026-11-22
**Reviewed merge:** PR #89 — `a15a5fc7ef1155dca99986ecc7b4a2bed14bc1ee` (head `5ece89bc8ea582a49669b4f63e760ce06a77d37d`)
**Review range:** `c2b2b9337f0f2f1df07be68e1d72746cd0ec2f88..a15a5fc7ef1155dca99986ecc7b4a2bed14bc1ee`
**Reviewer:** implementing agent (self-review; human spot-check recommended before treating as independent acceptance)
**Verdict:** **PASS WITH ONE REQUIRED CORRECTION (F1)** — merge stands; kill-switch compliance fix required before the showcase is described as governed by `EIL_PROJECTION_ENABLED`.

## 1. Scope reviewed

| File | Change |
|---|---|
| `client/landing/components/HumanoidHeroOverlay.tsx` | New — mount gate |
| `client/landing/components/HumanoidHeroCanvas.tsx` | New — lazy dedicated Canvas + runtime + badge |
| `client/landing/scenes/HeroScene.tsx` | Mounts overlay inside `fxLayer`; video/CTAs unchanged |
| `client/test/components/HumanoidHeroOverlay.test.tsx` | New — 4 gate tests |

## 2. Checks performed

| Check | Result |
|---|---|
| Capability gate requires ALL of: visible(≥50%), webgl, !reducedMotion, !saveData, !lowPower, !coarsePointer, !motionPaused | PASS — `HumanoidHeroOverlay.tsx:29-36` |
| Lazy chunk isolation | PASS — `React.lazy` + `Suspense`; build emits separate `HumanoidHeroCanvas-*.js` chunk; gated devices never fetch it |
| Hooks outside `<Canvas>` | PASS — runtime + demo `useEffect` in `HumanoidHeroCanvas` component body; Canvas subtree receives only committed event |
| SIMULATED disclosure | PASS (visual) — `DataSourceBadge label="SIMULATED"` + "NO PHYSICAL ACTUATION" text rendered whenever canvas mounts |
| Pointer/CTA safety | PASS — `pointer-events-none`, `aria-hidden="true"` on overlay root; hero Links unaffected |
| DPR safeguard | PASS — `dpr={[1, 1.5]}` (within AGENTS.md `[1,2]` clamp), `powerPreference: "low-power"` |
| Demo cycle legality | PASS — drives only `IDLE→THINKING→IDLE` via `applySignals({isLoading})` through the real planner/adapter; no fabricated evidence-gated states |
| Forbidden-surface audit | PASS — see §4 |
| Gate tests | PASS — 4/4 (`npx vitest run client/test/components/HumanoidHeroOverlay.test.tsx`, re-run on `main@9f96a65`) |

## 3. Findings

### F1 — P2 REQUIRED: landing surface bypasses `EIL_PROJECTION_ENABLED`

`HumanoidHeroCanvas.tsx:55` hardcodes `enabled={true}` on `EILProjectionSlot`, and `HumanoidHeroOverlay` does not consult `EIL_PROJECTION_ENABLED` at all. Consequence: setting the documented kill switch to `false` hides the projection on `/world` and sovereign surfaces but **the landing hero still lazy-loads the WebGL chunk, creates a GL context, runs the runtime and demo interval, and renders the humanoid**. This contradicts the register's "one switch disables projection on all surfaces" semantics.

**Required fix:** include `EIL_PROJECTION_ENABLED` in the overlay `allowed` predicate (short-circuits before the lazy import — also saves the chunk fetch) and pass the flag through to the slot rather than hardcoding `true`.

### F2 — Minor: `reducedMotion={false}` hardcoded

`HumanoidHeroCanvas.tsx:58` passes a literal instead of the detected capability. Currently safe only because the mount gate already excludes reduced-motion devices; pass the real capability value for defense-in-depth.

### F3 — Info: disclosure is visual-only

The SIMULATED badge sits inside the `aria-hidden` container, so assistive tech does not announce it. Acceptable for a decorative projection; noted for completeness.

## 4. Forbidden-surface audit (reproducible)

```
git diff c2b2b9337f0f2f1df07be68e1d72746cd0ec2f88..a15a5fc7ef1155dca99986ecc7b4a2bed14bc1ee \
  | grep -E '^\+' | grep -vE '^\+\+\+' \
  | grep -nE 'fetch\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon|axios|socket\.io|actuat|motor|servo'
```

Output: 1 hit — a doc comment in `HumanoidHeroCanvas.tsx` ("no physical actuation path"). **Zero executable forbidden-surface additions.**

## 5. Disposition

- PR #89 merge is **upheld** — no revert required.
- F1 must be corrected (small follow-up PR) before the landing projection is described as kill-switch-governed; until then its rollback path is the capability gates only.
- F2/F3 may be addressed in the same follow-up.
- This record does not authorize G6/G7, deployment, or actuation.
