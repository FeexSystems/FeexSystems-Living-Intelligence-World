# FEEX-SORL Phase 2 — Laboratory Blockout Report

**Document ID:** FEEX-SORL-P2-BLOCKOUT-001
**Branch:** `feat/feex-sorl-lab`
**Status:** scripts delivered; **execution gated on Blender** (not installed on this machine)

---

## 1. What was built

Deterministic Blender authoring scripts under `scripts/authoring/`:

| Script | Responsibility |
|---|---|
| `build_feex_sorl_architecture.py` | Main shell: 30×24 m footprint, 5.5 m ceiling, floor/ceiling slabs, perimeter walls, 4×4 structural column grid (atrium kept open), ceiling beams, recessed emissive light strips, atrium glass partitions with door gaps, N-S/E-W circulation guide strips, south entry frame, 5 neutral area lights. All in `SORL_Architecture` collection with `M_SORL_*` noir materials. |
| `build_feex_sorl_zones.py` | Six zones per plan §2.2: floor pads, 2 workstation clusters each (desk/monitor/chair at human scale), signature equipment (`command_wall`, `turntable`, `server_rack`, `sim_ring`, `culture_racks`, `fab_bench`), ID totem signage, `ZONE_*`/`HOTSPOT_*`/`SPAWN_*` anchor empties, `SORL_HumanoidStaging` position. |
| `build_feex_sorl_blockout.py` | Orchestrator: cleans only generated objects, runs both builders, creates `CAM_SORL_Overview` + 6 zone cameras + `CAM_SORL_Humanoid`, saves versioned `.blend` (refuses implicit overwrite). |
| `validate_feex_sorl_scene.py` | Checks zone anchors, hotspots, cameras, material slots on every mesh, object scale bounds. Exit 0/1 deterministic. |
| `export_feex_sorl_glb.py` | Draco GLB export to explicit versioned path + `.manifest.json` with SHA-256, triangle count, byte size, source `.blend` path. Refuses to overwrite (exit 3). |

## 2. Canonical zone registry

`client/lib/lab/lab-zones.ts` — machine-readable mirror of the zone layout (IDs, centers, sizes, signatures, shell dims, humanoid staging). This is the contract Phase 5's waypoint graph will consume; Blender scripts and web share the same numbers.

## 3. Design conformance

- **Noir palette:** all materials use desaturated graphite/silver/near-white; emissive strips are `#fafafa`-class signal white only. No amber/brass/teal.
- **Real-world scale:** metres throughout; furniture at human scale (0.75 m desks, 2.2 m racks).
- **Six zones identifiable:** each has distinct silhouette equipment + totem + floor pad.
- **Circulation:** central atrium (10×5 m) with glass walls, N-S spine guide, E/W cross links, ≥2 m corridors.
- **No agent integration:** geometry + lighting only.

## 4. Execution gate

Blender is not installed on this machine; the `stages/` pipeline has the same constraint. To execute:

```bash
blender --background --python scripts/authoring/build_feex_sorl_blockout.py -- \
    --output "F:/ENGR BILLI/FeexSystems-Living-Intelligence-World/scripts/authoring/feex_sorl_lab_blockout_v001.blend"

blender --background feex_sorl_lab_blockout_v001.blend \
    --python scripts/authoring/validate_feex_sorl_scene.py

blender --background feex_sorl_lab_blockout_v001.blend \
    --python scripts/authoring/export_feex_sorl_glb.py -- \
    --output "F:/ENGR BILLI/FeexSystems-Living-Intelligence-World/public/models/feex-sorl/feex_sorl_lab_v001.glb"
```

Then produce the Phase 2 exit screenshots (desktop + mobile) from `CAM_SORL_Overview` and each `CAM_SORL_<zone>`.

## 5. Phase 2 exit checklist

- [x] Main shell script (floor, walls, ceiling, columns, beams)
- [x] Six zones + circulation
- [x] Workstation clusters + signature equipment
- [x] Monochrome materials + neutral lighting
- [x] Camera overview + zone focus presets
- [x] Zone registry for web consumption
- [ ] `.blend` + GLB + screenshots — **blocked: Blender not on this machine**
- [ ] Human approval of greybox — pending §18.1
