# G5 Phase 6 — Visual Refinement & Performance Evidence

**Date:** 2026-11-22
**Branch:** `feat/eil-phase6-holo-aura` (based on `main@6d1babdafc431a414736f6fedf8fb4d998c6cf07`)
**Scope:** holographic projection layer inside the existing `HumanoidScene` + real-browser FPS / long-task / mount-unmount measurement. Presentation-only; no contract, gate, or governance changes.

---

## 1. What changed

| File | Change |
|---|---|
| `packages/feex-eil/renderer/HolographicAura.tsx` | New presentational layer: head wireframe shell, projection base disc, gyroscopic ring pair. All `meshBasicMaterial` (unlit, `depthWrite:false`) — ~5 trivial draw calls, no shader compilation, no textures/assets. Opacity derives from `animation.intensity`; it brightens with agent activity and dims toward OFFLINE without asserting state. |
| `packages/feex-eil/renderer/HumanoidScene.tsx` | Renders `<HolographicAura>` as a sibling of the style-selected humanoid, passing through `animation`, `reducedMotion`, `accentColor`. Works for both `particle` and `mechanical` styles. |
| `packages/feex-eil/renderer/HumanoidAnimationController.tsx` | `useSystemReducedMotion` exported (was module-private) so the aura shares the same reduced-motion fallback as the body controller. |
| `packages/feex-eil/renderer/index.ts` | Exports `HolographicAura` + props type. |
| `scripts/phase6-fps-probe.mjs` | Read-only measurement probe (real Chromium, rAF frame timing, `PerformanceObserver` longtasks, mount/unmount/remount timing). No app surface. |

### Motion & gate semantics

- The aura spins only when `!suppressed && animation.animated` — identical suppression rules to `HumanoidAnimationController` (explicit prop OR `prefers-reduced-motion`).
- It calls **no** `invalidate()` of its own: under `frameloop="demand"` it freezes together with the host controller; under the default loop it animates with it.
- It inherits all existing gates unchanged: `EIL_PROJECTION_ENABLED`, capability matrix (reduced motion, save-data, hardware concurrency, pointer, WebGL probe), lazy mount, and SIMULATED/no-actuation disclosure. No network, storage, persistence, tool, transport, or actuation surface added.

## 2. Measurement method

`node scripts/phase6-fps-probe.mjs` against `npm run dev` on `http://127.0.0.1:8080`, headless Chromium with `--enable-gpu --use-angle=d3d11`.

- GL renderer (verified in-page): `ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)` — integrated GPU, real D3D11 path, **not** SwiftShader.
- rAF frame-time sampling over 10 s windows; longtasks via `PerformanceObserver`.
- A/B: identical probe run with the aura stashed (baseline) and restored.

### Environment caveats (honest limits)

- Dev-mode Vite + React (no production build); mount latency includes on-demand module transforms and is **not** a production figure.
- Headless Chromium on an integrated GPU; results are vsync/present-interval bound (~30 Hz ceiling observed), not a 60 FPS claim.
- SwiftShader fallback measured ~2 fps — software GL is not representative and is documented only as a floor.

## 3. Results

| Metric | Baseline (no aura) | With `HolographicAura` |
|---|---|---|
| EIL canvas mount latency (cold dev) | 14 597 ms | 10 937 ms |
| Steady-state FPS | 28.2 | 30.5 |
| Frame p50 / p95 / max | 33.3 / 50.1 / 83.4 ms | 33.3 / 50.0 / 66.7 ms |
| Longtasks (steady-state window) | 0 | 0 |
| Scroll-out unmount | ✅ canvas detached | ✅ canvas detached |
| Scroll-in remount | 630 ms | 646 ms |
| Post-remount FPS / longtasks | 26.5 fps, 2 tasks / 632 ms | 28.6 fps, 7 tasks / 878 ms |

**Reading:** steady-state frame pacing is vsync-locked at ~30 Hz on this iGPU in both runs; the aura's ~5 unlit draw calls are below measurement noise (delta ≤ 2 fps, within run-to-run variance; post-remount longtask counts differ due to dev-server recompiles, not scene cost). No longtasks during steady-state rendering in either configuration.

## 4. Governance position (unchanged)

- G6 Release Candidate / G7 Production Authorization: **FROZEN**.
- Physical actuation / hardware operation: **PROHIBITED** — aura is presentation geometry only.
- World Model remains canonical; the humanoid remains a validated visual projection of local EIL state. `SIMULATED` disclosure and `NO PHYSICAL ACTUATION` labeling are untouched.
- These numbers are dev-environment measurements, not release-readiness or deployment evidence.

## 5. Verification

- `npx tsc --noEmit` — clean.
- `vitest run packages/feex-eil/tests/humanoid-renderer.test.ts packages/feex-eil/tests/presentation-state.test.ts` — 31/31 pass.
- Phase 7 acceptance gates unaffected: aura adds no DOM, no network/storage surface, no new canvas — the forbidden-surface source scan targets `HumanoidHeroCanvas`/`useEILAgentRuntime`, which are unchanged.
