import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveWaypointPath,
  type LabNodeId,
  type LabWaypoint,
} from "../../lib/lab/lab-zone-graph";
import type { LabNavigationState } from "../../lib/lab/lab-contracts";

/**
 * useLabNavigation — deterministic waypoint navigation state.
 *
 * Owns the travel lifecycle only; the WaypointRig inside the Canvas
 * consumes `path`/`progress` and performs the actual camera tween.
 * Reduced-motion pins phase to `disabled` and jumps straight to target.
 */

const TRAVEL_MS = 2600;
const SETTLE_MS = 350;

export interface LabNavigation {
  state: LabNavigationState;
  /** Ordered waypoints for the in-flight transition (empty when idle). */
  path: readonly LabWaypoint[];
  /** 0..1 progress through the current leg sequence. */
  progress: number;
  navigate: (to: LabNodeId) => void;
  reset: () => void;
}

export function useLabNavigation(options: { reducedMotion?: boolean } = {}): LabNavigation {
  const { reducedMotion = false } = options;
  const [state, setState] = useState<LabNavigationState>({
    phase: reducedMotion ? "disabled" : "idle",
    targetZone: null,
    transitionId: 0,
  });
  const [path, setPath] = useState<readonly LabWaypoint[]>([]);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const pathRef = useRef<readonly LabWaypoint[]>([]);
  const fromRef = useRef<LabNodeId>("overview");

  const clearRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => clearRaf, [clearRaf]);

  const navigate = useCallback(
    (to: LabNodeId) => {
      clearRaf();
      const nextPath = resolveWaypointPath(fromRef.current, to);
      pathRef.current = nextPath;
      setPath(nextPath);
      setProgress(0);

      if (reducedMotion) {
        setState({ phase: "disabled", targetZone: to, transitionId: state.transitionId + 1 });
        fromRef.current = to;
        return;
      }

      setState({ phase: "traveling", targetZone: to, transitionId: state.transitionId + 1 });
      startRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        // Evenly distribute progress across waypoint legs.
        const legs = Math.max(pathRef.current.length - 1, 1);
        const p = Math.min(elapsed / (TRAVEL_MS * legs), 1);
        setProgress(p);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setState((s) => ({ ...s, phase: "arrived" }));
          setProgress(1);
          fromRef.current = to;
          window.setTimeout(() => {
            setState((s) => (s.phase === "arrived" ? { ...s, phase: "idle" } : s));
          }, SETTLE_MS);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [clearRaf, reducedMotion, state.transitionId],
  );

  const reset = useCallback(() => {
    clearRaf();
    setPath([]);
    setProgress(0);
    setState({ phase: reducedMotion ? "disabled" : "idle", targetZone: null, transitionId: 0 });
    fromRef.current = "overview";
  }, [clearRaf, reducedMotion]);

  return { state, path, progress, navigate, reset };
}
