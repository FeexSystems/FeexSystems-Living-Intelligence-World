# FEEX-SORL Gate 7 — R3F Integration Proposal

Status: **proposal — not yet implemented.** No scene code has been changed.

## Current architecture (unchanged)

- Single Canvas, React Three Fiber + drei, `/world` sovereign route.
- `LabEnvironment.tsx` renders procedural shell/zones; `LabZoneSet.tsx`
  renders per-zone signature equipment procedurally.
- `lab-manifest.ts` maps zone → asset path (`null` for all zones today).
- GLTFLoader convention already used by `HumanoidModel.tsx`.

## Proposed integration (3 steps, smallest first)

### Step 1 — Asset loader hook (new file, additive)

`client/hooks/lab/useLabAsset.ts`:
- `useGLTF` (drei) per asset path from `lab-manifest.ts`
- `<Suspense>` + `AssetErrorBoundary` (already exists)
- Applies `targetScale` from a new `assetScale` map and centers/orients
  per-zone placement transforms
- `dpr={[1,2]}` clamp already global — no change needed

### Step 2 — Replace procedural signatures with GLB placements

In `LabZoneSet.tsx`, for each `signature`, prefer GLB when
`lab-manifest.ts[zone]` is non-null, else keep procedural fallback.
This makes every Tripo asset **swappable per-zone** — the manifest entry
is the single switch. Procedural zone furniture (workstations, totems,
floor pads) stays as-is; only signature hero props swap to GLB.

Placement table (Blender→scene coords already handled by zone graph):

| zone | asset | anchor | approx position |
|---|---|---|---|
| command-centre | sorl-cmd-console | ZONE_command-centre | centre-south of zone |
| command-centre | sorl-evidence-wall | back wall | north edge, facing south |
| humanoid-bay | sorl-humanoid-platform | zone centre | under staging anchor |
| humanoid-bay | sorl-calibration-rig | back wall | north edge |
| robotics-sim | sorl-robotic-arm | east bench | **+ SIMULATED badge** |
| robotics-sim | sorl-sim-platform | zone centre | **+ SIMULATED badge** |
| ai-research | sorl-server-rack | back wall row | north edge ×2 instances |
| bio-research | sorl-lab-bench | centre | mid-zone |
| bio-research | sorl-lab-instrument | on bench | offset on lab-bench |
| bio-research | sorl-sample-storage | back wall | north edge |
| engineering-workshop | sorl-fab-bench | centre | mid-zone |
| observation-gallery | sorl-observation-deck | zone footprint | real-scale, no resize |

### Step 3 — Character decision (human gate)

`feex-character-tripo.glb` stays **out of the scene** until decided:
interim rigged placeholder (needs ~20cr rig + retarget) vs MetaHuman path.
Recommend keeping current `SovereignCharacter.tsx` until MetaHuman decision.

## Budgets & safeguards

- 13 GLBs ≈ 6.8 MB total decoded — trivial vs. scene budget.
- All meshes <100k tris; instancing not required at this count.
- Tripo assets lack textures → single shared `M_SORL_Prop` material;
  optional per-zone tint override via `material.color` clone if needed.
- Deck GLB is real-scale; Tripo GLBs need `targetScale` — keep the scale
  map in `lab-manifest.ts` beside the path so placement is data-driven.

## Open questions for approval

1. Swap signatures to GLB per-zone now, or stage behind a flag
   (`?assets=glb` query param) for A/B comparison?
2. Apply per-asset noir tints, or keep uniform graphite?
3. Character: rig the Tripo candidate (~20cr, needs top-up) or hold for
   MetaHuman?
