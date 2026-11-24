"""
STAGE 02c: Web-deliverable GLB export (uncompressed intermediate).

Exports only the deform skeleton + morph-target meshes to GLB, stripping:
  - Control-rig helper bones (CTRL_*, IK_*, pole targets) via export_def_bones
  - Custom-shape widget meshes (cs_*, cs_grp hierarchy)
  - Cameras, lights

Output feeds stages/03-export-to-glb/tools/compress_to_web.py which applies
Draco quantization per _config/pipeline.yaml.

IMPORTANT — skeleton naming gate:
  export_def_bones relies on bone.use_deform. If the source armature is a raw
  UE5 MetaHuman skeleton (pelvis/spine_01/head, no mixamorig:* bones) rather
  than a Mixamo-retargeted skeleton, verify deform flags survived the FBX
  round-trip before trusting this filter — inspect bone.use_deform in the
  assembled .blend first.

Usage:
  blender -b assembled.blend -P export_web_glb.py -- --output uncompressed.glb
Exit code 0 = exported, 1 = failure.
"""

import os
import sys

import bpy

MAX_TEXTURE_PX = 1024  # pipeline.yaml optimization.texture_max_resolution

CONTROL_PREFIXES = ("cs_", "ctrl_", "ctrl.", "pole", "ik_", "fk_")


def _deliverable_meshes():
    """Meshes that carry morph targets or are skinned to the deform armature."""
    deliverable = []
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        name = obj.name.lower()
        if name.startswith(CONTROL_PREFIXES):
            continue
        # Exclude custom-shape widgets parented under cs_grp
        # (manual walk with cycle guard — parent hierarchies can be cyclic
        # in corrupted imports)
        parent = obj.parent
        seen = {obj.name}
        while parent is not None and parent.name not in seen:
            if parent.name.lower().startswith("cs_"):
                break
            seen.add(parent.name)
            parent = parent.parent
        if parent is not None:
            continue
        has_morphs = bool(obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) > 1)
        has_armature_mod = any(m.type == "ARMATURE" for m in obj.modifiers)
        if has_morphs or has_armature_mod:
            deliverable.append(obj)
    return deliverable


def _deform_armatures(meshes):
    armatures = set()
    for obj in meshes:
        for mod in obj.modifiers:
            if mod.type == "ARMATURE" and mod.object:
                armatures.add(mod.object)
    # Fallback: any armature containing mixamorig-style deform bones
    if not armatures:
        for obj in bpy.data.objects:
            if obj.type == "ARMATURE" and any(
                b.name.lower().startswith("mixamorig") for b in obj.data.bones
            ):
                armatures.add(obj)
    return list(armatures)


def _preflight_deform_report(armatures):
    """Surface suspicious use_deform flags before trusting export_def_bones."""
    for arm in armatures:
        deform = [b.name for b in arm.data.bones if b.use_deform]
        nondef = [b.name for b in arm.data.bones if not b.use_deform]
        print(f"Armature '{arm.name}': {len(deform)} deform / {len(nondef)} non-deform bones")
        if not deform:
            print(f"  WARNING: zero deform bones — export_def_bones would strip "
                  f"the entire skeleton. Check FBX import / UE5 skeleton mapping.")
        # Heuristic: long non-deform chains on a Mixamo skeleton usually means
        # helper/twist bones; on a UE5 skeleton it may mean flags were lost.
        mixamorig_deform = [n for n in deform if n.lower().startswith("mixamorig")]
        if deform and not mixamorig_deform and any(
            n.lower().startswith("mixamorig") for n in nondef
        ):
            print(f"  WARNING: mixamorig bones exist but none flagged use_deform — "
                  f"deform weights may be lost in export.")


def _find_action_or_nla_strip(action_name):
    """Resolve an action by name, falling back to NLA strips that reference
    (or are named) the clip. Returns (action, source_description)."""
    action = bpy.data.actions.get(action_name)
    if action is not None:
        return action, "bpy.data.actions"

    # NLA fallback: strips carry .action references or standalone names
    for ob in bpy.data.objects:
        ad = getattr(ob, "animation_data", None)
        if ad is None:
            continue
        for track in ad.nla_tracks:
            for strip in track.strips:
                strip_action = getattr(strip, "action", None)
                if strip_action is not None and strip_action.name == action_name:
                    return strip_action, f"NLA strip on '{ob.name}'/{track.name}"
                if strip.name == action_name and strip_action is not None:
                    return strip_action, f"NLA strip '{strip.name}' on '{ob.name}'"
    return None, None


