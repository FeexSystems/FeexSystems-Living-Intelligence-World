# FEEX-SORL Character Contract — GLB Clip & Morph-Target Specification

**Document ID:** FEEX-SORL-P3-CONTRACT-001
**Status:** contract frozen; asset production gated on MetaHuman license review (§4.3, Phase 3)
**Authority:** FEEX-SORL-MEGA-IMPLEMENTATION-PLAN v1.0.0 §4.5–4.7

---

## 1. Character direction (human-approved successor to v2.1.0 synthetic)

- Young Black African male humanoid.
- Neck-length dreadlocks — defining silhouette, preserved at every LOD.
- Monochromatic technical wardrobe; restrained cybernetic details (no chromatic accents).
- Facial rig mandatory: the prior synthetic model's faceless design is **not** acceptable for the final character.

## 2. Skeletal contract

- glTF 2.0, Y-up, meters, +Z forward convention per glTF spec.
- Skeleton root at hips; standard humanoid bone naming accepted from MetaHuman export **or** normalized to a documented FEEX bone map during Blender assembly (Phase 4). The web runtime must not hardcode bone names beyond `Head` (already used for gaze) — bone lookup goes through a named-bone registry.
- Rest pose: A/T-pose per export pipeline; documented in the assembly report.

## 3. Animation clip contract (11 clips, exact names)

| Clip | Purpose | Trigger |
|---|---|---|
| `Idle` | Neutral breathing/weight shift | Default |
| `Aware` | Gentle head/eye orientation toward visitor | Explicit local presence intent |
| `Listen` | Attentive listening pose | Valid listening state |
| `Think` | Restrained cognition pose | Valid thinking state |
| `Acknowledge` | Greeting / acknowledgement | Visitor presses GREET |
| `Explain` | Open-hand explanatory gesture | Visitor requests explanation |
| `Inspect` | Lean/turn toward selected workstation | Explicit inspect interaction |
| `Point` | Point toward selected zone/display | Explicit navigation/zone selection |
| `Walk` | Short waypoint-based simulated locomotion | User-approved in-scene navigation |
| `Speak` | Speech body/facial pose | Confirmed audio playback lifecycle |
| `Unavailable` | Safe neutral/held pose | EIL ERROR/OFFLINE |

**Fallback rule:** missing clip → `Idle` + development diagnostic. Never silently map a missing clip to a fabricated state. Loop flags: `Idle`, `Aware`, `Listen`, `Think`, `Walk` loop; the rest are one-shot with configured return-to-idle.

## 4. Morph-target (blendshape) contract

Minimum facial channels (MetaHuman ARKit naming preferred for pipeline compatibility):

- `EyeBlinkLeft`, `EyeBlinkRight`
- `JawOpen`
- `MouthSmileLeft`, `MouthSmileRight` (or ARKit `MouthSmile` equivalents)
- `BrowInnerUp`, `BrowDownLeft`, `BrowDownRight`
- `EyeLookInLeft`, `EyeLookOutLeft`, `EyeLookUpLeft`, `EyeLookDownLeft` + right-side mirrors (or ARKit `eyeLook*` set)
- Viseme/phoneme channels **only if** a permitted pipeline supplies them; otherwise speech uses `Speak` clip body motion and facial motion is labeled "local animation preview" — never claimed as real lip sync (§4.6).

All morph weights normalized 0–1. Names validated in Blender **and** Three.js before browser integration.

## 5. Groom contract (§4.5)

- Browser representation: optimized hair cards / mesh strips / validated low-cost groom mesh — **not** strand-based Unreal groom.
- Dreadlock silhouette + neck length consistent across LODs.
- Dark stable material, subtle roughness variation, bounded transparent overdraw.
- No real-time hair physics in first release; optional subtle head-parented secondary motion only if stable.

## 6. LOD & budget targets

- LOD0 ≤ ~60k tris (hero close-up), LOD1 ≤ ~25k, LOD2 ≤ ~10k (web default TBD by Phase 9 perf gate).
- Single 2K texture set max; Draco compression; one GLB per asset chunk.
- Total lab scene budget: see Phase 9 acceptance (draw calls, tris, memory).

## 7. Legal gate (Phase 3 exit — human action required)

- MetaHuman license/EULA review **before** any MetaHuman-derived asset ships to web.
- If export rights not approved → first-party independent browser character with the same approved direction (documented fallback route).
- Character visual identity approval (§18.1) required before Phase 4 assembly sign-off.

## 8. Validation tooling (delivered)

- `scripts/authoring/validate_feex_humanoid_export.py` — Blender-side: skeleton, morph names, clip names, scale, normals, UV presence.
- `scripts/authoring/build_feex_humanoid_web_export.py` — versioned GLB export + SHA-256 manifest.
- `scripts/verify-feex-humanoid-clips.mjs` — Node-side GLB clip/morph verification (gltf-transform inspect).
