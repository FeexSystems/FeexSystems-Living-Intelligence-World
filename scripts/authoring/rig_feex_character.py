# Rig the FEEX Tripo character GLB with a procedural humanoid armature.
# Headless: blender -b -P rig_feex_character.py -- <input.glb> <output.glb> <out.blend>
#
# Strategy: import -> orient longest axis to +Z (Tripo exports vary) ->
# decimate -> measure proportions (arm span, wrist drop => T/A-pose) ->
# place ~22-bone humanoid armature -> automatic weights -> export GLB.
# This is a BLOCKOUT rig for preview/retarget experiments, not MetaHuman-grade.

import bpy
import sys
import os
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, DST, BLEND = argv[0], argv[1], argv[2]

# ---------- import ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert meshes, "no mesh imported"

# join into one mesh
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
mesh = bpy.context.view_layer.objects.active
mesh.name = "FEEX_Character"

# apply transforms
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------- orient: longest bbox axis -> +Z, second -> +Y(depth) ----------
bb = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
ext = mx - mn
print("BBOX extents:", tuple(round(e, 4) for e in ext))

# rotation that maps the longest axis to Z
axes = ["X", "Y", "Z"]
long_axis = axes[list(ext).index(max(ext))]
if long_axis == "X":
    mesh.rotation_euler = (0, -1.5707963, 0)   # X -> Z
elif long_axis == "Y":
    mesh.rotation_euler = (1.5707963, 0, 0)    # Y -> Z
# Z already up
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

# ground at z=0, center x/y
bb = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
H = mx.z - mn.z
mesh.location = (-((mn.x + mx.x) / 2), -((mn.y + mx.y) / 2), -mn.z)
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
print("HEIGHT:", round(H, 4))

# ---------- decimate to ~40k ----------
mod = mesh.modifiers.new("Deci", "DECIMATE")
mod.decimate_type = "COLLAPSE"
mod.ratio = 0.28
bpy.ops.object.modifier_apply(modifier="Deci")
print("VERTS after decimate:", len(mesh.data.vertices))

# ---------- measure proportions ----------
zs = [v.co.z for v in mesh.data.vertices]
H = max(zs)  # feet at ~0 now

# arm span: verts in shoulder band [0.60H, 0.78H]
band = [v.co for v in mesh.data.vertices if 0.60 * H <= v.co.z <= 0.80 * H]
arm_x = max(abs(v.x) for v in band) if band else 0.45 * H
print("arm span half-extent:", round(arm_x, 3), "H:", round(H, 3))

# pose detection: T-pose (arms out, arm_x ~0.4-0.5H) vs arms-down (arm_x ~0.1H)
t_pose = arm_x > 0.30 * H
print("POSE:", "T" if t_pose else "ARMS-DOWN")

if t_pose:
    # wrist drop (A-pose detection): mean z of verts near arm tips
    wrist_band = [v.co for v in mesh.data.vertices
                  if abs(v.co.x) > 0.85 * arm_x and v.co.z > 0.3 * H]
    shoulder_z = 0.72 * H
    wrist_z = (sum(v.z for v in wrist_band) / len(wrist_band)) if wrist_band else shoulder_z
    a_pose = wrist_z < shoulder_z - 0.06 * H
    print("wrist_z/H:", round(wrist_z / H, 3), "A-POSE:", a_pose)
else:
    shoulder_z = 0.78 * H
    a_pose = False

# ---------- armature ----------
arm_data = bpy.data.armatures.new("FEEX_Rig")
arm = bpy.data.objects.new("FEEX_Rig", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")

eb = arm_data.edit_bones

def bone(name, head, tail):
    b = eb.new(name)
    b.head = head
    b.tail = tail
    return b

sx = 0.11 * H                      # shoulder joint x (torso edge)
if t_pose:
    ex = sx + (0.52 if not a_pose else 0.48) * (arm_x - sx)
    wx = sx + 0.94 * (arm_x - sx)
    ez = shoulder_z - (0.0 if not a_pose else 0.16 * H)
    wz = shoulder_z - (0.0 if not a_pose else 0.30 * H)
else:
    # arms hang alongside torso: elbow ~0.60H, wrist ~0.47H
    ex, wx = arm_x * 1.05, arm_x * 1.08
    ez, wz = 0.60 * H, 0.47 * H

# spine chain (z up)
bone("hips",      (0, 0, 0.50 * H), (0, 0, 0.58 * H))
bone("spine",     (0, 0, 0.58 * H), (0, 0, 0.66 * H))
bone("chest",     (0, 0, 0.66 * H), (0, 0, 0.75 * H))
bone("neck",      (0, 0, 0.75 * H), (0, 0, 0.83 * H))
bone("head",      (0, 0, 0.83 * H), (0, 0, 0.97 * H))

# legs — slight forward knee, toe forward +Y guess
for side, s in (("L", -1), ("R", 1)):
    hx = 0.085 * H * s
    bone(f"thigh_{side}",  (hx, 0, 0.50 * H), (0.10 * H * s, 0.01 * H, 0.27 * H))
    bone(f"shin_{side}",   (0.10 * H * s, 0.01 * H, 0.27 * H), (0.105 * H * s, 0, 0.05 * H))
    bone(f"foot_{side}",   (0.105 * H * s, 0, 0.05 * H), (0.105 * H * s, 0.16 * H, 0.015 * H))

# arms
for side, s in (("L", -1), ("R", 1)):
    bone(f"clavicle_{side}", (0.05 * H * s, 0, 0.74 * H), (sx * s, 0, shoulder_z))
    bone(f"upperarm_{side}", (sx * s, 0, shoulder_z), (ex * s, 0, ez))
    bone(f"forearm_{side}",  (ex * s, 0, ez), (wx * s, 0, wz))
    bone(f"hand_{side}",     (wx * s, 0, wz),
         ((wx + (0.05 * H if t_pose else 0.01 * H)) * s, 0.02 * H, wz - (0.01 * H if t_pose else 0.05 * H)))

# parent bones to hips for a clean hierarchy
hips = eb.get("hips")
for name in ("spine", "thigh_L", "thigh_R"):
    eb[name].parent = hips
for name, parent in (("chest", "spine"), ("neck", "chest"), ("head", "neck"),
                     ("clavicle_L", "chest"), ("clavicle_R", "chest"),
                     ("shin_L", "thigh_L"), ("foot_L", "shin_L"),
                     ("shin_R", "thigh_R"), ("foot_R", "shin_R"),
                     ("upperarm_L", "clavicle_L"), ("forearm_L", "upperarm_L"), ("hand_L", "forearm_L"),
                     ("upperarm_R", "clavicle_R"), ("forearm_R", "upperarm_R"), ("hand_R", "forearm_R")):
    eb[name].parent = eb[parent]

bpy.ops.object.mode_set(mode="OBJECT")

# ---------- weights ----------
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
try:
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    print("weights: automatic (heat)")
except Exception as e:
    print("heat weighting failed:", e)
    bpy.ops.object.parent_set(type="ARMATURE_NAME")
    print("weights: bone-name groups (manual refine needed)")

# ---------- export ----------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_animations=False,
    export_skins=True,
    export_def_bones=False,
)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print("DONE", DST)
