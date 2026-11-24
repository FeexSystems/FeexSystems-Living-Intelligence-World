# FEEX-SYNTHETIC-ASSET-PROVENANCE

## Asset

| Field | Value |
|---|---|
| File | `public/models/feex-sovereign-synthetic.glb` |
| SHA-256 | `24f4298c680e324241f4d8f1d2f8b8c30c1e67e4293b54300b6efc8ac938bcfa` |
| Size | 205,812 bytes (~201 KB) |
| Format | glTF 2.0 binary (GLB), `+Y up` |
| Source | First-party authored — no third-party asset, no licensed content |
| Authoring tool | Blender 5.2.1 LTS, headless Python |
| Authoring script | `scripts/authoring/feex_sovereign_synthetic.py` (repo source of truth) |
| Blend artifact | `scripts/authoring/feex-sovereign-synthetic.blend` |
| Exporter | Blender built-in `io_scene_gltf2` (first-party) |
| License | Project-owned; no external license obligations |

## Contents (measured from GLB JSON)

- Meshes/nodes: 43
- Skin/joints: 1 skin, 17 joints
- Animations: 4 (`Idle`, `Aware`, `Acknowledge`, `Explain`)
- Materials: 5 (Obsidian, Graphite, BrassInlay, Honeycomb, GlyphAccent)
- Images: 1 (procedural 256² hex alpha texture, embedded)
- Triangles: ~1,100 (low-poly stylized target met)
- glTF extensions: `KHR_materials_emissive_strength`

## Prior asset disposition

- `public/models/RobotExpressive.glb` — removed; superseded by v2.1.0
  character direction (was a three.js example robot, not the spec).
- `public/models/Xbot.glb` — pre-existing, unreferenced, untouched.

## Performance notes

- 201 KB asset → negligible load cost; well under the 5–12 MB desktop /
  2–6 MB mobile targets in plan §5.2.
- Single skin, rigid bindings, 4 short clips — mixer cost trivial.
- Rendering gated by existing `frameloop` visibility/reduced-motion logic;
  `dpr={[1,2]}` clamp preserved.
