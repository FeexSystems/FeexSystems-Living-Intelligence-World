# Author the 7 missing FEEX-SORL character clips + 12 ARKit morph targets
# onto feex-sovereign-synthetic.glb, in place (same rig, same materials).
# Headless: blender -b -P author_feex_character_contract.py -- <in.glb> <out.glb>
#
# Clips added (existing Idle/Aware/Acknowledge/Explain preserved):
#   Listen, Think, Inspect, Point, Walk, Speak, Unavailable
# Morphs (shape keys -> glTF morph targets, ARKit names):
#   EyeBlinkLeft/Right, JawOpen, MouthSmileLeft/Right,
#   BrowInnerUp, BrowDownLeft/Right, EyeLookUp/Down x Left/Right

import bpy
import sys
import math
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, DST = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene
scene.render.fps = 24

arm = next(o for o in scene.objects if o.type == "ARMATURE")
print("armature:", arm.name, "bones:", [b.name for b in arm.pose.bones])

# ---------- helpers ----------

def euler_channels(pb_name):
    """Return pose bone."""
    return arm.pose.bones[pb_name]

def world_axis_channel(bone_name, world_dir):
    """Pick the pose-bone euler channel whose rest local axis best aligns
    with the desired world direction. Returns (channel_index, sign)."""
    pb = arm.pose.bones[bone_name]
    R = pb.bone.matrix_local.to_3x3()  # columns = local axes in armature space
    d = Vector(world_dir).normalized()
    best, best_dot = 0, -2.0
    for i in range(3):
        col = R.col[i].normalized()
        dot = col.dot(d)
        if abs(dot) > abs(best_dot):
            best, best_dot = i, dot
    return best, (1.0 if best_dot >= 0 else -1.0)

# cache channel choices
CH = {}
def chan(bone, world_dir):
    key = (bone, tuple(world_dir))
    if key not in CH:
        CH[key] = world_axis_channel(bone, world_dir)
    return CH[key]

# world dirs (armature space ~= world space; character faces -Y or +Y unknown,
# so we use X for lateral, Z for vertical, Y for forward — signs handled by chan())
WORLD_X = (1, 0, 0)
WORLD_Z = (0, 0, 1)
WORLD_Y = (0, 1, 0)

def key_rot(bone, frame, **kw):
    """kw keys: 'x','y','z' = rotation about world X/Y/Z axis (deg->rad handled
    by caller passing radians). Only one motion per call per bone is typical;
    we accumulate into a per-bone dict then flush."""
    raise NotImplementedError

# Simpler approach: per-clip dict bone-> {frame: {channel_idx: value}}
CLIP_KEYS = {}

def add_key(bone, frame, channel, value):
    d = CLIP_KEYS.setdefault(bone, {}).setdefault(frame, {})
    # accumulate on chosen euler channel
    d[channel] = d.get(channel, 0.0) + value

def motion(bone, frame, world_dir, angle):
    """Rotate `bone` about world_dir by angle radians at frame."""
    idx, sign = chan(bone, world_dir)
    add_key(bone, frame, idx, sign * angle)

# ---------- clip definitions ----------
# Each clip: list of (frame, fn) where fn issues motion() calls.
FPS = 24

def clip_listen():
    # attentive lean-in: chest pitch fwd, head tilt down+side, arms settle
    for f in range(1, 97, 12):
        t = (f - 1) / 95.0
        motion("Chest", f, WORLD_Y, 0.10 * math.sin(t * math.pi))
        motion("Head", f, WORLD_X, -0.12 * math.sin(t * math.pi))
        motion("Head", f, WORLD_Z, 0.10 * math.sin(t * math.pi))
        motion("UpperArm.L", f, WORLD_Z, -0.06)
        motion("UpperArm.R", f, WORLD_Z, 0.06)
        motion("ForeArm.L", f, WORLD_Y, 0.10)
        motion("ForeArm.R", f, WORLD_Y, -0.10)

def clip_think():
    # head back+tilt, right forearm drifts up toward face, weight shift
    for f in range(1, 97, 12):
        t = (f - 1) / 95.0
        motion("Head", f, WORLD_X, 0.18 * math.sin(t * math.pi))
        motion("Head", f, WORLD_Z, 0.12 * math.sin(t * math.pi * 0.5))
        motion("Chest", f, WORLD_X, -0.06)
        motion("UpperArm.R", f, WORLD_Z, -0.55 * math.sin(t * math.pi))
        motion("ForeArm.R", f, WORLD_Y, -1.15 * math.sin(t * math.pi))
        motion("UpperArm.L", f, WORLD_Z, 0.10)
        motion("Hips", f, WORLD_X, 0.04 * math.sin(t * math.pi))

