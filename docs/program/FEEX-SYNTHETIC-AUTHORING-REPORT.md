# FEEX-SYNTHETIC-AUTHORING-REPORT

Plan: FEEX-SOVEREIGN-SYNTHETIC-IMPLEMENTATION-PLAN v2.1.0 — Phases 1–3 evidence.

## 1. Design direction

Character: **FEEX Sovereign Synthetic** — stylized, clearly synthetic being;
non-photoreal, non-human-passing. Identity carried through silhouette
(tall, slender, elongated geometric proportions), obsidian/graphite/brass
material language, geometric inlay bands, honeycomb joint lattice, and an
emissive amber `GlyphAccent` "presence" line instead of facial features.
Design approval: v2.1.0 document itself (`DESIGN DIRECTION REVISED`); Gate A
direction approved, final visual approval remains a Phase-5 gate.

## 2. Authoring pipeline (executed)

```
concept spec (plan §2)
   → Blender 5.2.1 LTS headless Python authoring
       scripts/authoring/feex_sovereign_synthetic.py   (source of truth)
   → .blend artifact                                  scripts/authoring/feex-sovereign-synthetic.blend
   → glTF 2.0 binary export (built-in io_scene_gltf2)
   → public/models/feex-sovereign-synthetic.glb
   → React Three Fiber landing hero (existing architecture)
```

Blender: **5.2.1 LTS** (portable install `F:\ENGR BILLI\blender.exe`),
headless `blender -b --python`. No MetaHuman/Unreal/OpenRigLogic dependency —
dropped per v2.1.0 §3.

## 3. Asset contents (verified in exported GLB JSON)

- 43 mesh nodes: pelvis, abdomen, chest + cap, brass inlay bands, neck,
  faceted head, visor glyph, jaw guard, pauldrons, upper arms, forearm cores,
  forearm + shin honeycomb panels, wrists, palms, 3-finger hands, thighs,
  knees, shins, feet, toes, ground disc.
- 1 skin, 17 joints: Hips, Spine, Chest, Neck, Head, UpperArm/ForeArm/Hand
  .L/.R, Thigh/Shin/Foot .L/.R.
- 5 materials: Obsidian, Graphite, BrassInlay, Honeycomb, GlyphAccent.
- 1 embedded image: procedural 256² hex-lattice alpha texture (Honeycomb).
- 4 animation clips: `Idle`, `Aware`, `Acknowledge`, `Explain` (24 fps,
  48-frame loops; full-pose baked channels, constant curves on unanimated
  bones — exporter behaviour, not a defect).
- Extension: `KHR_materials_emissive_strength` (glyph intensity 3.0).
- ~1,100 triangles, 205,812 bytes — far under the 5–12 MB desktop target.

## 4. Animation verification

- Imported GLB back into Blender: NLA tracks `Idle/Aware/Acknowledge/Explain`
  present; `Acknowledge` contains real quaternion curves on `UpperArm.R`
  (w 1.0→0.87, y→−0.48 ≈ arm raise).
- In-browser: GREET → `Acknowledge` clip visibly raises the character's arm
  (pixel-diff + ASCII-frame inspection); state returns to idle via the
  existing one-shot timer.
- Head bone named `Head` — runtime pointer-gaze target intact.

## 5. Known limitations (honest)

- Meshes are rigidly bound (one bone per part, weight 1.0) — correct for a
  mechanical synthetic, no smooth skinning deformation.
- Honeycomb is a generated alpha texture on joint bands, not scanned groom.
- "GlyphAccent" presence line is a single emissive visor bar; expression is
  carried by clip + glyph pulse + head orientation, per §2.2.
- Character faces glTF +Z toward camera; `HUMANOID_MODEL.rotationY = -0.28`
  gives the three-quarter rest angle.

## 6. Commands

```bash
# regenerate asset
"F:\ENGR BILLI\blender.exe" -b --python scripts/authoring/feex_sovereign_synthetic.py \
  -- public/models/feex-sovereign-synthetic.glb
# move the generated .blend out of public/ afterwards (script writes it next
# to the GLB path — relocate to scripts/authoring/)
```
