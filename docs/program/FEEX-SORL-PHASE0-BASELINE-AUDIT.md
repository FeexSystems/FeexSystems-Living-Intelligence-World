# FEEX-SORL Phase 0 — Baseline Audit & File-Level Change Map

**Document ID:** FEEX-SORL-P0-AUDIT-001
**Branch:** `feat/feex-sorl-lab`
**Base SHA:** `9f68ac2` (plan commit on top of merged `main` @ `de1e9a6`)
**Audited:** 2026-11-23
**Authority:** FEEX-SORL-MEGA-IMPLEMENTATION-PLAN v1.0.0, Phase 0

---

## 1. Repository state

- Default branch `main` is **not protected** (per plan §1.1). All SORL work proceeds on feature branches; no direct pushes to `main`.
- Lockfile authority is **ambiguous**: both `package-lock.json` and `pnpm-lock.yaml` exist; no `packageManager` field in `package.json`. Phase 10 must pick one (`npm ci` per plan) and record the decision.
- Working tree was clean at audit time except this document.

## 2. Landing scene composition (verified)

Scene order in `client/landing/Landing.tsx` composition:

1. `HumanoidHeroScene` — Scene 01. Owns `HumanoidStage` → R3F `<Canvas>` (`frameloop` gated on visibility/reduced-motion, `dpr={[1,2]}`). Loads `/models/feex-sovereign-synthetic.glb` (205,812 bytes) via imperative `GLTFLoader` in `HumanoidModel.tsx`. Drives `Idle/Aware/Acknowledge/Explain` clips through one `AnimationMixer`; additive pointer gaze on `Head` bone; `GlyphAccent` emissive pulse.
2. `HeroScene` — Scene 02. Cinematic video (`hero.webm`) + mounts `HumanoidHeroOverlay` in `fxLayer`.

## 3. Duplicate humanoid paths (confirmed — plan §1.6)

| Path | Canvas | Character | State source |
|---|---|---|---|
| Scene 01 `HumanoidStage` | Own `<Canvas>` | Synthetic GLB humanoid | `useHumanoidState` (6-state local machine) |
| Scene 02 `HumanoidHeroOverlay` → `HumanoidHeroCanvas` | **Second `<Canvas>`** (`dpr=[1,1.5]`, lazy) | EIL `ParticleHumanoid`/`MechanicalHumanoid` via `EILProjectionSlot` | `useEILAgentRuntime` ephemeral local events |

`HumanoidHeroCanvas` additionally renders a static "OPENJARVIS // ADOPTION PREVIEW / NOT CONNECTED" DOM panel and an EIL HUD badge. `EILProjectionSlot` itself is correctly canvas-agnostic (fragment-only, kill-switch gated, renders nothing without an event).

## 4. EIL contracts (verified intact)

- `packages/feex-eil/renderer/presentation-state.ts` — 9-state vocabulary, fail-closed `UNAVAILABLE` on ERROR/OFFLINE, intent-only states (AWARE/GESTURING/INSPECTING), evidence-tier separation. **Preserve unchanged.**
- `packages/feex-eil/renderer/HumanoidScene.tsx` — monotonic per-agent event ordering, delegates to `ParticleHumanoid`/`MechanicalHumanoid` + `HolographicAura`.
- `client/lib/eil/projectionConfig.ts` — `EIL_PROJECTION_ENABLED = true` (kill switch live).
- `client/lib/eil/useEILAgentRuntime.ts` — ephemeral in-process runtime; not a bus/store.

## 5. Palette violations vs. noir constraint (plan §3)

- `client/landing/config/humanoid.config.ts`: `HUMANOID_PALETTE.signal = "#f0b45c"` (amber), `accent = "#f2e8d8"`, `HUMANOID_STATUS.presentation = "STYLIZED SYNTHETIC BEING"`.
- `client/landing/components/HumanoidHeroCanvas.tsx`: `pointLight color="#8cf5d2"` (mint), `EILProjectionSlot accentColor="#fafafa"` default `#8cf5d2`.
- Phase 1 must retoken all of the above to `FEEX_NOIR`.

