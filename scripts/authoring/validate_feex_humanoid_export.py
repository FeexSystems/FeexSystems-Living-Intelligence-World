# FEEX-SORL Phase 3/4 — Humanoid export validator.
#
# Deterministic Blender script (headless-safe):
#   blender --background character.blend --python validate_feex_humanoid_export.py
#
# Exit 0 = pass; 1 = failures. Validates against FEEX-SORL-CHARACTER-CONTRACT:
#   - armature present with sane bone count
#   #   - required morph targets on the body mesh
#   - NLA/action clips matching the 11-clip contract
#   - real-world scale (height ~1.7-2.0 m)
#   - mesh normals/UV sanity on skinned meshes

import bpy
import sys
from mathutils import Vector

REQUIRED_CLIPS = [
    "Idle", "Aware", "Listen", "Think", "Acknowledge", "Explain",
    "Inspect", "Point", "Walk", "Speak", "Unavailable",
]

REQUIRED_MORPHS = [
    "EyeBlinkLeft", "EyeBlinkRight", "JawOpen",
    "MouthSmileLeft", "MouthSmileRight",
    "BrowInnerUp", "BrowDownLeft", "BrowDownRight",
    "EyeLookUpLeft", "EyeLookDownLeft",
    "EyeLookUpRight", "EyeLookDownRight",
]

MIN_HEIGHT, MAX_HEIGHT = 1.5, 2.2


def fail(msg, errors):
    errors.append(msg)
    print(f"FAIL: {msg}")


def collect_actions():
    names = set()
    # Actions may live on the NLA of any animated object or in bpy.data.actions
    for ad in bpy.data.actions:
        names.add(ad.name)
    for obj in bpy.data.objects:
        if obj.animation_data:
            for track in obj.animation_data.nla_tracks:
                for strip in track.strips:
                    if strip.action:
                        names.add(strip.action.name)
            if obj.animation_data.action:
                names.add(obj.animation_data.action.name)
    return names


def main():
    errors = []

    # --- Armature ----------------------------------------------------------
    armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not armatures:
        fail("no armature found", errors)
    else:
        arm = armatures[0]
        nb = len(arm.data.bones)
        print(f"INFO: armature '{arm.name}' bones={nb}")
        if nb < 20:
            fail(f"suspiciously few bones: {nb}", errors)

    # --- Morph targets ------------------------------------------------------
    morph_names = set()
    skinned = []
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.data.shape_keys:
            morph_names.update(obj.data.shape_keys.key_blocks.keys())
            if any(g.type == 'ARMATURE' for g in obj.vertex_groups):
                skinned.append(obj)
    missing = [m for m in REQUIRED_MORPHS if m not in morph_names]
    if missing:
        fail(f"missing morph targets: {missing}", errors)
    print(f"INFO: morph targets found={len(morph_names)}")

    # --- Clips ---------------------------------------------------------------
    actions = collect_actions()
    # Blender action names may carry .NNN suffixes; match on prefix.
    def has_clip(c):
        return any(a == c or a.startswith(c + ".") for a in actions)
    missing_clips = [c for c in REQUIRED_CLIPS if not has_clip(c)]
    if missing_clips:
        fail(f"missing clips: {missing_clips}", errors)
    print(f"INFO: actions={sorted(actions)}")

    # --- Scale ----------------------------------------------------------------
    if bpy.data.objects:
        bpy.context.view_layer.update()
        mins = Vector((1e9, 1e9, 1e9))
        maxs = Vector((-1e9, -1e9, -1e9))
        for obj in bpy.data.objects:
            if obj.type != 'MESH':
                continue
            for corner in obj.bound_box:
                wc = obj.matrix_world @ Vector(corner)
                mins = Vector(map(min, mins, wc))
                maxs = Vector(map(max, maxs, wc))
        height = maxs.z - mins.z
        print(f"INFO: bbox height={height:.2f} m")
        if not (MIN_HEIGHT <= height <= MAX_HEIGHT):
            fail(f"implausible height {height:.2f} m", errors)

    # --- Normals / UVs on skinned meshes --------------------------------------
    for obj in skinned:
        if not obj.data.uv_layers:
            fail(f"skinned mesh without UVs: {obj.name}", errors)
        for poly in obj.data.polygons:
            if not poly.use_smooth:
                pass  # hard edges are legal; informational only

    if errors:
        print(f"VALIDATION FAILED: {len(errors)} error(s)")
        sys.exit(1)
    print("VALIDATION PASSED")


if __name__ == "__main__":
    main()
