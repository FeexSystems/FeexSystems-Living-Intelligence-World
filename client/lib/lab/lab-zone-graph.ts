/**
 * lab-zone-graph.ts — deterministic waypoint graph for lab navigation.
 *
 * Nodes: overview, humanoid staging, and each zone's camera anchor.
 * Edges: every zone connects through the atrium waypoint — the visitor
 * camera never cuts through zone geometry. Traversal order is fixed;
 * there is no pathfinding randomness.
 */

import { LAB_ZONES, LAB_HUMANOID_STAGING, zoneCenterToScene, zoneSizeToScene, type LabZoneId } from "./lab-zones";
import type { LabCameraMode } from "./lab-contracts";

/** Navigable nodes: overview + humanoid + each zone. The generic "zone"
 *  camera mode is a display state, not a waypoint. */
export type LabNodeId = Exclude<LabCameraMode, "zone"> | LabZoneId;

export interface LabWaypoint {
  id: LabNodeId;
  /** Camera position [x, y, z] in scene units (meters, y-up). */
  position: readonly [number, number, number];
  /** Look-at target [x, y, z]. */
  target: readonly [number, number, number];
}

const CAM_HEIGHT = 3.4;
const ZONE_CAM_DISTANCE = 7.0;

function zoneWaypoint(zoneId: LabZoneId): LabWaypoint {
  const zone = LAB_ZONES.find((z) => z.id === zoneId);
  if (!zone) throw new Error(`unknown zone ${zoneId}`);
  const [zx, zz] = zoneCenterToScene(zone.center);
  const [, zd] = zoneSizeToScene(zone.size);
  // Camera stands between atrium and zone, looking into the zone.
  // North zones (z < 0): camera at z + depth/2 + distance.
  // South zones (z > 0): camera at z - depth/2 - distance.
  const camZ = zz < 0 ? zz + zd / 2 + ZONE_CAM_DISTANCE : zz - zd / 2 - ZONE_CAM_DISTANCE;
  return {
    id: zoneId,
    position: [zx, CAM_HEIGHT, camZ],
    target: [zx, 1.5, zz],
  };
}

export const LAB_WAYPOINTS: Record<LabNodeId, LabWaypoint> = {
  overview: {
    id: "overview",
    position: [-13.5, 7.2, 10.5],
    target: [0, 1.2, -0.5],
  },
  humanoid: {
    id: "humanoid",
    position: [0, 1.7, 3.2],
    target: [LAB_HUMANOID_STAGING[0], 1.2, LAB_HUMANOID_STAGING[2]],
  },
  "command-centre": zoneWaypoint("command-centre"),
  "humanoid-bay": zoneWaypoint("humanoid-bay"),
  "robotics-sim": zoneWaypoint("robotics-sim"),
  "ai-research": zoneWaypoint("ai-research"),
  "bio-research": zoneWaypoint("bio-research"),
  "engineering-workshop": zoneWaypoint("engineering-workshop"),
  "observation-gallery": zoneWaypoint("observation-gallery"),
};

/**
 * Initial camera node. WaypointRig parks the camera on `humanoid` at first
 * frame, and useLabNavigation seeds its travel origin from this same constant
 * so the logical origin and the rendered pose never diverge.
 */
export const LAB_INITIAL_NODE: LabNodeId = "humanoid";

/** Atrium transit point — all inter-zone paths pass through it. */
export const LAB_ATRIUM_TRANSIT: LabWaypoint = {
  id: "overview",
  position: [0, 4.5, 6.5],
  target: [0, 1.0, 0],
};

/**
 * Resolve the waypoint path from current node to target node.
 * Direct paths are only allowed overview↔humanoid; everything else
 * transits the atrium waypoint first (deterministic two-leg journey).
 */
export function resolveWaypointPath(
  from: LabNodeId,
  to: LabNodeId,
): LabWaypoint[] {
  if (from === to) return [LAB_WAYPOINTS[to]];
  const direct = new Set<LabNodeId>(["overview", "humanoid"]);
  if (direct.has(from) && direct.has(to)) {
    return [LAB_WAYPOINTS[to]];
  }
  return [LAB_ATRIUM_TRANSIT, LAB_WAYPOINTS[to]];
}

export const LAB_ZONE_IDS: readonly LabZoneId[] = LAB_ZONES.map((z) => z.id);