def clip_inspect():
    # lean forward over evidence, left arm extends toward object
    for f in range(1, 97, 12):
        t = (f - 1) / 95.0
        env = math.sin(t * math.pi)
        motion("Chest", f, WORLD_Y, 0.28 * env)
        motion("Head", f, WORLD_Y, 0.22 * env)
        motion("UpperArm.L", f, WORLD_Y, -1.25 * env)
        motion("ForeArm.L", f, WORLD_Y, -0.25 * env)
        motion("UpperArm.R", f, WORLD_Z, 0.15 * env)
        motion("Hips", f, WORLD_Y, -0.05 * env)

def clip_point():
    # right arm extends forward, chest counter-twist, head aims
    for f in range(1, 73, 8):
        t = (f - 1) / 71.0
        env = math.sin(min(1.0, t * 3.0) * math.pi * 0.5)  # raise then hold
        motion("UpperArm.R", f, WORLD_Y, -1.45 * env)
        motion("ForeArm.R", f, WORLD_Y, -0.12 * env)
        motion("Chest", f, WORLD_Z, -0.18 * env)
        motion("Head", f, WORLD_Y, -0.12 * env)
        motion("UpperArm.L", f, WORLD_Z, 0.12 * env)

def clip_walk():
    # loop: thighs swing fwd/back alternating, shins lag, arms counter-swing,
    # hips bob + sway. Period = 24 frames (1s); keys every 6f, loop at 97.
    PERIOD = 24
    for f in range(1, 98, 6):
        ph = 2 * math.pi * ((f - 1) % PERIOD) / PERIOD
        swing = math.sin(ph)
        motion("Thigh.L", f, WORLD_X, 0.45 * swing)
        motion("Thigh.R", f, WORLD_X, -0.45 * swing)
        motion("Shin.L", f, WORLD_X, -0.55 * max(0.0, math.sin(ph - 0.9)))
        motion("Shin.R", f, WORLD_X, -0.55 * max(0.0, math.sin(ph + math.pi - 0.9)))
        motion("Foot.L", f, WORLD_X, 0.15 * math.sin(ph + 0.5))
        motion("Foot.R", f, WORLD_X, -0.15 * math.sin(ph + math.pi + 0.5))
        motion("UpperArm.L", f, WORLD_X, -0.35 * swing)
        motion("UpperArm.R", f, WORLD_X, 0.35 * swing)
        motion("ForeArm.L", f, WORLD_Y, 0.15)
        motion("ForeArm.R", f, WORLD_Y, -0.15)
        motion("Chest", f, WORLD_X, 0.04 * swing)
        motion("Head", f, WORLD_X, -0.03 * swing)
    # hips bob via location keys handled separately below

def clip_speak():
    # speech rhythm: chest pulses, head nods, alternating small gestures
    for f in range(1, 97, 6):
        t = (f - 1) / 95.0
        pulse = math.sin(t * math.pi * 6)          # ~3 speech cycles
        nod = math.sin(t * math.pi * 4) * 0.5 + 0.5
        motion("Chest", f, WORLD_X, 0.05 * pulse)
        motion("Head", f, WORLD_X, 0.06 * nod)
        motion("Head", f, WORLD_Z, 0.04 * math.sin(t * math.pi * 2))
        gesture = math.sin(t * math.pi * 2)
        motion("UpperArm.R", f, WORLD_Z, 0.18 * gesture)
        motion("ForeArm.R", f, WORLD_Y, 0.25 * max(0.0, gesture))
        motion("UpperArm.L", f, WORLD_Z, -0.10 * gesture)

def clip_unavailable():
    # slow slump then hold: chest folds, head drops, arms drift down
    for f in range(1, 97, 12):
        t = (f - 1) / 95.0
        slump = min(1.0, t * 2.2)                  # slump in ~first 45%
        hold = 1.0 - 0.15 * math.sin((t - 0.45) * math.pi) if t > 0.45 else 0.0
        s = slump * (1.0 - 0.3 * hold)
        motion("Chest", f, WORLD_X, 0.30 * s)
        motion("Head", f, WORLD_X, 0.32 * s)
        motion("Head", f, WORLD_Z, 0.08 * s)
        motion("UpperArm.L", f, WORLD_Z, 0.22 * s)
        motion("UpperArm.R", f, WORLD_Z, -0.22 * s)
        motion("ForeArm.L", f, WORLD_Y, 0.25 * s)
        motion("ForeArm.R", f, WORLD_Y, -0.25 * s)
        motion("Hips", f, WORLD_X, 0.05 * s)

