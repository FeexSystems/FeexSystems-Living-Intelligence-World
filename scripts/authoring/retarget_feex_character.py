# Retarget a Mixamo-rigged animation (Soldier.glb) onto the FEEX blockout rig.
# Delta-rotation retarget: per frame, src_pose_delta @ our_rest -> our pose.
# Headless: blender -b -P retarget_feex_character.py -- <in.blend> <src.glb> <out.glb> [clip]

import bpy
import sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
BLEND, SRC, DST = argv[0], argv[1], argv[2]
CLIP = argv[3] if len(argv) > 3 else "Walk"

bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene

our_arm = bpy.data.objects.get("FEEX_Rig")
our_mesh = bpy.data.objects.get("FEEX_Character")
assert our_arm and our_mesh

# ---- import source ----
bpy.ops.import_scene.gltf(filepath=SRC)
src_arm = next(o for o in bpy.context.scene.objects
               if o.type == "ARMATURE" and o != our_arm)
print("src armature:", src_arm.name)

# mute all NLA, pick requested clip action
if src_arm.animation_data:
    for tr in src_arm.animation_data.nla_tracks:
        tr.mute = True
    acts = [a for a in bpy.data.actions if a.users > 0]
    match = next((a for a in acts if CLIP.lower() in a.name.lower()), None)
    if not match:
        print("actions:", [a.name for a in acts]); raise SystemExit("clip not found")
    src_arm.animation_data.action = match
    print("clip:", match.name, "range:", tuple(round(v,1) for v in match.frame_range))
    f0, f1 = int(match.frame_range[0]), int(match.frame_range[1])
else:
    raise SystemExit("no animation on source")

# ---- proportion ratio for hips translation ----
src_mesh = next((o for o in bpy.context.scene.objects
                 if o.type == "MESH" and o != our_mesh), None)
def height_of(mesh_obj):
    pts = [mesh_obj.matrix_world @ Vector(c) for c in mesh_obj.bound_box]
    return max(p.z for p in pts) - min(p.z for p in pts)

H_ours = height_of(our_mesh)
H_src = height_of(src_mesh) if src_mesh else H_ours
ratio = H_ours / H_src if H_src else 1.0
print("heights ours/src:", round(H_ours,3), round(H_src,3), "ratio", round(ratio,3))

# ---- bone map: ours -> mixamorig ----
MAP = {
    "hips": "mixamorig:Hips",
    "spine": "mixamorig:Spine",
    "chest": "mixamorig:Spine2",
    "neck": "mixamorig:Neck",
    "head": "mixamorig:Head",
    "thigh_L": "mixamorig:LeftUpLeg", "shin_L": "mixamorig:LeftLeg", "foot_L": "mixamorig:LeftFoot",
    "thigh_R": "mixamorig:RightUpLeg", "shin_R": "mixamorig:RightLeg", "foot_R": "mixamorig:RightFoot",
    "clavicle_L": "mixamorig:LeftShoulder", "upperarm_L": "mixamorig:LeftArm",
    "forearm_L": "mixamorig:LeftForeArm", "hand_L": "mixamorig:LeftHand",
    "clavicle_R": "mixamorig:RightShoulder", "upperarm_R": "mixamorig:RightArm",
    "forearm_R": "mixamorig:RightForeArm", "hand_R": "mixamorig:RightHand",
}
# resolve actual src names (Blender may strip/alter ':')
src_names = {b.name for b in src_arm.pose.bones}
resolved = {}
for our_name, want in MAP.items():
    if want in src_names:
        resolved[our_name] = want
    else:
        alt = next((n for n in src_names if want.split(":")[-1].lower() in n.lower()), None)
        if alt:
            resolved[our_name] = alt
print("mapped", len(resolved), "bones")

# ---- bake ----
scene.frame_set(f0)
bpy.context.view_layer.update()

act = bpy.data.actions.new(f"FEEX_Retarget_{CLIP}")
our_arm.animation_data_create()
our_arm.animation_data.action = act

bpy.context.view_layer.objects.active = our_arm
bpy.ops.object.mode_set(mode="POSE")

I3 = Matrix.Identity(3).to_4x4()
for f in range(f0, f1 + 1):
    scene.frame_set(f)
    bpy.context.view_layer.update()
    for our_name, src_name in resolved.items():
        spb = src_arm.pose.bones.get(src_name)
        opb = our_arm.pose.bones.get(our_name)
        if not spb or not opb:
            continue
        src_rest = spb.bone.matrix_local
        src_pose = spb.matrix
        if our_name == "hips":
            # full delta incl. translation, scaled by height ratio
            delta = src_pose @ src_rest.inverted()
            dt = (src_pose.translation - src_rest.translation) * ratio
            drot = (src_pose.to_3x3() @ src_rest.to_3x3().inverted()).to_4x4()
            target = (drot @ Matrix.Translation(dt)) @ opb.bone.matrix_local
        else:
            drot = (src_pose.to_3x3() @ src_rest.to_3x3().inverted()).to_4x4()
            target = drot @ opb.bone.matrix_local
        opb.matrix = target
        opb.keyframe_insert("rotation_euler", frame=f)
        if our_name == "hips":
            opb.keyframe_insert("location", frame=f)

# NLA track (muted) so exporter emits it
tr = our_arm.animation_data.nla_tracks.new()
tr.name = f"FEEX_Retarget_{CLIP}"
tr.strips.new(f"FEEX_Retarget_{CLIP}", f0, act)
tr.mute = True
our_arm.animation_data.action = None

# ---- cleanup: remove source rig/mesh ----
for o in list(bpy.context.scene.objects):
    if o != our_arm and o != our_mesh:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_skins=True,
)
print("DONE", DST)
