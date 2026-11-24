import { describe, it, expect } from "vitest";
import {
  LAB_WAYPOINTS,
  LAB_ATRIUM_TRANSIT,
  LAB_ZONE_IDS,
  resolveWaypointPath,
} from "@/lib/lab/lab-zone-graph";
import { LAB_ZONES, LAB_SHELL, getLabZone } from "@/lib/lab/lab-zones";

describe("lab-zones registry", () => {
  it("defines exactly the six contract zones", () => {
    expect(LAB_ZONE_IDS).toHaveLength(6);
    expect(new Set(LAB_ZONE_IDS).size).toBe(6);
  });

  it("keeps every zone inside the shell footprint", () => {
    for (const z of LAB_ZONES) {
      const [cx, cz] = [z.center[0], -z.center[1]];
      const [w, d] = z.size;
      expect(Math.abs(cx) + w / 2).toBeLessThanOrEqual(LAB_SHELL.width / 2 + 0.01);
      expect(Math.abs(cz) + d / 2).toBeLessThanOrEqual(LAB_SHELL.depth / 2 + 0.01);
    }
  });

  it("resolves known zones and rejects unknown ids", () => {
    expect(getLabZone("humanoid-bay").signature).toBe("turntable");
    expect(() => getLabZone("nowhere" as never)).toThrow();
  });
});

describe("lab-zone-graph waypoints", () => {
  it("has a waypoint for every navigable node", () => {
    for (const id of [...LAB_ZONE_IDS, "overview", "humanoid"] as const) {
      const wp = LAB_WAYPOINTS[id];
      expect(wp).toBeDefined();
      expect(wp.position).toHaveLength(3);
      expect(wp.target).toHaveLength(3);
    }
  });

  it("routes zone-to-zone travel through the atrium transit", () => {
    const path = resolveWaypointPath("command-centre", "ai-research");
    expect(path).toHaveLength(2);
    expect(path[0]).toBe(LAB_ATRIUM_TRANSIT);
    expect(path[1].id).toBe("ai-research");
  });

  it("allows direct overview↔humanoid hops", () => {
    expect(resolveWaypointPath("overview", "humanoid")).toHaveLength(1);
    expect(resolveWaypointPath("humanoid", "overview")).toHaveLength(1);
  });

  it("returns a single waypoint when already at target", () => {
    const path = resolveWaypointPath("bio-research", "bio-research");
    expect(path).toHaveLength(1);
    expect(path[0].id).toBe("bio-research");
  });

  it("places zone cameras between atrium and the zone", () => {
    // North zones (scene z < 0): camera z must be greater (closer to atrium)
    // than the zone centre but outside the zone footprint.
    const north = LAB_WAYPOINTS["command-centre"];
    expect(north.position[2]).toBeGreaterThan(north.target[2]);
    const south = LAB_WAYPOINTS["robotics-sim"];
    expect(south.position[2]).toBeLessThan(south.target[2]);
  });
});