CLIPS = {
    "Listen": clip_listen,
    "Think": clip_think,
    "Inspect": clip_inspect,
    "Point": clip_point,
    "Walk": clip_walk,
    "Speak": clip_speak,
    "Unavailable": clip_unavailable,
}

# ---------- bake actions ----------

def bake_clip(name, fn):
    global CLIP_KEYS
    CLIP_KEYS = {}
    fn()
    act = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = act
    bpy.context.view_layer.objects.active = arm
    if arm.mode != "POSE":
        bpy.ops.object.mode_set(mode="POSE")

    # collect all frames
    all_frames = sorted({f for b in CLIP_KEYS.values() for f in b})
    # also ensure first/last keys exist per bone for clean loops
    for bone_name, frames in CLIP_KEYS.items():
        pb = arm.pose.bones.get(bone_name)
        if not pb:
            print("  WARN missing bone", bone_name); continue
        pb.rotation_mode = "XYZ"
        for f in all_frames:
            vals = frames.get(f, {})
            # carry-forward: use nearest defined <= f, else first defined
            defined = sorted(frames)
            prev = [d for d in defined if d <= f]
            use = prev[-1] if prev else defined[0]
            cur = dict(frames.get(use, {}))
            # reset channels not in cur to 0 at this frame once
            e = [cur.get(0, 0.0), cur.get(1, 0.0), cur.get(2, 0.0)]
            # NOTE: keyed values are absolute channel rotations, not additive
            # across clips — each clip's channels start from rest (0).
            pb.rotation_euler = e
            pb.keyframe_insert("rotation_euler", frame=f)

    # push muted NLA track
    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, all_frames[0], act)
    tr.mute = True
    arm.animation_data.action = None
    print("baked", name, "frames", all_frames[0], "-", all_frames[-1])

for name, fn in CLIPS.items():
    bake_clip(name, fn)

# Walk hips bob — add location keys on a dedicated pass
CLIP_KEYS = {}
# rebuild walk with location: simpler — add bob directly here
act = bpy.data.actions.get("Walk")
if act:
    arm.animation_data.action = act
    pb = arm.pose.bones.get("Hips")
    if pb:
        pb.location = (0, 0, 0)
        pb.keyframe_insert("location", frame=1)
        for f in range(7, 98, 6):
            ph = 2 * math.pi * ((f - 1) % 24) / 24
            pb.location = (0, 0, 0.03 * abs(math.sin(ph)))
            pb.keyframe_insert("location", frame=f)
        pb.location = (0, 0, 0)
        pb.keyframe_insert("location", frame=97)
    arm.animation_data.action = None

# ---------- ensure existing imported actions are on NLA ----------
for a in bpy.data.actions:
    if a.users == 0:
        continue
    # if action has no NLA track yet, push muted
    has_track = any(s.action == a for tr in arm.animation_data.nla_tracks for s in tr.strips)
    if not has_track:
        tr = arm.animation_data.nla_tracks.new()
        tr.name = a.name
        tr.strips.new(a.name, int(a.frame_range[0]), a)
        tr.mute = True

# ---------- morph targets ----------

def world_delta_to_local(obj, delta_world):
    return obj.matrix_world.to_3x3().inverted() @ Vector(delta_world)

def add_morph(obj_name, key_name, mask_fn, delta_fn):
    obj = bpy.data.objects.get(obj_name)
    if not obj or obj.type != "MESH":
        print("  WARN morph mesh missing:", obj_name); return
    me = obj.data
    if me.shape_keys is None:
        obj.shape_key_add(name="Basis")  # first key becomes Basis
    kb = me.shape_keys.key_blocks.get(key_name)
    if kb is None:
        kb = obj.shape_key_add(name=key_name)
    # ensure every vertex has a delta (default = base co)
    mw = obj.matrix_world
    for i, v in enumerate(me.vertices):
        co_w = mw @ v.co
        if mask_fn(co_w, v, me):
            d_w = delta_fn(co_w, v, me)
            if d_w.length > 1e-6:
                kb.data[i].co = v.co + world_delta_to_local(obj, d_w)
    print("  morph", key_name, "on", obj_name)

# character proportions for delta sizing
head_obj = bpy.data.objects.get("Head")
visor_obj = bpy.data.objects.get("Visor")
jaw_obj = bpy.data.objects.get("JawGuard")

# find approximate character height from all mesh verts (world space)
allpts = []
for o in scene.objects:
    if o.type == "MESH":
        allpts += [o.matrix_world @ Vector(c) for c in o.bound_box]
H = max(p.z for p in allpts) - min(p.z for p in allpts)
print("character height:", round(H, 3))

