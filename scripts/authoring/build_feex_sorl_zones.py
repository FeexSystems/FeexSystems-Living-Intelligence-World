# FEEX-SORL Phase 2 — Laboratory zone builder.
#
# Deterministic Blender authoring script (headless-safe):
#   blender --background --python build_feex_sorl_zones.py
#
# Builds the seven named research zones of the Sovereign Research &
# Operations Laboratory: workstation clusters, large equipment,
# monochrome signage totems, and named anchor empties used by the
# web waypoint graph. Zone IDs match the mega-plan §2.2 contract:
#
#   command-centre | humanoid-bay | robotics-sim
#   ai-research    | bio-research | engineering-workshop
#
# Every zone gets: floor pad, back wall panel, 2-3 workstation
# clusters, one signature equipment piece, one signage totem,
# a ZONE_<id> anchor empty and a HOTSPOT_<id> interaction empty.
# Depends on M_* materials from build_feex_sorl_architecture.py
# (run that script first in the same session, or import it).

import bpy
import math
from mathutils import Vector

# Zone layout on the 30 x 30 m shell (x, y, facing rotation_deg).
# Six quadrant zones around the central atrium + north observation gallery.
ZONES = [
    {
        "id": "command-centre",
        "name": "Sovereign Command Centre",
        "center": (-10.0, 7.0),
        "size": (9.0, 8.0),
        "face_deg": 180,          # faces south into atrium
        "signature": "command_wall",
    },
    {
        "id": "humanoid-bay",
        "name": "Humanoid Research Bay",
        "center": (0.0, 8.6),
        "size": (9.0, 6.0),
        "face_deg": 180,
        "signature": "turntable",
    },
    {
        "id": "ai-research",
        "name": "AI Research Wing",
        "center": (10.0, 7.0),
        "size": (9.0, 8.0),
        "face_deg": 180,
        "signature": "server_rack",
    },
    {
        "id": "robotics-sim",
        "name": "Robotics & Simulation Lab",
        "center": (-10.0, -7.0),
        "size": (9.0, 8.0),
        "face_deg": 0,            # faces north into atrium
        "signature": "sim_ring",
    },
    {
        "id": "bio-research",
        "name": "Bio-Research / HoloKai Wing",
        "center": (0.0, -8.6),
        "size": (9.0, 6.0),
        "face_deg": 0,
        "signature": "culture_racks",
    },
    {
        "id": "engineering-workshop",
        "name": "Engineering Workshop",
        "center": (10.0, -7.0),
        "size": (9.0, 8.0),
        "face_deg": 0,
        "signature": "fab_bench",
    },
    {
        "id": "observation-gallery",
        "name": "Observation Gallery & Evidence Wall",
        "center": (0.0, 13.4),
        "size": (26.0, 3.2),
        "face_deg": 180,          # faces south into the lab below
        "signature": "observation_deck",
    },
]

CEIL_H = 5.5


def get_mat(name):
    return bpy.data.materials.get(name)


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


