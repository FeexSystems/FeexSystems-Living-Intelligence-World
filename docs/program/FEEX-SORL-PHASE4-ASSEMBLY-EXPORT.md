# FEEX-SORL Phase 4 — Blender Assembly & Web Export Report

**Document ID:** FEEX-SORL-P4-ASSEMBLY-001
**Branch:** `feat/feex-sorl-lab`
**Status:** tooling delivered; GLB chunks gated on Blender execution (Phase 2/3 assets)

---

## 1. Deliverables

| Artifact | Path | Status |
|---|---|---|
| Asset assembly (lab + humanoid → one scene, normalize, staging) | `scripts/authoring/assemble_feex_sorl_assets.py` | delivered, unexecuted |
| Optimization pipeline (gltf-transform inspect + optimize → versioned output + report) | `scripts/authoring/optimize_feex_assets.mjs` | delivered |
| Lab asset verifier (GLB magic + SHA-256) | `scripts/verify-feex-lab-assets.mjs` | **verified against real GLB** |
| Lab manifest schema checker | `scripts/verify-feex-lab-manifest.mjs` | **verified** |
| Provenance SHA-256 verifier | `scripts/verify-feex-lab-provenance.mjs` | delivered |
| One-Canvas rule gate | `scripts/verify-no-duplicate-humanoid-canvas.mjs` | **passing now** |
| Actuation-claim honesty lint | `scripts/verify-no-physical-actuation-surface.mjs` | **passing now** |

## 2. Verification evidence (executed)

```
$ node scripts/verify-no-duplicate-humanoid-canvas.mjs
OK: exactly one landing humanoid Canvas (HumanoidStage)   exit=0

$ node scripts/verify-no-physical-actuation-surface.mjs
OK: no unnegated physical-actuation / live-agent claims    exit=0

$ node scripts/verify-feex-lab-manifest.mjs /tmp/lab-manifest.json
MANIFEST VALID                                             exit=0

$ node scripts/verify-feex-lab-assets.mjs /tmp/lab-manifest.json
OK: public/models/feex-sovereign-synthetic.glb (205812 bytes)
VALIDATION PASSED: 1 asset(s)                              exit=0
```

## 3. Remaining Phase 4 work (execution-gated)

- Run `build_feex_sorl_blockout.py` → `.blend` → `export_feex_sorl_glb.py` → lab GLB chunk(s).
- Run `validate_feex_humanoid_export.py` + `build_feex_humanoid_web_export.py` on the Phase 3 character.
- Run `assemble_feex_sorl_assets.py` for the combined scene; generate LODs; run `optimize_feex_assets.mjs` with a real input manifest.
- Write per-asset `.manifest.json` provenance sidecars (SHA-256) via the export scripts.

## 4. Phase 4 exit checklist

- [x] Assembly script (scale/orientation normalization, staging placement, versioned output)
- [x] Optimization script per §14.2 contract
- [x] All §14.3 verification scripts present and deterministic
- [x] Runnable verifiers pass on current repo state
- [ ] Verified GLB chunks + machine-readable manifests — **blocked: no Blender/character asset yet**
