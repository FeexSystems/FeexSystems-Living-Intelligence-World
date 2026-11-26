# FEEX-SORL Phase 2 — Laboratory blockout orchestrator.
#
# Deterministic Blender authoring script (headless-safe):
#   blender --background --python build_feex_sorl_blockout.py -- \
#       --output "F:/path/to/feex_sorl_lab_blockout.blend"
#
# Pipeline:
#   1. build_feex_sorl_architecture.py — shell, frames, glass, lights
#   2. build_feex_sorl_zones.py       — seven zones, furniture, anchors
#   3. camera presets                 — overview + per-zone focus
#   4. save .blend                    — versioned output path only
#
# Does NOT export GLB (see export_feex_sorl_glb.py) and does NOT touch
# any pre-existing user file — output path is mandatory and explicit.

import bpy
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import build_feex_sorl_architecture as arch
import build_feex_sorl_zones as zones


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = None
    for i, a in enumerate(argv):
        if a == "--output" and i + 1 < len(argv):
            out = argv[i + 1]
    return out


def build_cameras():
    """Overview + one focus camera per zone (all look at zone anchors)."""
    scene = bpy.context.scene
    cam_col = bpy.data.collections.get("SORL_Cameras") or \
        bpy.data.collections.new("SORL_Cameras")
    if cam_col.name not in [c.name for c in scene.collection.children]:
        scene.collection.children.link(cam_col)

    def add_cam(name, loc, target):
        cd = bpy.data.cameras.new(name)
        cd.lens = 24
        cd.clip_end = 200
        ob = bpy.data.objects.new(name, cd)
        cam_col.objects.link(ob)
        ob.location = loc
        # point at target
        direction = target - ob.location
        ob.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        return ob

    # Overview: high corner looking into atrium.
    overview = add_cam("CAM_SORL_Overview",
                       (-13.5, -10.5, 7.2),
                       __import__('mathutils').Vector((0, 0.5, 1.2)))
    scene.camera = overview

    for z in zones.ZONES:
        zid = z["id"]
        cx, cy = z["center"]
        # Camera stands in the atrium/circulation band facing the zone.
        dist = 7.0
        if cy > 0:
            cy_cam = cy - z["size"][1] / 2 - dist
        else:
            cy_cam = cy + z["size"][1] / 2 + dist
        cx_cam = cx
        target = __import__('mathutils').Vector((cx, cy, 1.5))
        add_cam(f"CAM_SORL_{zid}", (cx_cam, cy_cam, 3.4), target)

    # Humanoid presentation camera: inside humanoid-bay facing staging.
    hb = next(z for z in zones.ZONES if z["id"] == "humanoid-bay")
    add_cam("CAM_SORL_Humanoid",
            (hb["center"][0], hb["center"][1] - 6.5, 1.7),
            __import__('mathutils').Vector(
                (hb["center"][0], hb["center"][1] - 1.8, 1.2)))

    print("[build_feex_sorl_blockout] cameras: overview + 7 zones + humanoid")


def main():
    output = parse_args()
    if not output:
        print("ERROR: --output <path.blend> is required", file=sys.stderr)
        sys.exit(2)

    arch.ensure_clean_scene()
    arch.build_architecture()
    zones.build_zones()
    build_cameras()

    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output)
    print(f"[build_feex_sorl_blockout] saved {output}")


if __name__ == "__main__":
    main()
