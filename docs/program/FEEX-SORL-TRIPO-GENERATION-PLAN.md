# FEEX-SORL — Tripo 3D Master Build: Gate 0 Report & Generation Plan

**Document ID:** FEEX-SORL-TRIPO-GATE0-001
**Date:** 2026-11-24
**Status:** GATE 0 COMPLETE — awaiting Gate 1 (auth) and Gate 2 (credit approval)
**Directive:** FEEX SYSTEMS | TRIPO 3D MASTER BUILD PROMPT

---

## 1. Repository investigation findings

| Item | Finding |
|---|---|
| Landing architecture | 12-scene cinematic landing (`client/landing/Landing.tsx`); scene 1 = `HumanoidHeroScene` hosting `HumanoidStage` (single WebGL Canvas, one-Canvas rule enforced by `verify-no-duplicate-humanoid-canvas.mjs`) |
| Humanoid implementation | `client/landing/components/humanoid/` — Stage/Model/Lighting/Overlay; GLB at `public/models/feex-sovereign-synthetic.glb`; lab variant via `lab` prop |
| Lab scene | `client/components/sovereign/lab/` — procedural greybox `LabEnvironment` + `LabZoneSet` + `SovereignCharacter` + `WaypointRig`; hooks `client/hooks/lab/`; registry `client/lib/lab/lab-zones.ts` |
| Zone count | **6 zones registered** — prompt specifies **7** (adds Observation Gallery & Evidence Wall). Delta flagged, not yet implemented |
| Existing 3D assets | `public/models/` contains only `feex-sovereign-synthetic.glb` + `Xbot.glb`; no `feex-sorl/` asset dir yet — will create per manifest |
-provenance records | `docs/assets/` convention now established (`docs/assets/feex-sorl/asset-manifest.json`); Blender-side provenance in `scripts/authoring/` + phase docs |
| R3F/Three setup | React Three Fiber + drei `useGLTF`; `dpr={[1,2]}` clamp; GLSL plugins registered in vite+vitest configs |
| Asset-loading convention | GLB under `public/models/`, loaded via useGLTF, verified by `scripts/verify-feex-*.mjs` |
| Tests/validation | Vitest suites (39 passing), `verify-feex-lab-{manifest,assets,provenance}`, `verify-feex-humanoid-clips`, `optimize_feex_assets.mjs` |

**Discrepancies vs prompt:** (a) 6 zones not 7 — `observation-gallery` needs registry + scene + dock changes at integration gate; (b) palette compatible — existing `FEEX_NOIR` tokens are all neutral (void `#050505` exact match); no forbidden hues present; (c) "installed Tripo 3D plugin" = `@vastai/tripo-sdk@0.5.0` npm package (user-installed, uncommitted) — there is no Blender plugin and no Tripo MCP server; (d) no Blender on this host — Tripo GLBs integrate directly via GLTFLoader, Blender only needed for remix/decimate/UV ops (SDK has `decimateMesh`, `meshUV`, `textureModel` cloud ops as alternative).

## 2. Tripo plugin readiness (Gate 1 preview)

- SDK endpoints confirmed in `types/index.d.ts`: `textToModel`, `imageToModel`, `getBalance`, `getUsage`, `listTasks`, `downloadModel`, `models/convert`, `models/import`, `decimateMesh`, `meshUV`, `textureModel`, `rigModel`, `retargetAnimation`, `segmentMesh`.
- Auth: `TRIPO_API_KEY` env var → `TripoClient`. **The key pasted in terminal/session is compromised — rotate before use.** Overseas endpoint: `https://openapi.tripo3d.ai/v3`.
- Export options: SDK does not expose a GLB-specific flag — Tripo tasks return GLB among formats; confirm per-task output at download (`downloadModel`).
- **Credit costs are NOT published in the SDK** — must be read from `getBalance()`/`getUsage()` after auth, or Tripo pricing page. Estimates deferred to Gate 2.

## 3. Proposed generation plan (Gate 2 — approval required)

**16 proposed jobs** in `docs/assets/feex-sorl/asset-manifest.json`. After reuse-combining:

| Batch | Jobs | Contents | Rationale |
|---|---|---|---|
| A — Command theatre | 2 | command console+wall unit (combined), workstation kit | zone anchor assets |
| B — Humanoid bay | 2 | examination platform, calibration gantry+diagnostic console (combined) | character staging |
| C — Robotics sim | 2 | robotic arm workstation, sim platform+safety barrier | simulation-marked |
| D — AI research | 2 | server rack, compute/network cabinet (combined) | infrastructure |
| E — Bio-research | 2 | materials analysis bench, instrument+storage (combined) | scientific |
| F — Workshop | 2 | precision workbench, component rack | fabrication |
| G — Observation gallery | 1 | gallery deck + evidence displays | **blocked until zone approved** |

Deferred: architectural shell (procedural greybox + Blender scripts already cover it), room-scale Tripo generation.

**Per-asset spec (all jobs):** GLB, PBR textures ≤2K, real-world meters scale, base-center origin, `feex-sorl-<zone>-<asset>.glb` naming, obsidian/graphite/titanium palette prompts with explicit "no gold, no cyan/green accents, no cartoon style" negatives.

**Credit estimate:** unknown until `getBalance`/`getUsage` — Tripo bills per task with quality tiers (`TextureQuality`, `GeometryQuality` enums in SDK). Will present exact per-job cost at Gate 2 before any spend. Conservative cap suggestion: approve batches A–F first (12 jobs), hold G.

## 4. Validation pipeline (Gate 5 preview)

Per asset: file exists → GLB parse (existing `verify-glb.mjs` pattern / `@gltf-transform`) → material/texture refs → dimensions/orientation → size → preview capture → entry into `verify-feex-lab-manifest` schema → `optimize_feex_assets.mjs` → provenance record.

## 5. Safety boundaries (confirmed)

- No physical actuation, no OpenJarvis connection, robotics marked simulation-only.
- `SIMULATED ENVIRONMENT / NO PHYSICAL ACTUATION` disclosure stays in UI.
- No component replacement; synthetic humanoid GLB stays until MetaHuman export passes.

## 6. Decisions required before Gate 2

1. **Rotate `TRIPO_API_KEY`** — it was pasted in plaintext; provide the rotated key via env var only (never in chat).
2. **Approve/reject the 7th zone** (`observation-gallery`) — code delta needed before its assets can be placed.
3. **Approve batch scope** — all 16 jobs, or A–F first (12 jobs) with G held?
4. **Quality tier** — SDK exposes `geometry_quality`/`texture_quality` tiers that affect credit cost; recommend starting at standard/detailed, not extreme.
5. **Commit `@vastai/tripo-sdk`?** — currently uncommitted `package.json`/`package-lock.json` changes on this branch.
