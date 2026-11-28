# Author the full FEEX-SORL character contract onto the TRIPO character:
# 11 clips (Idle, Aware, Acknowledge, Explain, Listen, Think, Inspect,
# Point, Walk, Speak, Unavailable) + 12 ARKit morph targets.
# Headless: blender -b -P author_feex_tripo_contract.py -- <in.glb> <out.glb>
#
# Input should be the RIGGED variant (feex-character-rigged.glb) — it carries
# the 19-joint FEEX_Rig armature. Bone names differ from the synthetic
# (lowercase, _L/_R suffixes) so a logical->actual map is applied.
# The Tripo mesh is a single continuous skinned mesh: all 12 morphs are
# shape keys on it, masked by world-space facial regions. Facing direction
# is auto-detected from head-band vertex asymmetry (nose protrusion).

import bpy
import sys
import math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, DST = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
scene = bpy.context.scene
scene.render.fps = 24

arm = next(o for o in scene.objects if o.type == "ARMATURE")
meshes = [o for o in scene.objects if o.type == "MESH"]
print("armature:", arm.name)
print("bones:", [b.name for b in arm.pose.bones])
print("meshes:", [(o.name, len(o.data.vertices)) for o in meshes])

# logical contract name -> actual rig bone
BONE = {
    "Hips": "hips", "Spine": "spine", "Chest": "chest", "Neck": "neck",
    "Head": "head",
    "UpperArm.L": "upperarm_L", "ForeArm.L": "forearm_L", "Hand.L": "hand_L",
    "UpperArm.R": "upperarm_R", "ForeArm.R": "forearm_R", "Hand.R": "hand_R",
    "Thigh.L": "thigh_L", "Shin.L": "shin_L", "Foot.L": "foot_L",
    "Thigh.R": "thigh_R", "Shin.R": "shin_R", "Foot.R": "foot_R",
}

def actual(bone_name):
    return BONE.get(bone_name, bone_name)

# ---------- pose helpers ----------
CH = {}
def chan(bone_name, world_dir):
    key = (bone_name, tuple(world_dir))
    if key not in CH:
        pb = arm.pose.bones[actual(bone_name)]
        R = pb.bone.matrix_local.to_3x3()
        d = Vector(world_dir).normalized()
        best, best_dot = 0, -2.0
        for i in range(3):
            dot = R.col[i].normalized().dot(d)
            if abs(dot) > abs(best_dot):
                best, best_dot = i, dot
        CH[key] = (best, 1.0 if best_dot >= 0 else -1.0)
    return CH[key]

WORLD_X = (1, 0, 0)
WORLD_Z = (0, 0, 1)
WORLD_Y = (0, 1, 0)

CLIP_KEYS = {}
def add_key(bone, frame, channel, value):
    d = CLIP_KEYS.setdefault(bone, {}).setdefault(frame, {})
    d[channel] = d.get(channel, 0.0) + value

def motion(bone, frame, world_dir, angle):
    idx, sign = chan(bone, world_dir)
    add_key(bone, frame, idx, sign * angle)

# ---------- clip definitions (same choreography as synthetic contract) ----

def clip_idle():
    for f in range(1, 97, 12):
        t = (f - 1) / 95.0
        motion("Chest", f, WORLD_Z, 0.02 * math.sin(t * math.pi * 2))
        motion("Head", f, WORLD_Z, 0.02 * math.sin(t * math.pi * 2 + 0.5))
        motion("UpperArm.L", f, WORLD_Z, 0.03)
        motion("UpperArm.R", f, WORLD_Z, -0.03)
        motion("ForeArm.L", f, WORLD_Y, 0.04)
        motion("ForeArm.R", f, WORLD_Y, -0.04)

def clip_aware():
    # attention lift: head up, chest open, slight arm raise
    for f in range(1, 73, 8):
        t = (f - 1) / 71.0
        env = math.sin(min(1.0, t * 2.5) * math.pi * 0.5)
        motion("Head", f, WORLD_X, -0.10 * env)
        motion("Chest", f, WORLD_X, -0.06 * env)
        motion("UpperArm.R", f, WORLD_Z, -0.25 * env)
        motion("ForeArm.R", f, WORLD_Y, -0.20 * env)

def clip_acknowledge():
    # short nod + small hand gesture
    for f in range(1, 49, 6):
        t = (f - 1) / 47.0
        nod = math.sin(t * math.pi * 2) * (1.0 - t)
        motion("Head", f, WORLD_X, 0.12 * nod)
        motion("Chest", f, WORLD_X, 0.06 * nod)
        motion("UpperArm.R", f, WORLD_Z, 0.20 * math.sin(t * math.pi))
        motion("ForeArm.R", f, WORLD_Y, 0.30 * math.sin(t * math.pi))

