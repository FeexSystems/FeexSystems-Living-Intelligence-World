# FEEX-SYNTHETIC-BASELINE-AUDIT

Document: FEEX-SOVEREIGN-SYNTHETIC-IMPLEMENTATION-PLAN v2.1.0 — Phase 0 deliverable.
Branch: `feat/humanoid-hero-scene`
Date: implementation session, post-v2.1.0 direction revision.

## 1. Repository and working tree

- Repo: `FeexSystems-Living-Intelligence-World`
- Active branch: `feat/humanoid-hero-scene` (created for the Scene 01 humanoid work).
- Working tree contains uncommitted changes for the humanoid hero plus unrelated
  pre-staged `.agents/` skill/command files and docs — left untouched.

## 2. Existing landing architecture (verified in source)

- `client/landing/Landing.tsx` mounts scenes in order:
  `HumanoidHeroScene` → `HeroScene` (cinematic `hero.webm`) → `GalaxySequenceScene`
  → `Section03CoreArchitecture` → `WorldsScene` → `MissionCapabilityScene`
  → `ConvergenceScene` → `UILoopsScene` → `SectionArchitectOrigin`
  → `NoirPrimitivesScene` → `NoirWebGLScene` → `NoirCapabilitiesScene`.
- Scene registry: `client/landing/registry/landingAssets.ts` — `humanoid` first,
  `hero` second.
- Humanoid runtime (already built and verified):
  - `client/landing/scenes/HumanoidHeroScene.tsx` — semantic overlay, controls,
    inspector, honest labels (`LOCAL VISUAL SIMULATION`, `NO PHYSICAL ACTUATION`).
  - `client/landing/components/humanoid/HumanoidStage.tsx` — single R3F `Canvas`,
    `dpr={[1,2]}`, visibility/reduced-motion `frameloop` gating, error boundary.
  - `client/landing/components/humanoid/HumanoidModel.tsx` — imperative
    `GLTFLoader` + single `AnimationMixer`; state→clip mapping; additive pointer
    gaze on bones named `Head`; bounds normalisation to `targetHeight`; missing
    normals repaired via `computeVertexNormals()`.
  - `client/landing/components/humanoid/HumanoidLighting.tsx`,
    `HumanoidFallback.tsx`, `client/landing/config/humanoid.config.ts`,
    `client/landing/hooks/useHumanoidState.ts`, `useSceneVisibility.ts`.
- The runtime is **asset-agnostic**: it loads `HUMANOID_MODEL.src`, requires a bone
  named `Head` for gaze, and resolves clip names from `HUMANOID_STATE_CLIPS`.
  Swapping the GLB requires config + clip-name alignment only — no second Canvas,
  no second RAF loop, no new state authority.

## 3. Prior asset (superseded by v2.1.0)

- `public/models/RobotExpressive.glb` (464 KB, three.js example robot, 13 clips)
  was integrated and verified under the v2.0.0 photoreal track.
- v2.1.0 supersedes the Section-2 character spec: the character must be a
  **stylized, clearly synthetic being** — non-photoreal, non-human-passing —
  authored in Blender and delivered as an optimized GLB. RobotExpressive does not
  satisfy the new identity spec and is retained only as fallback reference.

## 4. EIL / governance boundaries confirmed in code

- `EIL_PROJECTION_ENABLED` kill switch and capability gates exist in the EIL
  boundary; the landing hero is a local visual simulation only.
- `SIMULATED` / `NO PHYSICAL ACTUATION` disclosures are rendered by
  `HumanoidHeroScene` and must remain.
- No new network, storage, persistence, or hardware surface is introduced by this
  work. World Model authority and Evidence Fabric provenance are untouched.

## 5. Tooling verified

- Blender **5.2.1 LTS** present at `F:\ENGR BILLI\blender.exe` (portable), runs
  headless (`blender -b -P script.py`). Used for asset authoring per plan §3.1.
- `gltf-transform` CLI not installed; GLB validation performed via Blender
  re-import + three.js `GLTFLoader` in-browser + manual header/JSON inspection.
- Node 24, three 0.176, R3F 9.8, drei 10.7 already in repo — no new deps needed.

## 6. Phase 7 / gate status

- Phase 0 (this document): complete.
- Phase 1 (design approval): the v2.1.0 document itself is the approved design
  direction (`DESIGN DIRECTION REVISED`); silhouette/pattern/color spec is §2.
- Phase 2–3 (authoring + export): executed via `scripts/authoring/` Blender
  pipeline; evidence in `FEEX-SYNTHETIC-AUTHORING-REPORT.md` /
  `FEEX-SYNTHETIC-ASSET-PROVENANCE.md`.
- Phase 4 (browser integration): executed against the existing
  `HumanoidHeroScene`/`HumanoidStage`/`HumanoidModel` architecture.
- Phase 5 (visual refinement): NOT authorized — deferred per governance.
- Phase 6 (acceptance evidence): typecheck/unit/Playwright/build + screenshots.

## 7. Deviations and honest limitations

- Character is authored by a first-party Blender Python script
  (`scripts/authoring/feex_sovereign_synthetic.py`) rather than a hand-sculpted
  .blend; the script is the reproducible source of truth and the .blend + GLB are
  generated artifacts.
- Honeycomb lattice is a generated alpha texture on joint panels (procedural hex
  grid), not scanned/groom geometry — documented in provenance.
- No facial rig/blendshapes by design (v2.1.0 §2.2): presence is carried by the
  emissive `GlyphAccent` mesh + head orientation.
