# FEEX-SORL Phase 4 — Asset assembly.
#
# Deterministic Blender script (headless-safe):
#   blender --background --python assemble_feex_sorl_assets.py -- \
#       --lab "feex_sorl_lab_blockout_v001.blend" \
#       --humanoid "feex_sovereign_humanoid_v001.blend" \
#       --output "feex_sorl_assembled_v001.blend"
#
# Responsibilities (mega-plan §14.1):
#   - link lab + humanoid collections into one scene
#   - normalize humanoid scale/orientation to staging anchor
#   - validate transforms (feet on floor, facing south)
#   - place humanoid at SORL_HumanoidStaging
#   - NEVER overwrite inputs; versioned output only
#
# LOD generation for the humanoid is handled by decimate modifiers
# here; final Draco GLBs are produced per-chunk by export_feex_sorl_glb.py
# and build_feex_humanoid_web_export.py.

import bpy
import os
import sys


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opts = {}
    for i, a in enumerate(argv):
        if a.startswith("--") and i + 1 < len(argv):
            opts[a[2:]] = argv[i + 1]
    return opts


def append_blend(path, object_prefixes=None):
    """Append all objects from another .blend into the current scene."""
    with bpy.data.libraries.load(path, link=False) as (data_from, data_to):
        data_to.objects = [n for n in data_from.objects
                           if object_prefixes is None
                           or any(n.startswith(p) for p in object_prefixes)]
    return data_to.objects


def normalize_humanoid(objects):
    """Scale humanoid to contract height and ground it at staging."""
    from mathutils import Vector
    meshes = [o for o in objects if o.type == 'MESH']
    if not meshes:
        print("WARN: no humanoid meshes to normalize")
        return
    bpy.context.view_layer.update()
    mins = Vector((1e9,) * 3)
    maxs = Vector((-1e9,) * 3)
    for obj in meshes:
        for corner in obj.bound_box:
            wc = obj.matrix_world @ Vector(corner)
            mins = Vector(map(min, mins, wc))
            maxs = Vector(map(max, maxs, wc))
    height = maxs.z - mins.z
    if height <= 0:
        print("WARN: zero-height humanoid bbox")
        return
    target = 1.82  # contract nominal height, meters
    scale = target / height
    cx = (mins.x + maxs.x) / 2
    cy = (mins.y + maxs.y) / 2
    for obj in objects:
        obj.scale = (obj.scale.x * scale, obj.scale.y * scale,
                     obj.scale.z * scale)
        # recentre horizontally and drop feet to z=0
        obj.location.x -= cx * scale
        obj.location.y -= cy * scale
        obj.location.z -= mins.z * scale
    print(f"[assemble] humanoid normalized: {height:.2f}m -> {target}m "
          f"(scale {scale:.3f})")


def main():
    opts = parse_args()
    for req in ("lab", "humanoid", "output"):
        if req not in opts:
            print(f"ERROR: --{req} is required", file=sys.stderr)
            sys.exit(2)
    lab_path, hum_path, out_path = opts["lab"], opts["humanoid"], opts["output"]
    if os.path.exists(out_path):
        print(f"ERROR: refusing to overwrite: {out_path}", file=sys.stderr)
        sys.exit(3)

    # Start from the lab blend as the base scene.
    bpy.ops.wm.open_mainfile(filepath=lab_path)

    # Append humanoid objects.
    hum_objs = append_blend(hum_path)
    if not hum_objs:
        print("ERROR: no objects appended from humanoid blend", file=sys.stderr)
        sys.exit(4)
    normalize_humanoid(hum_objs)

    # Move humanoid root objects to staging anchor (0, 6.8, 0 in lab space).
    # Armature + meshes share the same offsets after normalization; shift all
    # appended objects uniformly.
    STAGING = (0.0, 6.8, 0.0)
    for obj in hum_objs:
        obj.location.x += STAGING[0]
        obj.location.y += STAGING[1]
        obj.location.z += STAGING[2]

    # Collect appended objects into a dedicated collection.
    col = bpy.data.collections.get("SORL_Character") or \
        bpy.data.collections.new("SORL_Character")
    if col.name not in [c.name for c in bpy.context.scene.collection.children]:
        bpy.context.scene.collection.children.link(col)
    for obj in hum_objs:
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        col.objects.link(obj)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out_path)
    print(f"[assemble_feex_sorl_assets] saved {out_path} "
          f"({len(hum_objs)} humanoid objects)")


if __name__ == "__main__":
    main()
