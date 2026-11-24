import { useCallback, useMemo, useState } from "react";
import type { LabZoneId } from "../../lib/lab/lab-zones";
import { LAB_ZONE_IDS } from "../../lib/lab/lab-zone-graph";
import type { LabZoneRuntime, LabZoneStatus } from "../../lib/lab/lab-contracts";

/**
 * useLabState — single owner of lab zone visit/inspection state.
 *
 * Deterministic: zones start `unvisited`; navigating marks `active`;
 * explicit inspect marks `inspected` permanently. No timers, no
 * inference — every transition is an explicit action.
 */
export function useLabState() {
  const [visited, setVisited] = useState<ReadonlySet<LabZoneId>>(new Set());
  const [inspected, setInspected] = useState<ReadonlySet<LabZoneId>>(new Set());
  const [activeZone, setActiveZone] = useState<LabZoneId | null>(null);

  const markVisited = useCallback((zoneId: LabZoneId) => {
    setVisited((prev) => (prev.has(zoneId) ? prev : new Set(prev).add(zoneId)));
    setActiveZone(zoneId);
  }, []);

  const markInspected = useCallback((zoneId: LabZoneId) => {
    setInspected((prev) => (prev.has(zoneId) ? prev : new Set(prev).add(zoneId)));
    setVisited((prev) => (prev.has(zoneId) ? prev : new Set(prev).add(zoneId)));
    setActiveZone(zoneId);
  }, []);

  const zones: LabZoneRuntime[] = useMemo(
    () =>
      LAB_ZONE_IDS.map((zoneId) => {
        const isInspected = inspected.has(zoneId);
        const status: LabZoneStatus = isInspected
          ? "inspected"
          : visited.has(zoneId)
            ? "active"
            : "unvisited";
        return { zoneId, status, visited: visited.has(zoneId) };
      }),
    [visited, inspected],
  );

  return { zones, activeZone, markVisited, markInspected };
}
