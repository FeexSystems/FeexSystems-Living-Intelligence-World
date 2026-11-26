import { useCallback, useState } from "react";
import type { LabZoneId } from "../../lib/lab/lab-zones";
import type { LabHotspot, LabHotspotKind } from "../../lib/lab/lab-contracts";

/**
 * useLabSelection — hotspot selection state.
 *
 * Selection is a pure UI intent: it never mutates zone state or implies
 * agent/evidence availability. `inspect` actions are forwarded to the
 * caller (which owns useLabState.markInspected).
 */
export interface LabSelection {
  selected: LabHotspot | null;
  select: (hotspot: LabHotspot | null) => void;
  activate: (hotspot: LabHotspot, handlers: {
    onNavigate?: (zoneId: LabZoneId) => void;
    onInspect?: (zoneId: LabZoneId) => void;
  }) => void;
}

export function useLabSelection(): LabSelection {
  const [selected, setSelected] = useState<LabHotspot | null>(null);

  const select = useCallback((hotspot: LabHotspot | null) => {
    setSelected(hotspot);
  }, []);

  const activate = useCallback(
    (hotspot: LabHotspot, handlers: {
      onNavigate?: (zoneId: LabZoneId) => void;
      onInspect?: (zoneId: LabZoneId) => void;
    }) => {
      setSelected(hotspot);
      switch (hotspot.kind satisfies LabHotspotKind) {
        case "navigate":
          handlers.onNavigate?.(hotspot.zoneId);
          break;
        case "inspect":
        case "focus":
          handlers.onInspect?.(hotspot.zoneId);
          break;
        case "info":
          break;
      }
    },
    [],
  );

  return { selected, select, activate };
}
