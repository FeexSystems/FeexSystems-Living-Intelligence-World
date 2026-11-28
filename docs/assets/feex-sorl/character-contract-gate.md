# FEEX Character Contract Gate — Evidence

**Date:** 2026-11-28
**Branch:** `feat/feex-sorl-character-gate`
**Gate:** `node scripts/verify-feex-humanoid-clips.mjs public/models/feex-sovereign-synthetic.glb`

## Result: PASS

```
INFO: clips=11 morphs=12 skins=1
VERIFICATION PASSED
```

## Asset

| Field | Value |
|---|---|
| File | `public/models/feex-sovereign-synthetic.glb` |
| SHA-256 | `87df84713257280c35fb293aa8639c9ee10a61e3121240152cefc341ca4d2d79` |
| Size | ~328 KB |
| Clips | Idle, Aware, Acknowledge, Explain (original) + Listen, Think, Inspect, Point, Walk, Speak, Unavailable (authored) |
| Morphs | 12 ARKit names on Visor (6), JawGuard (3), Head (3) |

## Pipeline

1. `scripts/authoring/author_feex_character_contract.py` — Blender headless:
   imports the GLB, bakes 7 new procedural keyframe actions onto the existing
   FEEXRig (17 joints), authors 12 shape keys as morph targets, re-exports
   with all animations on muted NLA tracks.
2. `scripts/authoring/glb_primitive_targetnames.mjs` — copies
   `mesh.extras.targetNames` → `primitive.extras.targetNames` (verifier reads
   primitive-level extras; Blender writes mesh-level).

## Honesty notes

- New clips are **procedural keyframe gestures** — functional, not
  motion-captured. Walk is a bounded loop; Unavailable is a slump-hold.
- Morphs deform the synthetic anatomy that exists: visor = eye region,
  JawGuard = mouth/jaw, Head icosphere brow band = brows. They are real
  geometry deltas, not placeholder targets — but subtle by design (~3.5% H).
- `HUMANOID_STATE_CLIPS` still maps only the original four states; the new
  clips are available via the `clip` prop / `HUMANOID_CLIP_NAMES`.
- Tripo candidate remains `active: false`; MetaHuman path unaffected.
- SIMULATED / NOT CONNECTED disclosures unchanged.
