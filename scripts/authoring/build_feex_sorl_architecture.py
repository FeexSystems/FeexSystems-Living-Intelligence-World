# FEEX-SORL Phase 2 — Laboratory architecture builder.
#
# Deterministic Blender authoring script (headless-safe):
#   blender --background --python build_feex_sorl_architecture.py
#
# Builds the main shell of the Sovereign Research & Operations
# Laboratory: 30 m x 30 m footprint, 5.5 m ceiling, central atrium,
# structural frames, glass partitions, and circulation corridors.
# All geometry lives in the "SORL_Architecture" collection with
# FEEX_NOIR materials. No agent integration, no character, no UI.
#
# Blender 4.x / 5.x, metric units, Z-up.

import bpy
import math
from mathutils import Vector

# ---------------------------------------------------------------------------
# FEEX Noir palette (linear-ish sRGB -> Blender expects linear; values below
# are authored as sRGB hex and converted on assignment).
# ---------------------------------------------------------------------------
NOIR = {
    "void":      (0.020, 0.020, 0.020, 1.0),
    "graphite":  (0.043, 0.043, 0.047, 1.0),
    "panel":     (0.078, 0.078, 0.086, 1.0),
    "steel":     (0.230, 0.230, 0.225, 1.0),
    "silver":    (0.910, 0.910, 0.900, 1.0),
    "smoke":     (0.435, 0.435, 0.420, 1.0),
}
GLASS = (0.55, 0.62, 0.66, 0.18)   # desaturated, low alpha
SIGNAL = (0.98, 0.98, 0.97, 1.0)   # near-white emissive strips

# Footprint: x in [-15, 15], y in [-12, 12], ceiling 5.5
SHELL_W, SHELL_D, CEIL_H = 30.0, 30.0, 5.5


