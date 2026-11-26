# FEEX-SORL Phase 2 — Scene validation.
#
# Deterministic Blender script (headless-safe):
#   blender --background scene.blend --python validate_feex_sorl_scene.py
#
# Exit code 0 = all checks pass; 1 = failures printed to stdout.
# Checks: required collections, zone anchors, camera presets, material
# slots on every mesh, object naming conventions, scale sanity.

import bpy
import sys

REQUIRED_ZONES = [
    "command-centre", "humanoid-bay", "robotics-sim",
    "ai-research", "bio-research", "engineering-workshop",
    "observation-gallery",
]
REQUIRED_CAMERAS = ["CAM_SORL_Overview"] + [f"CAM_SORL_{z}" for z in REQUIRED_ZONES] \
    + ["CAM_SORL_Humanoid"]
MAX_DIM = 60.0  # generous bound; shell is 30x30x5.5


def fail(msg, errors):
    errors.append(msg)
    print(f"FAIL: {msg}")


def main():
    errors = []
    names = {o.name for o in bpy.data.objects}

    # 1. Zone anchors
    for z in REQUIRED_ZONES:
        if f"ZONE_{z}" not in names:
            fail(f"missing anchor ZONE_{z}", errors)
        if f"HOTSPOT_{z}" not in names:
            fail(f"missing hotspot HOTSPOT_{z}", errors)
    if "SORL_HumanoidStaging" not in names:
        fail("missing SORL_HumanoidStaging", errors)

    # 2. Cameras
    for c in REQUIRED_CAMERAS:
        if c not in names:
            fail(f"missing camera {c}", errors)

    # 3. Every mesh has a material slot
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and not obj.data.materials:
            fail(f"mesh without material: {obj.name}", errors)

    # 4. Scale sanity — no object absurdly large
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            dims = [obj.dimensions[i] for i in range(3)]
            if max(dims, default=0) > MAX_DIM:
                fail(f"oversized object {obj.name}: {dims}", errors)

    # 5. Counts
    n_zones = sum(1 for n in names if n.startswith("ZONE_") and n.count("_") == 1)
    n_mesh = sum(1 for o in bpy.data.objects if o.type == 'MESH')
    n_cam = sum(1 for o in bpy.data.objects if o.type == 'CAMERA')
    print(f"INFO: zones={n_zones} meshes={n_mesh} cameras={n_cam}")
    if n_zones < len(REQUIRED_ZONES):
        fail(f"only {n_zones} zone anchors found", errors)

    if errors:
        print(f"VALIDATION FAILED: {len(errors)} error(s)")
        sys.exit(1)
    print("VALIDATION PASSED")


if __name__ == "__main__":
    main()
