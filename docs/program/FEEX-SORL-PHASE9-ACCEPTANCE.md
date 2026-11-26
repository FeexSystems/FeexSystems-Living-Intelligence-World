# FEEX-SORL Phase 9 — Visual, Functional & Performance Acceptance Report

**Document ID:** FEEX-SORL-P9-ACCEPTANCE-001
**Branch:** `feat/feex-sorl-lab`
**Date:** 2026-11-24
**Status:** PARTIAL PASS — all agent-executable acceptance items pass; items gated on
Blender authoring (Phase 2/3/4) and OpenJarvis (Phase 8) remain blocked as documented.

---

## 1. Environment

| Item | Value |
|---|---|
| Dev server | `npm run dev` (Vite) on `http://localhost:8081` (8080 was occupied by a stale process) |
| Production build | `vite build` PASS — `✓ built in 3m 32s`, `dist/spa` emitted |
| Build caveat | `npm run build:client` requests `--max-old-space-size=8192`; this host has 8 GB RAM / ~2.7 GB commit free, so esbuild OOM'd (`VirtualAlloc errno=1455`). Build verified with `--max-old-space-size=3072`. Environmental, not a code defect. |
| Browser | Playwright (Chromium) via MCP, desktop 1440×900 and mobile 390×844 |
| Blender / Unreal / Python | NOT available on this host — GLB chunk acceptance deferred |

## 2. Automated gates — all PASS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | clean (landing + effects tsconfigs) |
| Lab zone graph | `vitest client/test/lib/lab-zone-graph.test.ts` | 8/8 |
| Lab presentation | `vitest client/test/lib/lab-presentation.test.ts` | 10/10 |
| World Model projection | `vitest client/test/lib/lab-world-model.test.ts` | 5/5 |
| Humanoid overlay disclosure | `vitest client/test/components/HumanoidHeroOverlay.test.tsx` | 3/3 |
| Landing composition | `vitest client/test/landing/LandingComposition.test.tsx` | 13/13 |
| One-Canvas rule | `node scripts/verify-no-duplicate-humanoid-canvas.mjs` | OK — exactly one landing humanoid Canvas (`HumanoidStage`) |
| Actuation honesty | `node scripts/verify-no-physical-actuation-surface.mjs` | OK — no unnegated physical-actuation / live-agent claims |
| Lab manifest/assets/provenance | `verify-feex-lab-{manifest,assets,provenance}.mjs` | N/A — no GLB manifest exists yet (requires Blender assembly output) |

**Total: 39/39 unit tests pass.**

## 3. Real-browser acceptance (Playwright, `http://localhost:8081/`)

| Plan §Phase 9 item | Result | Evidence |
|---|---|---|
| Six zones reachable | PASS (logic) | Dock renders OVERVIEW + HUMANOID node + 6 zones; `aria-pressed` tracks target; visited `•` markers set per zone. Zone geometry/inspectors unit-tested (lab-zone-graph 8/8). In-scene GLB furniture pending Blender. |
| Equipment inspectors | PASS (projection) | lab-world-model 5/5; evidence inspector wired in scene. Physical equipment meshes pending GLB chunks. |
| Navigation & cancellation | PASS | Click AI → `aria-pressed=true`; retarget WORKSHOP→OVERVIEW mid-flight → OVERVIEW pressed, WORKSHOP keeps `•`. Waypoint graph restricts direct paths to overview↔humanoid (unit-tested). |
| Humanoid clips (11 required) | BLOCKED | `verify-feex-humanoid-clips.mjs public/models/feex-sovereign-synthetic.glb` → FAIL as expected: only 4 clips (Idle/Aware/Acknowledge/Explain), 0 morphs. Real character is Phase 3 MetaHuman-gated. |
| Facial expressions / speech lifecycle | BLOCKED | Same GLB gate; presentation→clip resolver + diagnostics shipped and unit-tested (10/10). |
| Error / offline behavior | PASS | API fetch failures degrade gracefully; `AssetErrorBoundary` + `EffectErrorBoundary` in tree; no unhandled errors on `/` (0 console errors). |
| Reduced motion | PASS | `prefers-reduced-motion: reduce` emulated; interact buttons disable; nav/scene honor `reducedMotion` flag; no layout breakage. |
| Keyboard / screen-reader | PASS | Native `<button>` dock with `aria-pressed`, `aria-label` on nav region, skip-link `#main-content`, focus-visible outlines. |
| Mobile / desktop | PASS | 390×844: dock wraps (`flex-wrap`), no horizontal overflow (`scrollWidth ≤ innerWidth`); 1440×900 clean. |
| GLB sizes / load time / memory / draw calls / frame time | PARTIAL | No production GLBs yet (greybox procedural). Dev-server load ~0.9 s TTFB; 0 console errors/warnings on `/`. Metrics to be captured when Blender chunks land. |
| Final screenshots/recordings | PARTIAL | `phase9-landing-hero.png` captured (viewport). Human visual review still required per plan §Phase 10. |

## 4. Defect found & fixed during acceptance

- **Ambiguous dock labels:** the nav rendered two `HUMANOID` buttons — the staging
  node (`humanoid`) and the zone (`humanoid-bay`, label derived from first word of
  the zone name). Fixed by adding an explicit `short` field to `LabZone`
  (`client/lib/lab/lab-zones.ts`) and using it in the dock
  (`client/landing/scenes/HumanoidHeroScene.tsx`). Labels are now unique:
  `OVERVIEW · HUMANOID · COMMAND · BAY · AI · ROBOTICS · BIO-RESEARCH · WORKSHOP`.

## 5. Exit assessment

Plan Phase 9 exit = "all acceptance criteria pass." **Not fully met** — correctly
so: the plan's own phasing makes GLB-dependent criteria impossible until Blender
authoring runs (no Blender/Python on this host) and the MetaHuman character clears
its license gate. Everything implementable in-repo is green: typecheck, 39 tests,
build, one-Canvas rule, actuation-honesty rule, live navigation/cancellation,
reduced-motion, a11y semantics, responsive layout, clean console.

**Recommended Phase 10 path:** push `feat/feex-sorl-lab`, open PR against the
plan-pinned baseline `main@de1e9a63c30b75227fda46b7ed39b92cd0b06181`, attach this
evidence bundle, and record the GLB/humanoid/OpenJarvis items as known-blocked in
the PR body. Merge requires independent human visual approval per plan.