## 6. Character asset status

- `public/models/feex-sovereign-synthetic.glb` — first-party procedural synthetic (faceless geometric robot). **Retained as rollback/reference per plan §0.2.6; do not delete.**
- `public/models/Xbot.glb` — 2.9 MB third-party-looking asset already in repo; provenance unverified in this audit. Flag for Phase 4 provenance review.
- Authoring sources: `scripts/authoring/feex_sovereign_synthetic.py`, `feex-sovereign-synthetic.blend`, `render-check.png`, plus 4 `docs/program/FEEX-SYNTHETIC-*.md` reports.
- Parallel asset pipeline exists under `stages/` (UE ARKit bake → Blender morph transfer → Draco GLB → R3F) targeting a `feex_sovereign.glb` humanoid — complementary to SORL Phase 3/4; reconcile clip/morph naming (`ARK_Pose_XX` ordinal contract in `client/components/arkitMorphMapper.js`).

## 7. Missing surfaces (all proposed work, none exist)

- No `SovereignResearchLab`, `LabEnvironment`, `LabZone`, `LabHotspot`, waypoint graph, or lab contracts.
- No `client/lib/lab/`, `client/hooks/lab/`, `client/components/sovereign/lab/`.
- No `/api/lab/*` routes.
- No lab manifest or asset registry entries.
- `docs/program/FEEX-SORL-*` reports other than this plan + this audit: none yet.

## 8. File-level change map (planned)

| Area | Files | Phase |
|---|---|---|
| Noir tokens | `client/landing/config/humanoid.config.ts`, new `client/landing/config/noir.ts` or `client/lib/lab/lab-contracts.ts` | 1 |
| One-Canvas rule | `client/landing/scenes/HeroScene.tsx` (remove `HumanoidHeroOverlay`), `client/landing/components/HumanoidHeroOverlay.tsx` + `HumanoidHeroCanvas.tsx` (reduce to DOM disclosure or delete), `client/test/components/HumanoidHeroOverlay.test.tsx` | 1/5 |
| Lab contracts | `client/lib/lab/{lab-contracts,lab-manifest,lab-zone-graph,lab-presentation}.ts` | 5 |
| Lab scene | `client/components/sovereign/lab/*`, `client/landing/scenes/HumanoidHeroScene.tsx` (host) | 5 |
| Lab state | `client/hooks/lab/{useLabState,useLabNavigation,useLabSelection}.ts` | 5 |
| Blender blockout | `scripts/authoring/build_feex_sorl_*.py`, `validate_*.py`, `export_*.py` | 2/4 |
| Optimization | `scripts/authoring/optimize_feex_assets.mjs` | 4 |
| Verification | `scripts/verify-feex-*.mjs` | 4/9 |
| Tests | `client/test/landing/*`, `e2e/feex-sorl-*.spec.ts` | 5–9 |
| Docs | `docs/program/FEEX-SORL-*.md` (11 reports) | per phase |

## 9. Gates requiring human action (cannot be agent-completed)

- MetaHuman license/EULA review before any MetaHuman-derived asset ships (§4.3).
- Character visual identity approval (§18.1).
- OpenJarvis Gates 0–5 + human approval (§9, Phase 8).
- BlendSwap asset license review per download (§6.2); API key rotation (key was pasted in chat).
- UE 5.7 / Blender binaries absent on this machine — `stages/` pipeline unexecutable here.
- Independent human visual approval + exact-SHA CI evidence (Phase 10).

## 10. Phase 0 exit status

- [x] Exact SHA recorded (`9f68ac2`)
- [x] Landing scene tree and routes inspected
- [x] All humanoid surfaces and Canvas mounts inventoried (2 landing canvases confirmed)
- [x] EIL contracts and kill switch inspected
- [x] Current GLB and authoring script inspected
- [x] Package manager ambiguity recorded (npm + pnpm lockfiles)
- [x] Uncommitted changes recorded (clean at audit)
- [x] Existing GLB/.blend untouched

**Exit:** baseline audit + change map complete → proceed to Phase 1.