def _pick_action_slot(action, armature):
    """Choose the correct slot for slotted actions (Blender 4.4+/5.x).

    Prefers a slot whose identifier references the target armature or OBJECT
    id type; falls back to the first slot with a warning. Returns slot or None.
    """
    slots = getattr(action, "slots", None)
    if not slots or len(slots) == 0:
        return None

    descriptors = []
    for s in slots:
        ident = getattr(s, "identifier", "") or ""
        id_type = getattr(s, "target_id_type", "") or ""
        descriptors.append(f"{ident or '?'}({id_type or '?'})")

    # Prefer OBJECT-type slot, then any slot mentioning the armature name
    arm_lower = armature.name.lower()
    for s in slots:
        ident = (getattr(s, "identifier", "") or "").lower()
        id_type = getattr(s, "target_id_type", "") or ""
        if id_type == "OBJECT" or arm_lower in ident:
            print(f"Action slot selected: {getattr(s, 'identifier', '?')} "
                  f"(of {len(slots)}: {', '.join(descriptors)})")
            return s

    print(f"WARNING: no OBJECT/armature-matching slot found; using slots[0] "
          f"of {len(slots)}: {', '.join(descriptors)}")
    return slots[0]


def _stage_idle_action(armatures, action_name):
    """Assign a single named action to the deform armature and mute everything
    else so the glTF exporter emits exactly one animation clip."""
    action, source = _find_action_or_nla_strip(action_name)
    if action is None:
        print(f"ERROR: action '{action_name}' not found in bpy.data.actions "
              f"or NLA strips (available actions: "
              f"{[a.name for a in bpy.data.actions]})")
        return False
    print(f"Animation source: {source} -> action '{action.name}'")

    target = armatures[0] if armatures else None
    if target is None:
        print("ERROR: no deform armature to attach action to.")
        return False

    ad = target.animation_data or target.animation_data_create()
    ad.action = action

    slot = _pick_action_slot(action, target)
    if slot is not None:
        try:
            ad.action_slot = slot
        except Exception as e:
            print(f"Slot assignment notice (continuing): {e}")

    # Mute all NLA tracks so ACTIVE_ACTIONS mode emits only this clip
    if ad.nla_tracks:
        for track in ad.nla_tracks:
            track.mute = True

    # Mute actions on other objects so they don't leak into the export
    for ob in bpy.data.objects:
        if ob == target or ob.animation_data is None:
            continue
        if ob.animation_data.action:
            ob.animation_data.action = None
    return True


def _enforce_texture_cap():
    resized = 0
    for image in bpy.data.images:
        w, h = image.size
        if w > MAX_TEXTURE_PX or h > MAX_TEXTURE_PX:
            scale = MAX_TEXTURE_PX / max(w, h)
            try:
                image.scale(max(1, int(w * scale)), max(1, int(h * scale)))
                resized += 1
            except Exception as e:
                print(f"Texture cap notice for '{image.name}': {e}")
    if resized:
        print(f"Texture cap: resized {resized} image(s) to <= {MAX_TEXTURE_PX}px")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    output = "./docs/characters/feex_sovereign/uncompressed.glb"
    action_name = None
    if "--output" in argv:
        output = argv[argv.index("--output") + 1]
    if "--action" in argv:
        action_name = argv[argv.index("--action") + 1]

    meshes = _deliverable_meshes()
    if not meshes:
        print("ERROR: no deliverable meshes found (need morph-target or skinned meshes).")
        sys.exit(1)

    armatures = _deform_armatures(meshes)
    print(f"Deliverable meshes: {[m.name for m in meshes]}")
    print(f"Deform armatures: {[a.name for a in armatures]}")
    _preflight_deform_report(armatures)

    export_animations = False
    if action_name:
        export_animations = _stage_idle_action(armatures, action_name)
        if not export_animations:
            sys.exit(1)

    # Selection set for use_selection export
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes + armatures:
        obj.select_set(True)

    _enforce_texture_cap()

    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,          # keep armature modifiers live for skinning
        export_animations=export_animations,
        export_animation_mode="ACTIVE_ACTIONS" if export_animations else "ACTIONS",
        export_morph=True,           # shape keys -> glTF morph targets
        export_def_bones=True,       # strip CTRL_*/IK_*/pole helper bones
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_image_format="AUTO",
    )
    print(f"GLB intermediate exported: {output}")
    sys.exit(0)


if __name__ == "__main__":
    main()
