/**
 * lab-zones.ts — canonical FEEX-SORL zone registry.
 *
 * Single source of truth for the six laboratory zones. Coordinates are
 * REAL-WORLD METERS in the Blender scene space (X right, Y into the lab,
 * Z up; origin at atrium centre, floor y=0). The Blender authoring
 * scripts (scripts/authoring/build_feex_sorl_zones.py) mirror these
 * values — keep them in sync.
 *
 * Zone IDs are the machine contract from FEEX-SORL-MEGA-PLAN §2.2.
 */

export type LabZoneId =
  | "command-centre"
  | "humanoid-bay"
  | "robotics-sim"
  | "ai-research"
  | "bio-research"
  | "engineering-workshop";

export interface LabZone {
  id: LabZoneId;
  name: string;
  /** Floor-plane centre [x, y] in meters. */
  center: readonly [number, number];
  /** Zone footprint [width, depth] in meters. */
  size: readonly [number, number];
  /** Direction the zone faces (degrees; 0 = +Y/north, 180 = -Y/south). */
  faceDeg: number;
  /** Signature equipment key — resolved by the lab asset registry. */
  signature: string;
}

export const LAB_SHELL = {
  width: 30,
  depth: 24,
  ceilingHeight: 5.5,
} as const;

export const LAB_ZONES: readonly LabZone[] = [
  {
    id: "command-centre",
    name: "Sovereign Command Centre",
    center: [-10, 7],
    size: [9, 8],
    faceDeg: 180,
    signature: "command_wall",
  },
  {
    id: "humanoid-bay",
    name: "Humanoid Research Bay",
    center: [0, 8.6],
    size: [9, 6],
    faceDeg: 180,
    signature: "turntable",
  },
  {
    id: "ai-research",
    name: "AI Research Wing",
    center: [10, 7],
    size: [9, 8],
    faceDeg: 180,
    signature: "server_rack",
  },
  {
    id: "robotics-sim",
    name: "Robotics & Simulation Lab",
    center: [-10, -7],
    size: [9, 8],
    faceDeg: 0,
    signature: "sim_ring",
  },
  {
    id: "bio-research",
    name: "Bio-Research / HoloKai Wing",
    center: [0, -8.6],
    size: [9, 6],
    faceDeg: 0,
    signature: "culture_racks",
  },
  {
    id: "engineering-workshop",
    name: "Engineering Workshop",
    center: [10, -7],
    size: [9, 8],
    faceDeg: 0,
    signature: "fab_bench",
  },
] as const;

/**
 * Humanoid staging position — SCENE coords (three.js, y-up, z=-blenderY).\n * Blender staging was (0, 6.8, 0) → scene (0, 0, -6.8): inside
 * humanoid-bay, facing south toward the atrium.
 */
export const LAB_HUMANOID_STAGING: readonly [number, number, number] = [
  0, 0, -6.8,
];

/** Blender → R3F axis mapping note: Blender is Z-up, glTF/R3F is Y-up.
 *  The exporter converts; these coordinates are already in the
 *  floor-plan (x, y) convention and need no remap for horizontal use. */

export function getLabZone(id: LabZoneId): LabZone {
  const zone = LAB_ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`unknown lab zone: ${id}`);
  return zone;
}

/**
 * Blender (x, y) floor coords → three.js scene coords.
 * Blender→glTF maps (x, y, z) → (x, z, -y), so floor y becomes -z.
 * North zones (y > 0) land at negative z (far side from default camera).
 */
export function zoneCenterToScene(center: readonly [number, number]): readonly [number, number] {
  return [center[0], -center[1]];
}

/** Zone footprint in scene coords [width(x), depth(z)]. */
export function zoneSizeToScene(size: readonly [number, number]): readonly [number, number] {
  return [size[0], size[1]];
}
