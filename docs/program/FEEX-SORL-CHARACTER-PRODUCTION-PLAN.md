# FEEX-SORL Character Production Plan — Base-Mesh Route

**Document ID:** FEEX-SORL-CHAR-PROD-001
**Date:** 2026-11-24
**Status:** DRAFT — awaiting user decisions (§7)
**Supersedes:** nothing — extends `FEEX-SORL-CHARACTER-CONTRACT.md` (frozen) and unblocks Phase 3 via the contract's sanctioned fallback route ("first-party independent browser character to the same approved direction").

---

## 1. Asset audit — what was provided

| File | Format | Blender ver | License | Audit result |
|---|---|---|---|---|
| `Base Male Mesh.zip` → `Base Male Mesh.blend` (2.7 MB) | .blend binary | saved v257 (Blender 2.5x, 2011) | **CC BY-SA 3.0** — visnik, BlendSwap #18749 | Full-body base male mesh. Forward-compatible: old .blend opens in Blender 4.x. **Requires attribution + share-alike on derivatives.** |
| `Male head sculpt base mesh.zip` → `male-base-mesh.blend` (537 KB) | .blend binary | saved v277 (Blender 2.7x, 2016) | **CC0** — BlendSwap #85861 | Head-only sculpt base, "clean detailed sculpts, multi-rez". No strings attached — safe for any use. |
| `add-on-mixamo-rig-v1.2.3.zip` | Blender extension (py + `cs.blend` v405) | targets Blender 4.x | **GPL-3.0** (tooling only — does not infect exported GLB) | Mixamo Rig addon: auto-rig + Mixamo animation import/retarget. Based on Adobe's Mixamo-in-Blender. |

**License posture for web shipping:**
- Body mesh derivative → **CC BY-SA 3.0 obligations apply**: credit "visnik / BlendSwap #18749" in product docs/UI, and share-alike means the derived mesh should be distributed under CC BY-SA (acceptable for a GLB asset; flag for legal if the character is considered part of a larger proprietary work — CC treats the asset as the unit).
- Head mesh → CC0, no obligations.
- Mixamo addon → runs inside Blender only; output is not GPL-encumbered.
- **Mixamo animation clips** (if used): Mixamo license permits use in projects incl. commercial, but raw-asset redistribution is restricted — clips baked into our GLB need the same legal check as MetaHuman had. Alternative: author clips procedurally or license a clip library.

## 2. Gap analysis vs Character Contract (§1–§4)

| Contract requirement | Asset coverage | Gap |
|---|---|---|
| Young Black African male direction | Base meshes are generic male — **no ethnicity/likeness data** | Direction is achieved through sculpt/texture/wardrobe, not the base mesh. Requires manual likeness work in sculpt stage. |
| Neck-length dreadlocks (defining silhouette) | **Nothing provided** | Must be authored: curve-based lock clumps or hair-card groom. Largest single authoring task. |
| Monochromatic technical wardrobe + restrained cybernetics | Nothing | Modelled garments/armor pieces over base body. |
| Facial rig + 12 morph targets (ARKit-style names) | Nothing | Manual shape-key sculpting or Faceit/ARKit blendshape import. |
| 11 clips (Idle, Listen, Think, Inspect, Point, Walk, Speak, Unavailable, Acknowledge, Aware, Explain) | Nothing | Mixamo library retarget via addon, or authored keyframe set. |
| Standard humanoid skeleton | Mixamo Rig addon auto-generates Mixamo-named rig | Contract requires bone-name registry — addon output maps cleanly; verify `Head` bone for gaze. |
| GLB export + manifest + verifier pass | `scripts/authoring/build_feex_humanoid_web_export.py`, `verify-feex-humanoid-clips.mjs` ready | Needs Blender runtime. |

## 3. Environment gap

- **No Blender installed** on this host (checked PATH, Program Files, common dirs).
- Python 3.15.2 present; `bpy` pip wheel unavailable for 3.15 (bpy targets cp311).
- Options:
  - **A. Install Blender 4.5 LTS** (recommended — GUI for sculpt/groom work anyway; `winget install BlenderFoundation.Blender` or manual). All authoring scripts already target `bpy`.
  - **B. Python 3.11 + `pip install bpy`** — headless-only route; no GUI sculpting, poor fit for dreadlock/likeness work.

## 4. Production pipeline (proposed phases)

| Step | Work | Tooling |
|---|---|---|
| P3A | Install Blender 4.5 LTS; verify `bpy` scripts run | user/admin action |
| P3B | Import `Base Male Mesh.blend` (v257→4.x); merge/evaluate against head sculpt base; normalize scale to contract (height ~1.9 m, hips-root skeleton) | Blender + existing `scripts/authoring/` |
| P3C | Likeness pass: head sculpt refinement toward approved direction; dreadlock grooming (curve clumps, neck-length silhouette preserved at LODs) | Blender sculpt/groom — **largest effort** |
| P3D | Wardrobe: monochromatic technical suit + restrained cybernetics | Blender modelling |
| P3E | Rig: Mixamo Rig addon auto-rig; verify bone registry (`Head` etc.) per contract §3 | add-on v1.2.3 |
| P3F | Animation: source/author 11 contract clips; retarget through rig; verify names exactly | Mixamo library (license check) or authored set |
| P3G | Morphs: sculpt 12 ARKit-named shape keys | Blender shape keys |
| P3H | Export GLB + manifest via `build_feex_humanoid_web_export.py`; `verify-feex-humanoid-clips.mjs` must exit 0 | existing scripts |
| P3I | Web swap-in: point `HUMANOID_MODEL.src` / lab manifest at new GLB; attribution credit for visnik; §18.1 human visual approval; update Phase 3/9 docs | repo |

## 5. Risks

- **Dreadlocks + likeness are manual sculpt work** — cannot be automated; quality depends on artist time in Blender.
- **CC BY-SA share-alike** on body derivative — get explicit OK that shipping the derived GLB under CC BY-SA is acceptable.
- **Mixamo clip licensing** — verify before baking into shipped GLB.
- **Old .blend forward-compat** — v257/v277 files may carry deprecated settings; audit on first open in 4.5.
- **Facial morphs are the long pole** — 12 targets × clean topology is substantial; consider Faceit/ARKit blendshape library if manual cost is too high.

## 6. What I can do vs what needs you

**I can do (once Blender exists):** run all authoring/export scripts, assemble scenes, wire the GLB into the web build, run all verifiers, update docs.

**Needs you/human:** Blender install (or approval to install), sculpt/artwork for likeness+dreadlocks+wardrobe+morphs (or commissioning an artist), Mixamo account + clip license decision, §18.1 visual approval, CC BY-SA acceptance.

## 7. Decisions requested

1. Blender route: install 4.5 LTS on this machine (winget) or a different machine?
2. Who produces the sculpt work — you in Blender GUI, an artist, or should I attempt procedural/blockout quality first?
3. Mixamo animations: use Mixamo library (license check first) or author clips manually?
4. Accept CC BY-SA 3.0 obligations for the body-mesh derivative?
