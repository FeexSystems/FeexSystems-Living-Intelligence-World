# FEEX-SORL Phase 5 — React Three Fiber Integration Report

**Document ID:** FEEX-SORL-P5-R3F-001
**Branch:** `feat/feex-sorl-lab`
**Status:** working local browser scene — no OpenJarvis/hardware integration

---

## 1. What was built

The Scene 01 hero Canvas is now the FEEX-SORL laboratory. One Canvas,
six zones, deterministic waypoint navigation, DOM controls.

### New modules

| Path | Role |
|---|---|
| `client/lib/lab/lab-contracts.ts` | Runtime contracts: nav phases, hotspots, zone status, inspector model, asset entries |
| `client/lib/lab/lab-zones.ts` | Canonical zone registry (Phase 2) + `zoneCenterToScene` Blender→three mapping |
| `client/lib/lab/lab-zone-graph.ts` | Waypoint graph: overview/humanoid/6 zone anchors, atrium-transit routing |
| `client/lib/lab/lab-manifest.ts` | GLB chunk manifest — `src: null` until Phase 4 assets land |
| `client/hooks/lab/useLabState.ts` | Zone visit/inspect state (explicit actions only) |
| `client/hooks/lab/useLabNavigation.ts` | Travel lifecycle: idle→traveling→arrived→idle; reduced-motion jumps |
| `client/hooks/lab/useLabSelection.ts` | Hotspot selection → navigate/inspect intents |
| `client/components/sovereign/lab/LabEnvironment.tsx` | Procedural greybox shell (floor/walls/columns/beams/glass/strips/totems) |
| `client/components/sovereign/lab/LabZoneSet.tsx` | Workstations, signature equipment per zone, hotspot beacons |
| `client/components/sovereign/lab/SovereignCharacter.tsx` | Character at humanoid-bay staging via existing `HumanoidModel` |
| `client/components/sovereign/lab/WaypointRig.tsx` | Camera path follower (smoothstep legs, look-at target) |

### Modified

- `client/landing/components/humanoid/HumanoidStage.tsx` — optional `lab` prop renders environment + zones + character + rig inside the same Canvas; non-lab path preserved.
- `client/landing/scenes/HumanoidHeroScene.tsx` — owns the three lab hooks; LAB zone dock (OVERVIEW/HUMANOID/6 zones) in DOM; inspector shows active zone + visited count.
- `client/landing/config/humanoid.config.ts` — model root offset moved to lab staging wrapper.
- `client/landing/config/noir.ts` — added `steel` token.

## 2. Contract compliance

- **One Canvas:** `verify-no-duplicate-humanoid-canvas.mjs` still passes — `HumanoidStage` remains the only landing `<Canvas>`.
- **Deterministic navigation:** `resolveWaypointPath` routes every zone-to-zone trip through `LAB_ATRIUM_TRANSIT`; no pathfinding, no randomness. Scroll/key input can be added later against the same state.
- **Honesty:** zone status labels are local UI state only; inspector still shows `LOCAL VISUAL SIMULATION / NO PHYSICAL ACTUATION`; `verify-no-physical-actuation-surface.mjs` passes.
- **Preserved behavior:** loading/error/reduced-motion paths unchanged; `frameloop="never"` still pins static frames; `disabled` state holds pose.
- **EIL boundary:** no agent events consumed or fabricated on this surface; Phase 6 connects presentation mapping only.

## 3. Verification

- `npm run typecheck` — clean (landing + effects projects).
- `npx vitest --run client/test/lib/lab-zone-graph.test.ts` — 8/8 pass (registry integrity, waypoint coverage, atrium routing, camera placement).
- `npx vitest --run client/test/landing/LandingComposition.test.tsx` — 13/13 pass.
- `node scripts/verify-no-duplicate-humanoid-canvas.mjs` — OK.
- `node scripts/verify-no-physical-actuation-surface.mjs` — OK.

## 4. Known limitations / next

- Lab renders **procedural greybox** — GLB chunks pending Blender execution (Phase 2/4 gate).
- Character is still the synthetic rollback GLB; new humanoid pending Phase 3.
- Hotspot clicks work via R3F raycast on the canvas; DOM dock is the primary accessible path.
- Phase 6: wire `resolvePresentationState` → clip mapping with diagnostics.
- Phase 7: evidence refs in inspector (currently empty array).
