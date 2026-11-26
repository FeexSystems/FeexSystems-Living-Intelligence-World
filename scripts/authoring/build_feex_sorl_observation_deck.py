# FEEX-SORL Gate 3 — Observation Gallery deck asset (procedural).
#
# Deterministic Blender authoring script (headless-safe):
#   blender --background --python build_feex_sorl_observation_deck.py
#
# Builds sorl-observation-deck.glb — the hero architecture piece for the
# observation-gallery zone, authored procedurally because the free Tripo
# tier cannot generate it and hard-surface architecture is better done
# to exact spec anyway.
#
# Design (matches manifest prompt + zone footprint 26 x 3.2 m):
#   - elevated deck platform ~24 x 2.6 m, surface at z = 2.4 m
#   - brushed titanium fascia band + dark under-skirt
#   - structural steel columns at the back (north) edge
#   - smoked-glass railing with steel top rail + posts on the atrium edge
#   - 5 evidence display panels on the rear wall with white emissive layers
#   - emissive deck-edge light strip
#   - switchback stair flight at the east end down to floor
#
# Origin: floor centre of the deck footprint (x=0, y=0, z=0 floor).
# Deck local +Y = toward rear wall (north), -Y = atrium edge (south).
# Exports GLB to public/models/feex-sorl/observation-gallery/.

import bpy
import math
import os

# --- FEEX Noir palette (same convention as build_feex_sorl_architecture) ---
NOIR = {
    "graphite": (0.043, 0.043, 0.047, 1.0),
    "panel":    (0.078, 0.078, 0.086, 1.0),
    "steel":    (0.230, 0.230, 0.225, 1.0),
    "silver":   (0.910, 0.910, 0.900, 1.0),
    "smoke":    (0.435, 0.435, 0.420, 1.0),
}
GLASS = (0.55, 0.62, 0.66, 0.18)
SIGNAL = (0.98, 0.98, 0.97, 1.0)

DECK_W, DECK_D, DECK_Z = 24.0, 2.6, 2.4   # width, depth, surface height
SLAB_T = 0.18


