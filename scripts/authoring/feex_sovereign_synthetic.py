# FEEX Sovereign Synthetic — procedural Blender authoring script
# Plan: FEEX-SOVEREIGN-SYNTHETIC-IMPLEMENTATION-PLAN v2.1.0 §3
#
# Builds a stylized, clearly-synthetic humanoid (obsidian/graphite/brass,
# honeycomb joint lattice, emissive GlyphAccent "presence" line) with a
# simple humanoid armature and four animation actions:
#   Idle, Aware, Acknowledge, Explain
#
# Run headless:
#   blender -b --python scripts/authoring/feex_sovereign_synthetic.py -- \
#       --out public/models/feex-sovereign-synthetic.glb
#
# The script is the reproducible source of truth; the .blend and .glb are
# generated artifacts.

import math
import os
import sys

import bpy
from mathutils import Vector

# ---------------------------------------------------------------- args
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT_GLB = argv[0] if argv else "public/models/feex-sovereign-synthetic.glb"
OUT_BLEND = os.path.splitext(OUT_GLB)[0] + ".blend"

# ---------------------------------------------------------------- reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 24

# ---------------------------------------------------------------- materials
def make_mat(name, color, metallic=0.0, roughness=0.6,
             emission=None, emission_strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        # Blender 4.x/5.x Principled input names
        for key in ("Emission Color", "Emission"):
            inp = bsdf.inputs.get(key)
            if inp is not None:
                inp.default_value = (*emission, 1.0)
                break
        s = bsdf.inputs.get("Emission Strength")
        if s is not None:
            s.default_value = emission_strength
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        # glTF exporter reads blend method; set what this version supports
        for attr, val in (("surface_render_method", "DITHERED"),
                          ("blend_method", "BLEND")):
            if hasattr(mat, attr):
                try:
                    setattr(mat, attr, val)
                except Exception:
                    pass
    return mat

MAT_OBSIDIAN = make_mat("Obsidian", (0.035, 0.038, 0.05), metallic=0.4, roughness=0.48)
MAT_GRAPHITE = make_mat("Graphite", (0.13, 0.14, 0.16), metallic=0.75, roughness=0.36)
MAT_BRASS = make_mat("BrassInlay", (0.55, 0.38, 0.16), metallic=1.0, roughness=0.3)
MAT_GLYPH = make_mat("GlyphAccent", (0.05, 0.04, 0.03), metallic=0.2, roughness=0.4,
                     emission=(1.0, 0.62, 0.25), emission_strength=3.0)

# Honeycomb alpha texture (procedural hex grid) for joint lattice panels
def make_honeycomb_image(name="Honeycomb", size=256):
    img = bpy.data.images.new(name, width=size, height=size, alpha=True)
    px = [0.0] * (size * size * 4)
    # hex lattice: cell radius in px; draw cell borders bright amber
    r = size / 16.0
    w = r * 0.16  # border half-width
    import math as _m
    for y in range(size):
        for x in range(size):
            # pointy-top hex grid distance
            q = (x / (r * 1.5))
            rr = (y / (r * _m.sqrt(3)))
            # axial -> offset approx via two shifted lattices
            d = 1e9
            for ox, oy in ((0.0, 0.0), (0.75, 0.5), (0.0, 1.0), (0.75, 1.5)):
                dx = (q + ox) - round(q + ox)
                dy = (rr + oy) - round(rr + oy)
                dd = _m.hypot(dx * 1.5, dy * _m.sqrt(3))
                d = min(d, dd)
            border = _m.exp(-((d - 0.62) ** 2) / (2 * (w / r) ** 2))
            i = (y * size + x) * 4
            px[i] = 1.0      # R amber
            px[i + 1] = 0.62
            px[i + 2] = 0.28
            px[i + 3] = border * 0.85
    img.pixels = px
    img.pack()
    return img

HC_IMG = make_honeycomb_image()
MAT_HONEY = make_mat("Honeycomb", (0.14, 0.11, 0.07), metallic=0.3, roughness=0.5, alpha=0.9)
hc_node = MAT_HONEY.node_tree.nodes.new("ShaderNodeTexImage")
hc_node.image = HC_IMG
MAT_HONEY.node_tree.links.new(
    hc_node.outputs["Color"],
    MAT_HONEY.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
MAT_HONEY.node_tree.links.new(
    hc_node.outputs["Alpha"],
    MAT_HONEY.node_tree.nodes["Principled BSDF"].inputs["Alpha"])

# ---------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new("FEEXRig")
arm_obj = bpy.data.objects.new("FEEXRig", arm_data)
scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="EDIT")

def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
    return b

# Proportions (meters, Z-up). Stylized elongated humanoid, ~1.9 m.
# Joint positions:
J = {
    "hips":    (0.00, 0.00, 0.96),
    "spine":   (0.00, 0.00, 1.08),
    "chest":   (0.00, 0.00, 1.24),
    "neck":    (0.00, 0.00, 1.42),
    "head":    (0.00, 0.00, 1.52),
    "shL":     (0.11, 0.00, 1.38), "shR": ( -0.11, 0.00, 1.38),
    "uaL":     (0.17, 0.00, 1.36), "uaR": ( -0.17, 0.00, 1.36),
    "faL":     (0.185, 0.00, 1.02), "faR": (-0.185, 0.00, 1.02),
    "haL":     (0.19, 0.00, 0.74), "haR": (-0.19, 0.00, 0.74),
    "thL":     (0.085, 0.00, 0.92), "thR": (-0.085, 0.00, 0.92),
    "snL":     (0.09, -0.01, 0.52), "snR": (-0.09, -0.01, 0.52),
    "ftL":     (0.09, -0.02, 0.10), "ftR": (-0.09, -0.02, 0.10),
}
def V(*a):
    return Vector(a[0]) if len(a) == 1 else Vector(a)
bone("Hips",      V(*J["hips"]),    V(0, 0, 1.02), None)
bone("Spine",     V(*J["spine"]),   V(0, 0, 1.16), "Hips")
bone("Chest",     V(*J["chest"]),   V(0, 0, 1.40), "Spine")
bone("Neck",      V(*J["neck"]),    V(0, 0, 1.50), "Chest")
bone("Head",      V(*J["head"]),    V(0, 0, 1.72), "Neck")
for s, sx in (("L", 1), ("R", -1)):
    bone(f"UpperArm.{s}", V(*J[f"ua{sx if sx>0 else ''}"] if False else J["uaL" if s=="L" else "uaR"]),
         V(*J["faL" if s=="L" else "faR"]), "Chest")
    bone(f"ForeArm.{s}",  V(*J["faL" if s=="L" else "faR"]),
         V(*J["haL" if s=="L" else "haR"]), f"UpperArm.{s}")
    bone(f"Hand.{s}",     V(*J["haL" if s=="L" else "haR"]),
         V(J["haL" if s=="L" else "haR"][0], J["haL" if s=="L" else "haR"][1],
           J["haL" if s=="L" else "haR"][2] - 0.18), f"ForeArm.{s}")
    bone(f"Thigh.{s}",    V(*J["thL" if s=="L" else "thR"]),
         V(*J["snL" if s=="L" else "snR"]), "Hips")
    bone(f"Shin.{s}",     V(*J["snL" if s=="L" else "snR"]),
         V(*J["ftL" if s=="L" else "ftR"]), f"Thigh.{s}")
    bone(f"Foot.{s}",     V(*J["ftL" if s=="L" else "ftR"]),
         V(J["ftL" if s=="L" else "ftR"][0],
           J["ftL" if s=="L" else "ftR"][1] - 0.09,
           0.02), f"Shin.{s}")

bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------- mesh helpers
PARTS = []  # (object, bone_name)

def _finish(obj, name, mat, bone_name, smooth=False):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = arm_obj
    obj.parent = arm_obj
    PARTS.append(obj)
    return obj

def add_cube(name, loc, scale, mat, bone_name, rot=None):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rot:
        o.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return _finish(o, name, mat, bone_name)

def add_cyl(name, loc, radius, depth, mat, bone_name, verts=8, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o = bpy.context.active_object
    if rot:
        o.rotation_euler = rot
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return _finish(o, name, mat, bone_name)

def add_ico(name, loc, radius, mat, bone_name, scale, subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, name, mat, bone_name, smooth=False)

X = math.pi / 2  # cylinder default axis is Z; X rotates to lie along... we keep Z mostly

# ---- pelvis / torso (obsidian core, graphite joints, brass inlays)
add_cube("Pelvis", (0, 0, 0.98), (0.16, 0.11, 0.10), MAT_OBSIDIAN, "Hips")
add_cyl("Abdomen", (0, 0, 1.14), 0.105, 0.20, MAT_OBSIDIAN, "Spine", verts=8)
add_cyl("Chest", (0, 0, 1.30), 0.155, 0.22, MAT_OBSIDIAN, "Chest", verts=8)
# tapered chest cap -> faceted shoulder line
add_cyl("ChestCap", (0, 0, 1.415), 0.16, 0.05, MAT_GRAPHITE, "Chest", verts=8)
# brass inlay bands (pattern language)
add_cyl("ChestBand", (0, 0, 1.335), 0.162, 0.022, MAT_BRASS, "Chest", verts=8)
add_cyl("WaistBand", (0, 0, 1.045), 0.112, 0.020, MAT_BRASS, "Spine", verts=8)
add_cyl("Neck", (0, 0, 1.455), 0.045, 0.09, MAT_GRAPHITE, "Neck", verts=8)

# ---- head: faceted masked form + emissive glyph presence line
add_ico("Head", (0, -0.005, 1.62), 0.115, MAT_OBSIDIAN, "Head",
        scale=(0.92, 0.98, 1.18), subdiv=1)
# brow/visor band
add_cube("Visor", (0, -0.108, 1.635), (0.075, 0.012, 0.014), MAT_GLYPH, "Head")
# jaw guard
add_cube("JawGuard", (0, -0.055, 1.535), (0.06, 0.05, 0.02), MAT_GRAPHITE, "Head")

# ---- arms (elongated, geometric)
for s, sx in (("L", 1), ("R", -1)):
    ua = f"UpperArm.{s}"; fa = f"ForeArm.{s}"; ha = f"Hand.{s}"
    # pauldron
    add_ico(f"Pauldron.{s}", (sx * 0.185, 0, 1.375), 0.075, MAT_GRAPHITE, ua,
            scale=(1.0, 0.9, 0.75), subdiv=1)
    # upper arm: vertical capsule-ish cylinder
    add_cyl(f"UpperArmMesh.{s}", (sx * 0.185, 0, 1.19), 0.052, 0.30, MAT_OBSIDIAN, ua, verts=8)
    add_cyl(f"UpperArmRing.{s}", (sx * 0.185, 0, 1.10), 0.058, 0.02, MAT_BRASS, ua, verts=8)
    # forearm core + honeycomb lattice section
    add_cyl(f"ForeArmCore.{s}", (sx * 0.1875, 0, 0.88), 0.046, 0.24, MAT_GRAPHITE, fa, verts=8)
    add_cyl(f"ForeArmHoney.{s}", (sx * 0.1875, 0, 0.88), 0.050, 0.10, MAT_HONEY, fa, verts=8)
    add_cyl(f"WristRing.{s}", (sx * 0.19, 0, 0.755), 0.055, 0.018, MAT_BRASS, fa, verts=8)
    # hand: angular mitt + 3 fingers
    add_cube(f"Palm.{s}", (sx * 0.19, -0.005, 0.66), (0.045, 0.035, 0.07), MAT_OBSIDIAN, ha)
    for i in range(3):
        add_cube(f"Finger{i}.{s}", (sx * 0.19, -0.045, 0.615 - i * 0.035),
                 (0.012, 0.02, 0.045), MAT_GRAPHITE, ha)

# ---- legs
for s, sx in (("L", 1), ("R", -1)):
    th = f"Thigh.{s}"; sn = f"Shin.{s}"; ft = f"Foot.{s}"
    add_cyl(f"ThighMesh.{s}", (sx * 0.085, 0, 0.71), 0.075, 0.40, MAT_OBSIDIAN, th, verts=8)
    add_cyl(f"KneeRing.{s}", (sx * 0.09, -0.005, 0.53), 0.085, 0.025, MAT_BRASS, sn, verts=8)
    add_cyl(f"ShinCore.{s}", (sx * 0.09, -0.008, 0.30), 0.055, 0.40, MAT_GRAPHITE, sn, verts=8)
    add_cyl(f"ShinHoney.{s}", (sx * 0.09, -0.008, 0.30), 0.060, 0.12, MAT_HONEY, sn, verts=8)
    add_cube(f"Foot.{s}", (sx * 0.09, -0.06, 0.05), (0.055, 0.11, 0.05), MAT_OBSIDIAN, ft)
    add_cube(f"Toe.{s}", (sx * 0.09, -0.135, 0.035), (0.05, 0.035, 0.03), MAT_GRAPHITE, ft)

# ground shadow-catcher disc (subtle, part of asset)
add_cyl("GroundDisc", (0, 0, 0.005), 0.55, 0.01, MAT_GRAPHITE, "Hips", verts=48)
# rebind disc to hips bone is wrong visually; keep it static instead:
PARTS[-1].vertex_groups.clear()
PARTS[-1].modifiers.clear()
PARTS[-1].parent = None

# ---------------------------------------------------------------- actions
def reset_pose():
    for pb in arm_obj.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)

def new_action(name):
    act = bpy.data.actions.new(name)
    if arm_obj.animation_data is None:
        arm_obj.animation_data_create()
    # Blender 4.4+ slotted actions: ensure a slot bound to the armature object
    try:
        slot = act.slots.new(idtype="OBJECT", name=arm_obj.name)
        arm_obj.animation_data.action_slot = slot
    except Exception:
        pass
    arm_obj.animation_data.action = act
    return act

def key(pb_name, frame, loc=None, rot=None):
    pb = arm_obj.pose.bones[pb_name]
    if loc is not None:
        pb.location = loc
        pb.keyframe_insert("location", frame=frame)
    if rot is not None:
        pb.rotation_euler = rot
        pb.keyframe_insert("rotation_euler", frame=frame)

FPS_END = 48  # 2 s loop at 24 fps

# ---- Idle: breathing sway + micro weight shift
reset_pose()
new_action("Idle")
for f, dz, rx in ((1, 0.0, 0.0), (12, 0.008, 0.01), (24, 0.0, 0.0),
                  (36, -0.006, -0.008), (48, 0.0, 0.0)):
    key("Hips", f, loc=(0, 0, dz))
    key("Chest", f, rot=(rx, 0, 0))
    key("Head", f, rot=(0.01 * math.sin(f / 8), 0, 0.01 * math.sin(f / 10)))
key("UpperArm.L", 1, rot=(0.02, 0, 0.03))
key("UpperArm.L", 24, rot=(0.02, 0, 0.03))
key("UpperArm.L", 48, rot=(0.02, 0, 0.03))
key("UpperArm.R", 1, rot=(0.02, 0, -0.03))
key("UpperArm.R", 24, rot=(0.02, 0, -0.03))
key("UpperArm.R", 48, rot=(0.02, 0, -0.03))

# ---- Aware: slow head orientation sweep (awareness)
reset_pose()
new_action("Aware")
for f, ry in ((1, -0.35), (16, 0.0), (32, 0.35), (48, -0.35)):
    key("Head", f, rot=(0.02, ry, 0))
    key("Neck", f, rot=(0, ry * 0.4, 0))
key("Chest", 24, rot=(0, 0.03, 0))

# ---- Acknowledge: right arm raise + slight bow (welcome / respond)
reset_pose()
new_action("Acknowledge")
# arm raise keys (rotation_euler on pose bone; X rotates arm forward/up)
for f, rx, rz in ((1, 0.0, 0.0), (10, -1.15, 0.15), (22, -1.15, 0.15),
                  (34, -0.5, 0.05), (48, 0.0, 0.0)):
    key("UpperArm.R", f, rot=(rx, 0, rz))
    key("ForeArm.R", f, rot=(0.0 if f < 30 else -0.5, 0, 0))
for f, rz, locz in ((1, 0, 0), (12, 0.04, -0.01), (24, 0.04, -0.01),
                    (40, 0, 0), (48, 0, 0)):
    key("Chest", f, rot=(0.06, 0, rz))
    key("Hips", f, loc=(0, 0, locz))
key("Head", 12, rot=(0.08, 0, 0))
key("Head", 24, rot=(0.08, 0, 0))
key("Head", 40, rot=(0, 0, 0))
key("Head", 48, rot=(0, 0, 0))

# ---- Explain: left hand extends forward, head tilts (explain gesture)
reset_pose()
new_action("Explain")
for f, rx, rz in ((1, 0.0, 0.0), (12, -0.9, -0.1), (30, -0.9, -0.1),
                  (42, -0.3, 0.0), (48, 0.0, 0.0)):
    key("UpperArm.L", f, rot=(rx, 0, rz))
    key("ForeArm.L", f, rot=(-0.25 if f < 40 else 0.0, 0, 0))
for f, ry in ((1, 0), (14, 0.18), (30, 0.18), (44, 0), (48, 0)):
    key("Head", f, rot=(0.03, ry, 0))
    key("Neck", f, rot=(0, ry * 0.4, 0))
key("Chest", 24, rot=(0.02, -0.02, 0))

# ---------------------------------------------------------------- export
os.makedirs(os.path.dirname(os.path.abspath(OUT_GLB)), exist_ok=True)

export_kwargs = dict(
    filepath=os.path.abspath(OUT_GLB),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_skins=True,
    export_yup=True,
    export_apply=False,
    export_cameras=False,
    export_lights=False,
)
# tolerate exporter signature drift across Blender versions
props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
kwargs = {k: v for k, v in export_kwargs.items() if k in props}
bpy.ops.export_scene.gltf(**kwargs)

bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(OUT_BLEND))
print(f"[FEEX] GLB written: {os.path.abspath(OUT_GLB)}")
print(f"[FEEX] BLEND written: {os.path.abspath(OUT_BLEND)}")
print(f"[FEEX] Actions: {[a.name for a in bpy.data.actions]}")