def clip_explain():
    # speaking gesture: alternating open-hand motions + head emphasis
    for f in range(1, 97, 8):
        t = (f - 1) / 95.0
        g = math.sin(t * math.pi * 3)
        motion("Chest", f, WORLD_X, 0.04 * math.sin(t * math.pi * 2))
        motion("Head", f, WORLD_X, 0.05 * math.sin(t * math.pi * 2 + 0.4))
        motion("UpperArm.L", f, WORLD_Z, 0.22 * g)
        motion("ForeArm.L", f, WORLD_Y, 0.30 * max(0.0, g))
        motion("UpperArm.R", f, WORLD_Z, -0.18 * g)
        motion("ForeArm.R", f, WORLD_Y, -0.25 * max(0.0, -g))

def clip_listen():
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
    for f in range(1, 73, 8):
        t = (f - 1) / 71.0
        env = math.sin(min(1.0, t * 3.0) * math.pi * 0.5)
        motion("UpperArm.R", f, WORLD_Y, -1.45 * env)
        motion("ForeArm.R", f, WORLD_Y, -0.12 * env)
        motion("Chest", f, WORLD_Z, -0.18 * env)
        motion("Head", f, WORLD_Y, -0.12 * env)
        motion("UpperArm.L", f, WORLD_Z, 0.12 * env)

def clip_walk():
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

def clip_speak():
    for f in range(1, 97, 6):
        t = (f - 1) / 95.0
        pulse = math.sin(t * math.pi * 6)
        nod = math.sin(t * math.pi * 4) * 0.5 + 0.5
        motion("Chest", f, WORLD_X, 0.05 * pulse)
        motion("Head", f, WORLD_X, 0.06 * nod)
        motion("Head", f, WORLD_Z, 0.04 * math.sin(t * math.pi * 2))
        gesture = math.sin(t * math.pi * 2)
        motion("UpperArm.R", f, WORLD_Z, 0.18 * gesture)
        motion("ForeArm.R", f, WORLD_Y, 0.25 * max(0.0, gesture))
        motion("UpperArm.L", f, WORLD_Z, -0.10 * gesture)

def clip_unavailable():
    for f in range(1, 97, 12):
        t = (f - 1) / 95.0
        slump = min(1.0, t * 2.2)
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
    "Idle": clip_idle, "Aware": clip_aware, "Acknowledge": clip_acknowledge,
    "Explain": clip_explain, "Listen": clip_listen, "Think": clip_think,
    "Inspect": clip_inspect, "Point": clip_point, "Walk": clip_walk,
    "Speak": clip_speak, "Unavailable": clip_unavailable,
}

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

    all_frames = sorted({f for b in CLIP_KEYS.values() for f in b})
    for bone_name, frames in CLIP_KEYS.items():
        pb = arm.pose.bones.get(actual(bone_name))
        if not pb:
            print("  WARN missing bone", bone_name); continue
        pb.rotation_mode = "XYZ"
        defined = sorted(frames)
        for f in all_frames:
            prev = [d for d in defined if d <= f]
            use = prev[-1] if prev else defined[0]
            cur = dict(frames.get(use, {}))
            pb.rotation_euler = [cur.get(0, 0.0), cur.get(1, 0.0), cur.get(2, 0.0)]
            pb.keyframe_insert("rotation_euler", frame=f)

    # Walk hips bob
    if name == "Walk":
        pb = arm.pose.bones.get(actual("Hips"))
        if pb:
            pb.location = (0, 0, 0); pb.keyframe_insert("location", frame=1)
            for f in range(7, 98, 6):
                ph = 2 * math.pi * ((f - 1) % 24) / 24
                pb.location = (0, 0, 0.02 * abs(math.sin(ph)))
                pb.keyframe_insert("location", frame=f)
            pb.location = (0, 0, 0); pb.keyframe_insert("location", frame=97)

    tr = arm.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, all_frames[0], act)
    tr.mute = True
    arm.animation_data.action = None
    print("baked", name, all_frames[0], "-", all_frames[-1])

for name, fn in CLIPS.items():
    bake_clip(name, fn)

# ---------- facing detection + morphs ----------
mesh = meshes[0]
mw = mesh.matrix_world
pts = [mw @ v.co for v in mesh.data.vertices]
zs = [p.z for p in pts]
H = max(zs) - min(zs)
zmin = min(zs)
print("mesh verts:", len(pts), "height:", round(H, 3))

# head band = top 18% of height
head_band = [p for p in pts if p.z > zmin + 0.82 * H]
hc = sum(head_band, Vector()) / len(head_band)

