# FEEX-SORL Phase 2/4 — GLB export + provenance manifest.
#
# Deterministic Blender script (headless-safe):
#   blender --background scene.blend --python export_feex_sorl_glb.py -- \
#       --output "public/models/feex-sorl/feex_sorl_lab_v001.glb"
#
# Exports the assembled lab as a Draco-compressed GLB into a VERSIONED
# path (never overwrites without an explicit new version), then writes
# a sibling .manifest.json with SHA-256, triangle count, object count,
# and the Blender file provenance.

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


def count_tris():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    tris = 0
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue
        ev = obj.evaluated_get(depsgraph)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        tris += len(me.loop_triangles)
        ev.to_mesh_clear()
    return tris


def export_glb(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    kwargs = dict(
        filepath=path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_animations=False,
        export_cameras=False,       # cameras stay authoring-side
        export_lights=False,        # lights are scene hints, not assets
        export_extras=True,
    )
    # Draco compression (Blender 4.x/5.x arg name)
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
        print(f"ERROR: refusing to overwrite existing asset: {output}",
              file=sys.stderr)
        sys.exit(3)

    export_glb(output)
    if not os.path.exists(output):
        print("ERROR: export produced no file", file=sys.stderr)
        sys.exit(4)

    manifest = {
        "asset": os.path.basename(output),
        "sha256": sha256_file(output),
        "bytes": os.path.getsize(output),
        "triangles": count_tris(),
        "objects": len(bpy.data.objects),
        "source_blend": bpy.data.filepath,
        "exporter": "blender-gltf2",
        "compression": "draco",
    }
    mpath = output + ".manifest.json"
    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[export_feex_sorl_glb] {output}")
    print(f"[export_feex_sorl_glb] manifest {mpath}")
    print(f"[export_feex_sorl_glb] sha256={manifest['sha256'][:16]}… "
          f"tris={manifest['triangles']}")


if __name__ == "__main__":
    main()
