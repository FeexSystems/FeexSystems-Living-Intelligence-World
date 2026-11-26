# FEEX-SORL Phase 3/4 — Humanoid web export.
#
# Deterministic Blender script (headless-safe):
#   blender --background character.blend --python build_feex_humanoid_web_export.py -- \
#       --output "public/models/feex-sorl/feex_sovereign_humanoid_v001.glb"
#
# Exports the rigged humanoid WITH animations and morph targets,
# Draco-compressed, into a versioned path. Refuses to overwrite.
# Writes .manifest.json with SHA-256 + clip/morph inventory.
#
# Contract: docs/program/FEEX-SORL-CHARACTER-CONTRACT.md

import bpy
import hashlib
import json
import os
import sys


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = None
    for i, a in enumerate(argv):
        if a == "--output" and i + 1 < len(argv):
            out = argv[i + 1]
    return out


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def inventory():
    clips, morphs, bones = set(), set(), 0
    for ad in bpy.data.actions:
        clips.add(ad.name)
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.data.shape_keys:
            morphs.update(obj.data.shape_keys.key_blocks.keys())
        if obj.type == 'ARMATURE':
            bones = max(bones, len(obj.data.bones))
    return sorted(clips), sorted(morphs), bones


def export_glb(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    kwargs = dict(
        filepath=path,
        export_format='GLB',
        use_selection=False,
        export_apply=False,          # keep armature/modifiers intact
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_morph=True,
        export_skins=True,
        export_yup=True,
        export_extras=True,
    )
    try:
        bpy.ops.export_scene.gltf(
            **kwargs,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=7,
        )
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def main():
    output = parse_args()
    if not output:
        print("ERROR: --output <path.glb> is required", file=sys.stderr)
        sys.exit(2)
    if os.path.exists(output):
        print(f"ERROR: refusing to overwrite: {output}", file=sys.stderr)
        sys.exit(3)

    export_glb(output)
    if not os.path.exists(output):
        print("ERROR: export produced no file", file=sys.stderr)
        sys.exit(4)

    clips, morphs, bones = inventory()
    manifest = {
        "asset": os.path.basename(output),
        "sha256": sha256_file(output),
        "bytes": os.path.getsize(output),
        "bones": bones,
        "clips": clips,
        "morph_targets": morphs,
        "source_blend": bpy.data.filepath,
        "exporter": "blender-gltf2",
        "compression": "draco",
        "contract": "docs/program/FEEX-SORL-CHARACTER-CONTRACT.md",
    }
    mpath = output + ".manifest.json"
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[build_feex_humanoid_web_export] {output}")
    print(f"  sha256={manifest['sha256'][:16]}… clips={len(clips)} "
          f"morphs={len(morphs)} bones={bones}")


if __name__ == "__main__":
    main()
