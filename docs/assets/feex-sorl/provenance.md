# FEEX-SORL Asset Provenance & Registry

Generated: 2026-11-26 · Branch: `feat/feex-sorl-lab` · PR #110
Gate 5 report: `gate5-report.json` (14 assets, 0 hard failures)

## Sources

| Source | Method | Credits |
|---|---|---|
| Tripo Studio MCP (`tripo_text_to_model`) | H3.1 `v3.1-20260211`, `family=hd`, `texture=false` | 12 × ~15cr Studio (balance exhausted) |
| Tripo Studio web UI (manual) | user-generated character | ~15–25cr Studio |
| Procedural Blender 4.5.10 LTS | `build_feex_sorl_observation_deck.py` | 0 |

## Pipeline notes (reusable)

- **Submit sequentially.** The free Studio plan rejects parallel submits at the
  credit-reserve stage; the API returns `entitlement_rejected` but still creates
  a zombie task that expires unfunded after ~30 min. Always poll
  `tripo_get_model_task` until `status=success`, then harvest before submitting
  the next job.
- **Export workaround.** `tripo_export_model` is paywalled on the free plan.
  `tripo_get_model_asset` returns a signed `model_url` (24 h expiry) — download
  directly.
- **Harvest.** `scripts/authoring/tripo_studio_harvest.mjs <url> <zone> <id> [ratio]`
  — meshopt decode → weld → simplify → `public/models/feex-sorl/<zone>/`.
- **Materials.** Tripo geometry-only GLBs ship with zero materials.
  `scripts/authoring/assign_noir_materials.mjs` injects `M_SORL_Prop`
  (graphite PBR) into every material-less GLB.
- **Scale.** Tripo GLBs are **unit-normalized** (max bbox dim = 1.0). Real-world
  scale must be applied at scene placement — see `targetScale` below.

## Asset registry

| File | Zone | tris | verts | source | target scale (m) |
|---|---|---|---|---|---|
| `command-centre/sorl-cmd-console.glb` | command-centre | 13.5k | 6.7k | Tripo MCP | ×2.2 (w) |
| `command-centre/sorl-evidence-wall.glb` | command-centre | 46.9k | 23.4k | Tripo MCP | ×4.5 (w) |
| `command-centre/sorl-workstation.glb` | command-centre | 95.6k | 47.8k | Tripo MCP | ×1.6 (w) |
| `humanoid-bay/sorl-humanoid-platform.glb` | humanoid-bay | 96.8k | 48.4k | Tripo MCP | ×2.6 (dia) |
| `humanoid-bay/sorl-calibration-rig.glb` | humanoid-bay | 96.5k | 48.2k | Tripo MCP | ×2.4 (h) |
| `robotics-sim/sorl-robotic-arm.glb` | robotics-sim | 97.3k | 48.6k | Tripo MCP | ×1.6 (reach) — **SIMULATED** |
| `robotics-sim/sorl-sim-platform.glb` | robotics-sim | 95.4k | 47.7k | Tripo MCP | ×3.2 (dia) — **SIMULATED** |
| `ai-research/sorl-server-rack.glb` | ai-research | 95.2k | 46.9k | Tripo MCP | ×2.2 (h) |
| `bio-research/sorl-lab-bench.glb` | bio-research | 93.1k | 46.4k | Tripo MCP | ×2.4 (w) |
| `bio-research/sorl-lab-instrument.glb` | bio-research | 97.9k | 48.9k | Tripo MCP | ×0.8 (h) |
| `bio-research/sorl-sample-storage.glb` | bio-research | 94.2k | 47.0k | Tripo MCP | ×2.0 (h) |
| `engineering-workshop/sorl-fab-bench.glb` | engineering-workshop | 94.7k | 47.3k | Tripo MCP | ×2.4 (w) |
| `observation-gallery/sorl-observation-deck.glb` | observation-gallery | 1.4k | 2.4k | Blender procedural | real-scale 24×5.7×5.75 m |
| `character/feex-character-tripo.glb` | character | 47.4k | 23.7k | Tripo Studio (manual) | ×1.8 (h) — **candidate only** |

## Reuse map (no generation needed)

- `sorl-diagnostic-console` → `sorl-workstation` (command-centre kit)
- `sorl-net-cabinet` → `sorl-server-rack`
- `sorl-component-rack` → `sorl-fab-bench`

## Known limitations

- **Untextured.** Phase 2 Tripo texturing is blocked (`insufficient_balance`).
  All Tripo assets carry the injected `M_SORL_Prop` graphite PBR material;
  per-asset noir materials can be applied at R3F load time for variety.
- **Unit-normalized scale.** See `targetScale`; verify visually before final
  placement (Gate 9 acceptance).
- **Character is candidate-only.** No facial rig — cannot replace MetaHuman.
  Decide: interim rigged placeholder vs sculpt reference.
- **Tripo license.** Verify Tripo Terms of Service for redistribution rights
  before any public deployment.