# world-space helpers — front = direction from head center to visor center
head_pts = [head_obj.matrix_world @ v.co for v in head_obj.data.vertices] if head_obj else []
visor_pts = [visor_obj.matrix_world @ v.co for v in visor_obj.data.vertices] if visor_obj else []
if head_pts and visor_pts:
    hc = sum(head_pts, Vector()) / len(head_pts)
    vc = sum(visor_pts, Vector()) / len(visor_pts)
    FRONT = (vc - hc)
    FRONT.z = 0
    FRONT = FRONT.normalized() if FRONT.length > 1e-4 else Vector((0, 0, 1))
else:
    FRONT = Vector((0, 0, 1))
UP = Vector((0, 0, 1))
RIGHT = FRONT.cross(UP).normalized()  # character's left/right axis
print("FRONT:", tuple(round(c, 2) for c in FRONT))

def visor_mask(side):
    """side: 'L' verts on character's left (negative RIGHT dot), 'R' positive."""
    def fn(co_w, v, me):
        rel = co_w - vc
        lat = rel.dot(RIGHT)
        if side == "L":
            return lat < 0
        return lat > 0
    return fn

def all_visor(co_w, v, me):
    return True

def jaw_lower(co_w, v, me):
    # lower half of jaw guard (world z below its mid)
    if not jaw_obj: return False
    jp = [jaw_obj.matrix_world @ vv.co for vv in jaw_obj.data.vertices]
    jmid = sum(jp, Vector()).z / len(jp)
    return co_w.z < jmid

def jaw_corner(side):
    def fn(co_w, v, me):
        if not jaw_obj: return False
        jp = [jaw_obj.matrix_world @ vv.co for vv in jaw_obj.data.vertices]
        jmid = sum(jp, Vector()).z / len(jp)
        if co_w.z >= jmid: return False
        rel = co_w - sum(jp, Vector()) / len(jp)
        lat = rel.dot(RIGHT)
        return lat < -0.2 * H if side == "L" else lat > 0.2 * H
    return fn

def head_brow(inner):
    """Head icosphere verts in brow band: upper-front region."""
    def fn(co_w, v, me):
        rel = co_w - hc
        upness = rel.dot(UP)
        frontness = rel.dot(FRONT)
        if not (upness > 0.15 * H and frontness > 0.1 * H):
            return False
        lat = rel.dot(RIGHT)
        if inner:
            return abs(lat) < 0.12 * H
        return abs(lat) > 0.10 * H
    return fn

def brow_side(side):
    def fn(co_w, v, me):
        rel = co_w - hc
        return (rel.dot(UP) > 0.12 * H and rel.dot(FRONT) > 0.05 * H
                and (rel.dot(RIGHT) < -0.08 * H if side == "L" else rel.dot(RIGHT) > 0.08 * H))
    return fn

D = 0.035 * H  # morph delta scale

# --- visor-based morphs (eyes = visor on this synthetic) ---
add_morph("Visor", "EyeBlinkLeft",  visor_mask("L"), lambda c, v, m: (c - vc) * -0.18)
add_morph("Visor", "EyeBlinkRight", visor_mask("R"), lambda c, v, m: (c - vc) * -0.18)
add_morph("Visor", "EyeLookUpLeft",   visor_mask("L"), lambda c, v, m: UP * (0.05 * H))
add_morph("Visor", "EyeLookDownLeft", visor_mask("L"), lambda c, v, m: UP * (-0.05 * H))
add_morph("Visor", "EyeLookUpRight",   visor_mask("R"), lambda c, v, m: UP * (0.05 * H))
add_morph("Visor", "EyeLookDownRight", visor_mask("R"), lambda c, v, m: UP * (-0.05 * H))

# --- jaw guard morphs ---
add_morph("JawGuard", "JawOpen",          jaw_lower, lambda c, v, m: UP * (-0.06 * H) + FRONT * (0.02 * H))
add_morph("JawGuard", "MouthSmileLeft",   jaw_corner("L"), lambda c, v, m: UP * (0.04 * H) + RIGHT * (-0.015 * H))
add_morph("JawGuard", "MouthSmileRight",  jaw_corner("R"), lambda c, v, m: UP * (0.04 * H) + RIGHT * (0.015 * H))

# --- head icosphere brow morphs ---
add_morph("Head", "BrowInnerUp",   head_brow(True),  lambda c, v, m: UP * (0.045 * H))
add_morph("Head", "BrowDownLeft",  brow_side("L"),   lambda c, v, m: UP * (-0.04 * H))
add_morph("Head", "BrowDownRight", brow_side("R"),   lambda c, v, m: UP * (-0.04 * H))

# ---------- export ----------
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
    export_morph=True,
)
print("DONE", DST)