def srgb_to_linear(c):
    def conv(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return tuple(conv(v) for v in c[:3]) + (c[3],)


def make_material(name, rgba, metallic=0.0, roughness=0.85,
                  emission=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb_to_linear(rgba)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = srgb_to_linear(emission)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
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


def box(name, loc, scale, mat, bevel=0.0, col=None):
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
    if col:
        link_obj(obj, col)
    return obj


def cyl(name, loc, radius, depth, mat, vertices=24, col=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,
                                        depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if col:
        link_obj(obj, col)
    return obj


def build_deck():
    col = collection("SORL_DeckAsset")

    M_floor = make_material("M_Deck_Floor", NOIR["graphite"], metallic=0.15, roughness=0.9)
    M_panel = make_material("M_Deck_Panel", NOIR["panel"], metallic=0.05, roughness=0.92)
    M_frame = make_material("M_Deck_Frame", NOIR["steel"], metallic=0.85, roughness=0.38)
    M_dark = make_material("M_Deck_Dark", NOIR["graphite"], metallic=0.4, roughness=0.7)
    M_glass = make_material("M_Deck_Glass", GLASS, metallic=0.1, roughness=0.12)
    M_signal = make_material("M_Deck_Signal", SIGNAL, emission=SIGNAL,
                             emission_strength=1.4)

    deck_cy = 0.0                      # deck footprint centred on origin
    slab_z = DECK_Z - SLAB_T / 2       # slab centre height
    top_z = DECK_Z
    rear_y = DECK_D / 2                # +1.3 rear wall side
    front_y = -DECK_D / 2              # -1.3 atrium edge

    # --- Deck slab + fascia -------------------------------------------------
    box("DECK_Slab", (0, deck_cy, slab_z), (DECK_W, DECK_D, SLAB_T), M_floor, col=col)
    # Brushed titanium fascia band wrapping the atrium edge.
    box("DECK_Fascia", (0, front_y + 0.03, slab_z),
        (DECK_W, 0.08, SLAB_T + 0.04), M_frame, col=col)
    # Dark under-skirt panels between columns.
    for i in range(6):
        px = -DECK_W / 2 + (i + 0.5) * (DECK_W / 6)
        box(f"DECK_Skirt_{i}", (px, deck_cy + 0.55, DECK_Z - 0.75),
            (DECK_W / 6 - 0.3, 0.06, 1.1), M_dark, col=col)

    # --- Support columns (rear row + two mid rows) --------------------------
    for i in range(7):
        px = -DECK_W / 2 + 1.0 + i * ((DECK_W - 2.0) / 6)
        cyl(f"DECK_ColRear_{i}", (px, rear_y - 0.35, DECK_Z / 2),
            0.09, DECK_Z, M_frame, vertices=16, col=col)
    for i in range(5):
        px = -DECK_W / 2 + 3.0 + i * ((DECK_W - 6.0) / 4)
        cyl(f"DECK_ColMid_{i}", (px, deck_cy + 0.2, DECK_Z / 2),
            0.07, DECK_Z, M_frame, vertices=16, col=col)

    # --- Glass railing on atrium edge ---------------------------------------
    rail_y = front_y + 0.12
    rail_w = DECK_W - 2.0
    box("DECK_RailGlass", (0, rail_y, top_z + 0.55),
        (rail_w, 0.03, 1.05), M_glass, col=col)
    box("DECK_RailTop", (0, rail_y, top_z + 1.10),
        (rail_w, 0.10, 0.08), M_frame, col=col)
    box("DECK_RailKick", (0, rail_y, top_z + 0.06),
        (rail_w, 0.10, 0.12), M_dark, col=col)
    for i in range(9):
        px = -rail_w / 2 + i * (rail_w / 8)
        box(f"DECK_RailPost_{i}", (px, rail_y, top_z + 0.58),
            (0.06, 0.08, 1.16), M_frame, col=col)

    # --- Evidence display panels on rear wall --------------------------------
    for i in range(5):
        px = -8.0 + i * 4.0
        # wall slab behind panels
        box(f"DECK_EvidenceWall_{i}", (px, rear_y - 0.18, top_z + 1.05),
            (3.4, 0.12, 2.1), M_panel, col=col)
        # dark screen face
        box(f"DECK_EvidenceScreen_{i}", (px, rear_y - 0.25, top_z + 1.05),
            (3.2, 0.05, 1.9), M_dark, col=col)
        # emissive data layer
        box(f"DECK_EvidenceGlow_{i}", (px, rear_y - 0.28, top_z + 1.05),
            (3.0, 0.02, 1.7), M_signal, col=col)

    # --- Deck edge light strip ------------------------------------------------
    box("DECK_EdgeGlow", (0, front_y - 0.05, top_z + 0.015),
        (DECK_W - 4.0, 0.12, 0.02), M_signal, col=col)

    # --- Stair flight at east end ---------------------------------------------
    stair_x = DECK_W / 2 - 0.9
    steps = 10
    rise = DECK_Z / steps
    run = 0.28
    for s in range(steps):
        sz = rise * (s + 1)
        sy = front_y - 0.15 - run * (steps - s - 0.5)
        box(f"DECK_Step_{s}", (stair_x, sy, sz / 2),
            (1.2, run, sz), M_frame, col=col)
    # stair stringer + handrail
    box("DECK_StairStringer", (stair_x, front_y - 0.15 - run * steps / 2, DECK_Z / 2),
        (0.08, run * steps + 0.4, DECK_Z), M_dark, col=col)
    box("DECK_StairRail", (stair_x + 0.65, front_y - 0.15 - run * steps / 2, DECK_Z + 0.9),
        (0.05, run * steps + 0.4, 0.05), M_frame, col=col)
    for s in range(0, steps, 3):
        sy = front_y - 0.15 - run * (steps - s - 0.5)
        sz = rise * (s + 1)
        box(f"DECK_StairPost_{s}", (stair_x + 0.65, sy, sz + 0.45),
            (0.05, 0.05, 0.9), M_frame, col=col)

    # --- Anchor empties (match zone contract naming) ---------------------------
    anchor_col = collection("SORL_DeckAnchors")
    for name, loc, kind, size in [
        ("ZONE_observation-gallery", (0, 0, 0), "PLAIN_AXES", 0.8),
        ("HOTSPOT_observation-gallery", (0, front_y - 0.6, 1.4), "ARROWS", 0.4),
        ("SPAWN_observation-gallery", (0, 0, DECK_Z + 1.6), "PLAIN_AXES", 0.3),
    ]:
        obj = bpy.data.objects.new(name, None)
        obj.empty_display_type = kind
        obj.empty_display_size = size
        obj.location = loc
        anchor_col.objects.link(obj)

    print("[build_feex_sorl_observation_deck] OK — deck asset built")


def export_glb(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
    )
    print("[export] wrote", path)


def main():
    # Start clean: remove only prior deck-asset objects.
    for obj in list(bpy.data.objects):
        if obj.name.startswith(("DECK_", "ZONE_observation", "HOTSPOT_observation",
                                "SPAWN_observation")):
            bpy.data.objects.remove(obj, do_unlink=True)
    build_deck()
    out = os.path.join("public", "models", "feex-sorl",
                       "observation-gallery", "sorl-observation-deck.glb")
    # Resolve relative to repo root if run from elsewhere via --python-expr cwd.
    if not os.path.isabs(out):
        out = os.path.abspath(out)
    export_glb(out)


if __name__ == "__main__":
    main()