# facing: nose/face protrudes farther than the back of the skull.
# For each horizontal axis direction, measure the max projection of
# head-band verts from the head center — the largest wins = FRONT.
cands = {"+X": Vector((1,0,0)), "-X": Vector((-1,0,0)),
         "+Y": Vector((0,1,0)), "-Y": Vector((0,-1,0))}
projs = {}
for name, d in cands.items():
    projs[name] = max((p - hc).dot(d) for p in head_band)
front_name = max(projs, key=projs.get)
FRONT = cands[front_name]
UP = Vector((0, 0, 1))
RIGHT = FRONT.cross(UP).normalized()
print("head center:", tuple(round(c, 3) for c in hc),
      "FRONT:", front_name, tuple(round(c, 2) for c in FRONT),
      "projs:", {k: round(v, 3) for k, v in projs.items()})

def face_z(p):
    return p.z

def region(side_z0, side_z1, lat_side=None, front_min=0.0):
    """mask: verts in height band [z0,z1] (fractions of H above zmin),
    optionally lateral half (L/R via RIGHT axis rel to hc), and in front of hc."""
    def fn(co_w, v, me):
        z = co_w.z - zmin
        if not (side_z0 * H <= z <= side_z1 * H):
            return False
        rel = co_w - hc
        if rel.dot(FRONT) < front_min * H:
            return False
        if lat_side == "L":
            return rel.dot(RIGHT) < 0
        if lat_side == "R":
            return rel.dot(RIGHT) > 0
        return True
    return fn

# facial landmarks (fractions of H): eyes ~0.87, brows ~0.90, jaw/mouth ~0.795
EYE_BAND = (0.855, 0.885)
BROW_BAND = (0.895, 0.925)
JAW_BAND = (0.775, 0.82)
MOUTH_BAND = (0.79, 0.83)

def add_morph(key_name, mask_fn, delta_fn):
    kb = mesh.data.shape_keys.key_blocks.get(key_name) if mesh.data.shape_keys else None
    if kb is None:
        if mesh.data.shape_keys is None:
            mesh.shape_key_add(name="Basis")
        kb = mesh.shape_key_add(name=key_name)
    for i, v in enumerate(mesh.data.vertices):
        co_w = mw @ v.co
        if mask_fn(co_w, v, mesh.data):
            d_w = delta_fn(co_w, v, mesh.data)
            if d_w.length > 1e-7:
                d_l = mw.to_3x3().inverted() @ d_w
                kb.data[i].co = v.co + d_l
    print("  morph", key_name)

S = 0.04 * H  # delta scale

# eyes (visor-less real face): blink = verts pull toward eye center (fake lid)
def blink_delta(side):
    def fn(co_w, v, me):
        rel = co_w - hc
        lat = rel.dot(RIGHT)
        if side == "L" and lat > -0.02 * H: return UP * 0  # wrong side
        if side == "R" and lat < 0.02 * H: return UP * 0
        # shrink toward vertical midline of that eye region
        return UP * (-0.015 * H) + FRONT * (-0.01 * H)
    return fn

add_morph("EyeBlinkLeft",  region(*EYE_BAND, "L", 0.02), blink_delta("L"))
add_morph("EyeBlinkRight", region(*EYE_BAND, "R", 0.02), blink_delta("R"))
add_morph("EyeLookUpLeft",   region(*EYE_BAND, "L", 0.02), lambda c,v,m: UP * (0.02*H))
add_morph("EyeLookDownLeft", region(*EYE_BAND, "L", 0.02), lambda c,v,m: UP * (-0.02*H))
add_morph("EyeLookUpRight",   region(*EYE_BAND, "R", 0.02), lambda c,v,m: UP * (0.02*H))
add_morph("EyeLookDownRight", region(*EYE_BAND, "R", 0.02), lambda c,v,m: UP * (-0.02*H))
add_morph("JawOpen",         region(*JAW_BAND, None, 0.0), lambda c,v,m: UP * (-0.035*H) + FRONT * (0.015*H))
add_morph("MouthSmileLeft",  region(*MOUTH_BAND, "L", 0.0), lambda c,v,m: UP * (0.02*H) + RIGHT * (-0.01*H))
add_morph("MouthSmileRight", region(*MOUTH_BAND, "R", 0.0), lambda c,v,m: UP * (0.02*H) + RIGHT * (0.01*H))
add_morph("BrowInnerUp",     region(*BROW_BAND, None, 0.03), lambda c,v,m: UP * (0.025*H))
add_morph("BrowDownLeft",    region(*BROW_BAND, "L", 0.03), lambda c,v,m: UP * (-0.02*H))
add_morph("BrowDownRight",   region(*BROW_BAND, "R", 0.03), lambda c,v,m: UP * (-0.02*H))

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
