import { describe, it, expect } from "vitest";
import {
  getLabZoneEvidence,
  getLabCharacterEvidence,
  getLabRegistryRevision,
  isLabProjectionStale,
  LAB_ZONE_WORLD_LINKS,
} from "@/lib/lab/lab-world-model";
import { LAB_ZONE_IDS } from "@/lib/lab/lab-zone-graph";
import { getWorlds } from "@/landing/world/WorldModel";

describe("lab-world-model projection", () => {
  it("every zone has at least one canonical world link", () => {
    const worldIds = new Set(getWorlds().map((w) => w.id));
    for (const zoneId of LAB_ZONE_IDS) {
      const links = LAB_ZONE_WORLD_LINKS[zoneId];
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(worldIds.has(link.worldId)).toBe(true);
      }
    }
  });

  it("zone evidence refs trace to canonical world evidence", () => {
    for (const zoneId of LAB_ZONE_IDS) {
      const refs = getLabZoneEvidence(zoneId);
      const worldRefs = refs.filter((r) => r.kind === "world");
      expect(worldRefs.length).toBeGreaterThan(0);
      for (const ref of worldRefs) {
        // Every world ref must carry provenance fields from the registry.
        expect(ref.evidenceClass).toBeTruthy();
        expect(ref.source).toBeTruthy();
        expect(typeof ref.verified).toBe("boolean");
      }
    }
  });

  it("zone asset refs are honest UNAVAILABLE until manifests land", () => {
    for (const zoneId of LAB_ZONE_IDS) {
      const asset = getLabZoneEvidence(zoneId).find((r) => r.kind === "asset");
      expect(asset).toBeDefined();
      // No GLB manifests exist yet — must not claim CANONICAL/verified.
      expect(asset!.verified).toBe(false);
    }
  });

  it("character evidence is marked SIMULATED for the rollback GLB", () => {
    const ref = getLabCharacterEvidence();
    expect(ref.kind).toBe("asset");
    expect(ref.evidenceClass).toBe("SIMULATED");
    expect(ref.verified).toBe(false);
  });

  it("registry revision is deterministic and not stale at baseline", () => {
    const r1 = getLabRegistryRevision();
    const r2 = getLabRegistryRevision();
    expect(r1).toBe(r2);
    expect(r1).toMatch(/^wm-[0-9a-f]{8}$/);
    expect(isLabProjectionStale()).toBe(false);
  });
});