def srgb_to_linear(c):
    """Convert sRGB 0..1 channels to linear for Principled Base Color."""
    def conv(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return tuple(conv(v) for v in c[:3]) + (c[3],)


def make_material(name, rgba, metallic=0.0, roughness=0.85,
                  emission=None, emission_strength=0.0, alpha_clip=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb_to_linear(rgba)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = srgb_to_linear(emission)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha_clip is not None:
        mat.surface_render_method = 'DITHERED'
        bsdf.inputs["Alpha"].default_value = alpha_clip
    return mat


def collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def link_obj(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def box(name, loc, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (scale[0] / 2, scale[1] / 2, scale[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("EdgeSoft", 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    if mat:
        obj.data.materials.append(mat)
    return obj


def ensure_clean_scene():
    """Remove only previously generated SORL objects — never user data."""
    for obj in list(bpy.data.objects):
        if obj.name.startswith(("SORL_", "ZONE_", "HOTSPOT_", "CAM_",
                                "SPAWN_", "M_", "LT_")):
            bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras,
                  bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def build_architecture():
    col = collection("SORL_Architecture")

    M = {
        "floor":   make_material("M_SORL_Floor", NOIR["graphite"], metallic=0.15, roughness=0.9),
        "wall":    make_material("M_SORL_Wall", NOIR["panel"], metallic=0.05, roughness=0.92),
        "frame":   make_material("M_SORL_Frame", NOIR["steel"], metallic=0.85, roughness=0.38),
        "dark":    make_material("M_SORL_Dark", NOIR["graphite"], metallic=0.4, roughness=0.7),
        "glass":   make_material("M_SORL_Glass", GLASS, roughness=0.12,
                                 alpha_clip=GLASS[3]),
        "signal":  make_material("M_SORL_Signal", SIGNAL, emission=SIGNAL,
                                 emission_strength=2.2, roughness=0.4),
    }

    # --- Floor: single slab with subtle two-tone central medallion ---------
    floor = box("SORL_Floor", (0, 0, -0.15), (SHELL_W, SHELL_D, 0.3), M["floor"])
    link_obj(floor, col)
    atrium = box("SORL_AtriumMedallion", (0, 0, -0.005), (10.0, 10.0, 0.02),
                 M["dark"])
    link_obj(atrium, col)

    # --- Walls -------------------------------------------------------------
    t = 0.4  # wall thickness
    walls = [
        ("SORL_Wall_N", (0, SHELL_D / 2 + t / 2, CEIL_H / 2), (SHELL_W + 2 * t, t, CEIL_H)),
        ("SORL_Wall_S", (0, -SHELL_D / 2 - t / 2, CEIL_H / 2), (SHELL_W + 2 * t, t, CEIL_H)),
        ("SORL_Wall_E", (SHELL_W / 2 + t / 2, 0, CEIL_H / 2), (t, SHELL_D, CEIL_H)),
        ("SORL_Wall_W", (-SHELL_W / 2 - t / 2, 0, CEIL_H / 2), (t, SHELL_D, CEIL_H)),
    ]
    for name, loc, scale in walls:
        link_obj(box(name, loc, scale, M["wall"]), col)

    # --- Ceiling with recessed light coves ---------------------------------
    ceil = box("SORL_Ceiling", (0, 0, CEIL_H + 0.15), (SHELL_W + 2 * t, SHELL_D + 2 * t, 0.3), M["wall"])
    link_obj(ceil, col)

    # Recessed linear light strips (emissive geometry = cheap, web-safe)
    strips = [
        ((0, 0, CEIL_H - 0.02), (24.0, 0.35, 0.04)),      # atrium long axis
        ((0, -8.0, CEIL_H - 0.02), (24.0, 0.35, 0.04)),
        ((0, 8.0, CEIL_H - 0.02), (24.0, 0.35, 0.04)),
        ((0, -13.0, CEIL_H - 0.02), (24.0, 0.35, 0.04)),
        ((0, 13.0, CEIL_H - 0.02), (24.0, 0.35, 0.04)),
        ((-10.0, 0, CEIL_H - 0.02), (0.35, 18.0, 0.04)),
        ((10.0, 0, CEIL_H - 0.02), (0.35, 18.0, 0.04)),
    ]
    for i, (loc, scale) in enumerate(strips):
        link_obj(box(f"SORL_LightStrip_{i:02d}", loc, scale, M["signal"]), col)

    # --- Structural frames: columns on a 6 m grid, skipping atrium ---------
    col_positions = []
    for gx in (-12.0, -6.0, 6.0, 12.0):
        for gy in (-12.0, -9.0, -3.0, 3.0, 9.0, 12.0):
            # keep the central atrium (|x|<5,|y|<2.5) open
            if abs(gx) < 5.5 and abs(gy) < 3.0:
                continue
            col_positions.append((gx, gy))
    for i, (gx, gy) in enumerate(col_positions):
        link_obj(box(f"SORL_Column_{i:02d}", (gx, gy, CEIL_H / 2),
                     (0.55, 0.55, CEIL_H), M["frame"], bevel=0.04), col)
        link_obj(box(f"SORL_ColumnBase_{i:02d}", (gx, gy, 0.15),
                     (0.9, 0.9, 0.3), M["dark"]), col)

    # --- Ceiling beams ------------------------------------------------------
    for i, bx in enumerate((-12.0, -6.0, 0.0, 6.0, 12.0)):
        link_obj(box(f"SORL_Beam_X_{i:02d}", (bx, 0, CEIL_H - 0.25),
                     (0.4, SHELL_D, 0.5), M["frame"]), col)
    for i, by in enumerate((-13.5, -9.0, -4.5, 0.0, 4.5, 9.0, 13.5)):
        link_obj(box(f"SORL_Beam_Y_{i:02d}", (0, by, CEIL_H - 0.35),
                     (SHELL_W, 0.35, 0.4), M["frame"]), col)

    # --- Glass partitions: atrium boundary + zone edges ---------------------
    # Atrium is a 10x5 hall at centre; glass on N/S faces with door gaps.
    def glass_wall(name, loc, scale):
        obj = box(name, loc, scale, M["glass"])
        link_obj(obj, col)
        # dark frame rails top/bottom
        link_obj(box(name + "_RailT", (loc[0], loc[1], loc[2] + scale[2] / 2 - 0.05),
                     (scale[0] + 0.08, scale[1] + 0.08, 0.1), M["frame"]), col)
        link_obj(box(name + "_RailB", (loc[0], loc[1], loc[2] - scale[2] / 2 + 0.05),
                     (scale[0] + 0.08, scale[1] + 0.08, 0.1), M["frame"]), col)

    # Atrium north glass: x[-5,5] at y=2.5, door gap x[-1,1]
    glass_wall("SORL_Glass_AtriumN_L", (-3.0, 2.5, CEIL_H / 2 - 0.4), (8.0, 0.12, CEIL_H - 1.6))
    glass_wall("SORL_Glass_AtriumN_R", (3.0, 2.5, CEIL_H / 2 - 0.4), (8.0, 0.12, CEIL_H - 1.6))
    # Atrium south glass: y=-2.5, door gap x[-1,1]
    glass_wall("SORL_Glass_AtriumS_L", (-3.0, -2.5, CEIL_H / 2 - 0.4), (8.0, 0.12, CEIL_H - 1.6))
    glass_wall("SORL_Glass_AtriumS_R", (3.0, -2.5, CEIL_H / 2 - 0.4), (8.0, 0.12, CEIL_H - 1.6))
    # Atrium east/west glass full width
    glass_wall("SORL_Glass_AtriumE", (5.0, 0, CEIL_H / 2 - 0.4), (0.12, 5.0, CEIL_H - 1.6))
    glass_wall("SORL_Glass_AtriumW", (-5.0, 0, CEIL_H / 2 - 0.4), (0.12, 5.0, CEIL_H - 1.6))

    # --- Circulation: floor guide strips (emissive, low) -------------------
    guides = [
        ((0, 0, 0.01), (1.6, 16.0, 0.02)),     # N-S spine through atrium
        ((-10.0, 0, 0.01), (8.0, 1.2, 0.02)),  # west cross link
        ((10.0, 0, 0.01), (8.0, 1.2, 0.02)),   # east cross link
    ]
    for i, (loc, scale) in enumerate(guides):
        m = make_material(f"M_SORL_Guide_{i}", SIGNAL, emission=SIGNAL,
                          emission_strength=0.6, roughness=0.5)
        link_obj(box(f"SORL_Guide_{i:02d}", loc, scale, m), col)

    # --- Entry: south double-door frame -------------------------------------
    link_obj(box("SORL_Entry_Lintel", (0, -SHELL_D / 2 - 0.1, 2.6),
                 (4.0, 0.5, 0.5), M["frame"]), col)
    link_obj(box("SORL_Entry_Post_L", (-1.9, -SHELL_D / 2 - 0.1, 1.3),
                 (0.3, 0.5, 2.6), M["frame"]), col)
    link_obj(box("SORL_Entry_Post_R", (1.9, -SHELL_D / 2 - 0.1, 1.3),
                 (0.3, 0.5, 2.6), M["frame"]), col)

    # --- Neutral lighting (three-point, noir) --------------------------------
    def area_light(name, loc, energy, size, color=(1.0, 0.98, 0.95)):
        ld = bpy.data.lights.new(name, 'AREA')
        ld.energy = energy
        ld.shape = 'DISK'
        ld.size = size
        ld.color = color
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        ob.rotation_euler = (0, 0, 0)
        bpy.context.scene.collection.objects.link(ob)
        # area lights emit along -Z; rotate to point down
        ob.rotation_euler = (0, 0, 0)
        ld.shape = 'DISK'
        return ob

    # Down-facing area lights: rotate X by -90 so -Z local points down? AREA
    # emits along local -Z; default orientation already points down in Blender
    # when rotation is identity? Actually AREA emits along -Z of object; with
    # identity rotation -Z is world -Z (down). Correct.
    for i, (loc, e) in enumerate([
        ((0, 0, CEIL_H - 0.6), 1400),        # atrium key
        ((-10, 6, CEIL_H - 0.6), 900),       # command centre
        ((10, 6, CEIL_H - 0.6), 900),        # ai research
        ((-10, -7, CEIL_H - 0.6), 900),      # robotics
        ((10, -7, CEIL_H - 0.6), 900),       # workshop
    ]):
        link_obj(area_light(f"LT_SORL_{i:02d}", loc, e, 4.0), col)

    return col


def main():
    ensure_clean_scene()
    build_architecture()
    print("[build_feex_sorl_architecture] OK — shell, frames, glass, lights built")


if __name__ == "__main__":
    main()
