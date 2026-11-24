"""
STAGE 02b: Mixamo control-rig generation (headless driver).

Loads the bundled Mixamo Rig add-on (stages/02-blender-assemble/addons/mixamo_rig)
into the running Blender session, locates the Mixamo skeleton armature, and
invokes the `mr.make_rig` operator to build the IK/FK control rig.

Prerequisites:
  - The .blend scene must already contain the Mixamo-imported armature
    (bones named mixamorig:* or similar) as the active object candidate.
  - Run AFTER shapekey_transfer.py has produced Web_Target_* meshes, or on a
    dedicated rig pass — this operator rebuilds pose machinery, so keep it
    isolated from morph baking if possible.

Usage:
  blender -b scene.blend -P generate_control_rig.py -- --armature "Armature"

Exit code 0 = rig generated, 1 = failure.
"""

import os
import sys

import bpy


def _addon_parent_dir():
    # stages/02-blender-assemble/tools -> stages/02-blender-assemble/addons
    return os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "addons")
    )


def _load_addon():
    addons_dir = _addon_parent_dir()
    package_dir = os.path.join(addons_dir, "mixamo_rig")
    if not os.path.isdir(package_dir):
        print(f"ERROR: Mixamo Rig add-on not found at {package_dir}")
        return False

    if addons_dir not in sys.path:
        sys.path.insert(0, addons_dir)

    try:
        import mixamo_rig  # noqa: F401  (package __init__ imports submodules)
    except Exception as e:
        print(f"ERROR: failed to import mixamo_rig package: {e}")
        return False

    try:
        mixamo_rig.register()
        print("Mixamo Rig add-on registered.")
    except Exception as e:
        # Already registered in this session is acceptable
        print(f"Add-on register notice (continuing): {e}")
    return True


def _find_mixamo_armature(preferred_name=None):
    if preferred_name:
        obj = bpy.data.objects.get(preferred_name)
        if obj and obj.type == "ARMATURE":
            return obj

    for obj in bpy.data.objects:
        if obj.type != "ARMATURE":
            continue
        bone_names = [b.name.lower() for b in obj.data.bones]
        if any(n.startswith("mixamorig") for n in bone_names):
            return obj
    return None


def _make_rig(armature_name=None):
    armature = _find_mixamo_armature(armature_name)
    if armature is None:
        print("ERROR: No Mixamo armature (mixamorig:* bones) found in scene.")
        return False

    print(f"Target armature: {armature.name}")

    # Operator context requires an active, selected armature object
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    try:
        bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.mode_set(mode="POSE")
    except Exception as e:
        print(f"Pose-mode entry notice: {e}")

    # The add-on's operators are VIEW_3D-context sensitive; in background mode
    # poll() fails without an override even though a VIEW_3D area exists in the
    # saved .blend's screen layout.
    win = bpy.context.window_manager.windows[0] if bpy.context.window_manager.windows else None
    area = None
    if win and win.screen:
        area = next((a for a in win.screen.areas if a.type == "VIEW_3D"), None)

    try:
        if area:
            with bpy.context.temp_override(
                window=win, area=area,
                active_object=armature, object=armature,
            ):
                bpy.ops.mr.make_rig()
        else:
            bpy.ops.mr.make_rig()
        print("mr.make_rig executed successfully.")
        return True
    except Exception as e:
        print(f"ERROR: mr.make_rig failed: {e}")
        print("NOTE: this operator is context-sensitive; if it fails headless,")
        print("run the same step inside Blender's GUI once, then re-run pipeline.")
        return False


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    armature_name = None
    if "--armature" in argv:
        armature_name = argv[argv.index("--armature") + 1]

    if not _load_addon():
        sys.exit(1)

    ok = _make_rig(armature_name)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
