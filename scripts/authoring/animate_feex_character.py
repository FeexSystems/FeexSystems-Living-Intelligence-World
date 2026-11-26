# Add keyframed test animations to the rigged FEEX character and export GLB.
# Headless: blender -b -P animate_feex_character.py -- <in.blend> <out.glb>
# Produces two clips via NLA tracks: FEEX_Idle (subtle sway) and FEEX_Wave (right-arm wave).

import bpy
import sys
import math
from mathutils import Euler

argv = sys.argv[sys.argv.index("--") + 1:]
BLEND, DST = argv[0], argv[1]

bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene
scene.render.fps = 24

arm = bpy.data.objects.get("FEEX_Rig")
assert arm, "FEEX_Rig not found in blend"
arm.animation_data_create()

def pb(name):
    return arm.pose.bones[name]

def keyframe_rot(bone_name, frame, rx=0.0, ry=0.0, rz=0.0):
    b = pb(bone_name)
    b.rotation_mode = "XYZ"
    b.rotation_euler = Euler((rx, ry, rz))
    b.keyframe_insert("rotation_euler", frame=frame)

def keyframe_loc(bone_name, frame, x=0.0, y=0.0, z=0.0):
    b = pb(bone_name)
    b.location = (x, y, z)
    b.keyframe_insert("location", frame=frame)

def new_action(name):
    act = bpy.data.actions.new(name)
    arm.animation_data.action = act
    return act

def push_nla(act, track_name, start=1, end=97):
    tr = arm.animation_data.nla_tracks.new()
    tr.name = track_name
    tr.strips.new(track_name, start, act)
    tr.mute = True  # keep viewport on bind pose; exporter still emits all tracks

# reset pose helper
def reset_pose():
    for b in arm.pose.bones:
        b.rotation_euler = Euler((0, 0, 0))
        b.location = (0, 0, 0)

# ============ CLIP 1: FEEX_Idle (frames 1-97, ~4s) ============
reset_pose()
act_idle = new_action("FEEX_Idle")
for f in range(1, 98, 8):
    t = f / 24.0
    sway = math.sin(t * math.pi)          # 0 -> 1 -> 0 over 2s-ish
    rock = math.sin(t * 2 * math.pi) * 0.5 + 0.5
    keyframe_rot("chest", f, rz=0.02 * math.sin(t * 1.5))
    keyframe_rot("hips", f, rz=0.015 * math.sin(t * 1.5 + 0.4))
    keyframe_rot("head", f, rz=-0.02 * math.sin(t * 1.5 + 0.8))
    keyframe_rot("upperarm_L", f, rx=0.03 * sway)
    keyframe_rot("upperarm_R", f, rx=-0.03 * sway)
    keyframe_rot("forearm_L", f, rx=0.05 * rock)
    keyframe_rot("forearm_R", f, rx=-0.05 * rock)
    keyframe_loc("hips", f, z=0.004 * math.sin(t * 3 * math.pi))
push_nla(act_idle, "FEEX_Idle")

# ============ CLIP 2: FEEX_Wave (frames 1-73, ~3s) ============
reset_pose()
act_wave = new_action("FEEX_Wave")
# raise right arm: abduction swing + wave oscillation
for f in range(1, 74, 4):
    t = f / 24.0
    raise_amt = min(1.0, t / 0.6) * (1.0 if t < 2.4 else max(0.0, (3.0 - t) / 0.6))
    wave = math.sin(t * 6 * math.pi) * 0.35 * raise_amt
    keyframe_rot("clavicle_R", f, rz=0.15 * raise_amt)
    keyframe_rot("upperarm_R", f, rz=1.35 * raise_amt + wave)
    keyframe_rot("forearm_R", f, rz=0.5 * raise_amt + wave * 0.6)
    keyframe_rot("hand_R", f, rz=0.3 * raise_amt + wave * 0.8)
    # slight counter-balance
    keyframe_rot("chest", f, rz=-0.04 * raise_amt)
    keyframe_rot("head", f, rz=0.05 * raise_amt)
push_nla(act_wave, "FEEX_Wave")

# leave bind pose active for export sanity
arm.animation_data.action = None

# ============ export ============
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_skins=True,
    export_morph=False,
)
print("DONE", DST)