def cyl(name, loc, radius, depth, mat, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius,
                                        depth=depth, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def empty(name, loc, col, kind="PLAIN_AXES", size=0.5):
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = kind
    obj.empty_display_size = size
    obj.location = loc
    col.objects.link(obj)
    return obj


# ---------------------------------------------------------------------------
# Furniture primitives (human scale: desk 1.5w x 0.75d x 0.75h, etc.)
# ---------------------------------------------------------------------------

def workstation(col, prefix, loc, rot_z=0.0):
    """Desk + monitor + chair block. loc is floor contact point."""
    M_panel = get_mat("M_SORL_Panel") or get_mat("M_SORL_Wall")
    M_dark = get_mat("M_SORL_Dark") or get_mat("M_SORL_Frame")
    M_signal = get_mat("M_SORL_Signal")

    grp = bpy.data.objects.new(prefix + "_GRP", None)
    col.objects.link(grp)
    grp.location = loc
    grp.rotation_euler.z = math_radians(rot_z)

    parts = [
        box(prefix + "_Desk", (0, 0, 0.74), (1.6, 0.8, 0.06), M_panel),
        box(prefix + "_DeskLegL", (-0.7, 0, 0.37), (0.08, 0.7, 0.74), M_dark),
        box(prefix + "_DeskLegR", (0.7, 0, 0.37), (0.08, 0.7, 0.74), M_dark),
        box(prefix + "_Monitor", (0, -0.28, 1.15), (0.55, 0.05, 0.35), M_dark),
        box(prefix + "_MonitorStand", (0, -0.28, 0.95), (0.06, 0.06, 0.4), M_dark),
        box(prefix + "_ChairSeat", (0, 0.55, 0.48), (0.5, 0.5, 0.08), M_dark),
        box(prefix + "_ChairBack", (0, 0.78, 0.85), (0.5, 0.08, 0.6), M_dark),
    ]
    if M_signal:
        parts.append(box(prefix + "_ScreenGlow", (0, -0.305, 1.15),
                         (0.48, 0.01, 0.28), M_signal))
    bpy.context.view_layer.update()
    for p in parts:
        # parent to group; group carries position/rotation
        p.parent = grp
        p.matrix_parent_inverse = grp.matrix_world.inverted()
    return grp


def math_radians(d):
    import math
    return math.radians(d)


def signature_equipment(zone, col):
    """One hero prop per zone — recognizable silhouette at blockout."""
    zid = zone["id"]
    cx, cy = zone["center"]
    M_panel = get_mat("M_SORL_Panel") or get_mat("M_SORL_Wall")
    M_dark = get_mat("M_SORL_Dark") or get_mat("M_SORL_Frame")
    M_frame = get_mat("M_SORL_Frame")
    M_signal = get_mat("M_SORL_Signal")

    if zid == "command-centre":
        # Wall-sized command display wall on the north wall.
        wall_y = cy + zone["size"][1] / 2 - 0.3
        for i in range(3):
            link_obj(box(f"ZONE_{zid}_WallScreen_{i}",
                         (cx - 2.4 + i * 2.4, wall_y, 2.6),
                         (2.2, 0.12, 1.4), M_dark), col)
            if M_signal:
                link_obj(box(f"ZONE_{zid}_WallGlow_{i}",
                             (cx - 2.4 + i * 2.4, wall_y - 0.08, 2.6),
                             (2.0, 0.02, 1.2), M_signal), col)
        link_obj(box(f"ZONE_{zid}_Console", (cx, cy - zone["size"][1] / 2 + 1.2, 0.5),
                     (5.0, 0.9, 1.0), M_panel), col)

    elif zid == "humanoid-bay":
        # Central presentation turntable + overhead light ring + backdrop.
        link_obj(cyl(f"ZONE_{zid}_Turntable", (cx, cy, 0.08), 1.5, 0.16,
                     M_frame, vertices=48), col)
        link_obj(cyl(f"ZONE_{zid}_TurntableTop", (cx, cy, 0.18), 1.3, 0.06,
                     M_dark, vertices=48), col)
        link_obj(cyl(f"ZONE_{zid}_LightRing", (cx, cy, CEIL_H - 1.2), 2.2, 0.08,
                     M_signal, vertices=48), col)
        link_obj(box(f"ZONE_{zid}_Backdrop", (cx, cy + zone["size"][1] / 2 - 0.4, CEIL_H / 2),
                     (6.0, 0.15, CEIL_H - 0.5), M_panel), col)

    elif zid == "ai-research":
        # Server rack row + hologram plinth.
        for i in range(4):
            link_obj(box(f"ZONE_{zid}_Rack_{i}",
                         (cx - 3.3 + i * 2.2, cy + zone["size"][1] / 2 - 0.9, 1.1),
                         (0.9, 0.7, 2.2), M_dark), col)
        link_obj(cyl(f"ZONE_{zid}_HoloPlinth", (cx, cy - 1.0, 0.6), 0.5, 1.2,
                     M_frame), col)
        if M_signal:
            link_obj(cyl(f"ZONE_{zid}_HoloOrb", (cx, cy - 1.0, 2.0), 0.45, 0.9,
                         M_signal, vertices=32), col)

    elif zid == "robotics-sim":
        # Circular sim floor ring + sensor mast cluster.
        link_obj(cyl(f"ZONE_{zid}_SimRing", (cx, cy, 0.02), 2.6, 0.04,
                     M_signal, vertices=64), col)
        for i in range(3):
            a = math_radians(i * 120)
            mx = cx + 2.0 * math.cos(a)
            my = cy + 2.0 * math.sin(a)
            link_obj(cyl(f"ZONE_{zid}_Mast_{i}", (mx, my, 1.5), 0.06, 3.0,
                         M_frame, vertices=12), col)
            link_obj(box(f"ZONE_{zid}_MastHead_{i}", (mx, my, 3.0),
                         (0.3, 0.3, 0.2), M_dark), col)

    elif zid == "bio-research":
        # Tiered culture racks + specimen plinth.
        for tier in range(3):
            link_obj(box(f"ZONE_{zid}_RackT{tier}",
                         (cx - 2.6, cy + zone["size"][1] / 2 - 0.8, 0.6 + tier * 0.7),
                         (4.5, 0.6, 0.08), M_panel), col)
            for s in range(6):
                link_obj(cyl(f"ZONE_{zid}_Vial_{tier}_{s}",
                             (cx - 4.0 + s * 0.8, cy + zone["size"][1] / 2 - 0.8, 0.75 + tier * 0.7),
                             0.07, 0.25, M_frame, vertices=12), col)
        link_obj(box(f"ZONE_{zid}_SpecimenPlinth", (cx, cy - 1.5, 0.45),
                     (1.0, 1.0, 0.9), M_panel), col)

    elif zid == "engineering-workshop":
        # Fab bench row + CNC gantry silhouette + parts shelves.
        link_obj(box(f"ZONE_{zid}_FabBench", (cx - 1.5, cy + 1.5, 0.5),
                     (4.0, 1.2, 1.0), M_panel), col)
        link_obj(box(f"ZONE_{zid}_GantryBeam", (cx - 1.5, cy - 0.5, 2.6),
                     (5.0, 0.4, 0.4), M_frame), col)
        for i in range(3):
            link_obj(box(f"ZONE_{zid}_Shelf_{i}",
                         (cx + 2.5, cy + zone["size"][1] / 2 - 0.9 - i * 1.4, 1.0),
                         (2.2, 0.5, 2.0), M_dark), col)

    elif zid == "observation-gallery":
        # Evidence display wall on the north wall + glass railing at the
        # atrium-facing edge + deck edge light strip.
        wall_y = cy + zone["size"][1] / 2 - 0.35
        for i in range(5):
            px = cx - 8.0 + i * 4.0
            link_obj(box(f"ZONE_{zid}_EvidencePanel_{i}", (px, wall_y, 2.4),
                         (3.2, 0.14, 1.9), M_dark), col)
            if M_signal:
                link_obj(box(f"ZONE_{zid}_EvidenceGlow_{i}",
                             (px, wall_y - 0.09, 2.4),
                             (3.0, 0.02, 1.7), M_signal), col)
        rail_y = cy - zone["size"][1] / 2 + 0.2
        link_obj(box(f"ZONE_{zid}_RailingGlass",
                     (cx, rail_y, 1.1),
                     (min(zone["size"][0] - 2.0, 22.0), 0.06, 1.1), M_panel), col)
        link_obj(box(f"ZONE_{zid}_RailingRail",
                     (cx, rail_y, 0.08),
                     (min(zone["size"][0] - 2.0, 22.0), 0.3, 0.16), M_frame), col)
        if M_signal:
            link_obj(box(f"ZONE_{zid}_DeckEdgeGlow",
                         (cx, rail_y + 0.4, 0.02),
                         (min(zone["size"][0] - 4.0, 20.0), 0.12, 0.02), M_signal), col)


def signage_totem(zone, col):
    """Monochrome ID totem at the zone's atrium-facing edge."""
    zid = zone["id"]
    cx, cy = zone["center"]
    M_frame = get_mat("M_SORL_Frame")
    M_dark = get_mat("M_SORL_Dark") or M_frame
    M_signal = get_mat("M_SORL_Signal")

    # Totem stands just inside the zone edge facing the atrium.
    face = zone["face_deg"]
    import math
    rad = math.radians(face)
    # offset toward atrium (opposite of zone outward direction)
    ox, oy = zone["size"][0] / 2 + 0.8, 0
    # place totem on the zone's atrium-facing side
    if cy > 0:
        ty = cy - zone["size"][1] / 2 + 0.9   # north zones: south edge
    else:
        ty = cy + zone["size"][1] / 2 - 0.9   # south zones: north edge
    tx = cx

    link_obj(cyl(f"ZONE_{zid}_TotemPole", (tx, ty, 1.1), 0.06, 2.2, M_frame, vertices=12), col)
    link_obj(box(f"ZONE_{zid}_TotemHead", (tx, ty, 2.35), (0.7, 0.12, 0.45), M_dark), col)
    if M_signal:
        link_obj(box(f"ZONE_{zid}_TotemGlow", (tx, ty + (0.07 if cy > 0 else -0.07), 2.35),
                     (0.6, 0.02, 0.35), M_signal), col)

    # Zone floor pad (subtle dark inlay)
    w, d = zone["size"]
    link_obj(box(f"ZONE_{zid}_FloorPad", (cx, cy, 0.015),
                 (w - 0.6, d - 0.6, 0.03),
                 get_mat("M_SORL_Dark") or M_dark), col)


def build_zones():
    col = collection("SORL_Zones")
    anchor_col = collection("SORL_Anchors")

    for zone in ZONES:
        zid = zone["id"]
        cx, cy = zone["center"]

        # Zone anchor: floor centre, used by waypoint graph.
        empty(f"ZONE_{zid}", (cx, cy, 0), anchor_col, size=0.8)
        # Interaction hotspot: 1.6 m in front of signature equipment.
        hx = cx
        hy = cy - zone["size"][1] / 4 if cy > 0 else cy + zone["size"][1] / 4
        empty(f"HOTSPOT_{zid}", (hx, hy, 1.4), anchor_col,
              kind="ARROWS", size=0.4)
        # Spawn/overview camera target per zone.
        empty(f"SPAWN_{zid}", (cx, cy, 1.6), anchor_col, size=0.3)

        # Workstation clusters: two desks per zone flanking centre.
        w, d = zone["size"]
        workstation(col, f"ZONE_{zid}_WS_A",
                    (cx - w / 4, cy - (d / 2 - 1.6), 0), rot_z=zone["face_deg"])
        workstation(col, f"ZONE_{zid}_WS_B",
                    (cx + w / 4, cy - (d / 2 - 1.6), 0), rot_z=zone["face_deg"])

        signature_equipment(zone, col)
        signage_totem(zone, col)

    # Humanoid staging position inside humanoid-bay (faces south to atrium).
    hb = next(z for z in ZONES if z["id"] == "humanoid-bay")
    empty("SORL_HumanoidStaging", (hb["center"][0], hb["center"][1] - 1.8, 0),
          anchor_col, kind="CIRCLE", size=0.6)

    print("[build_feex_sorl_zones] OK — 6 zones, furniture, signage, anchors")


def main():
    build_zones()


if __name__ == "__main__":
    main()
