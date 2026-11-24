import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LabNavigation } from "../../../hooks/lab/useLabNavigation";
import { LAB_WAYPOINTS } from "../../../lib/lab/lab-zone-graph";

/**
 * WaypointRig — deterministic camera path follower inside the Canvas.
 *
 * Reads the navigation path/progress produced by useLabNavigation and
 * interpolates camera position + look-at target along the waypoint legs
 * with smoothstep easing. When idle it holds the last pose. When the
 * canvas frameloop is 'never' (reduced motion / off-screen), it forces
 * exactly one invalidate per transition so the jump still lands.
 */

const _pos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _look = new THREE.Vector3();

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function samplePath(
  path: readonly { position: readonly number[]; target: readonly number[] }[],
  progress: number,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3,
) {
  if (path.length === 0) return false;
  if (path.length === 1 || progress >= 1) {
    const last = path[path.length - 1];
    outPos.set(last.position[0], last.position[1], last.position[2]);
    outTarget.set(last.target[0], last.target[1], last.target[2]);
    return true;
  }
  const legs = path.length - 1;
  const p = Math.min(Math.max(progress, 0), 1) * legs;
  const i = Math.min(Math.floor(p), legs - 1);
  const t = smoothstep(p - i);
  const a = path[i];
  const b = path[i + 1];
  outPos.set(
    a.position[0] + (b.position[0] - a.position[0]) * t,
    a.position[1] + (b.position[1] - a.position[1]) * t,
    a.position[2] + (b.position[2] - a.position[2]) * t,
  );
  outTarget.set(
    a.target[0] + (b.target[0] - a.target[0]) * t,
    a.target[1] + (b.target[1] - a.target[1]) * t,
    a.target[2] + (b.target[2] - a.target[2]) * t,
  );
  return true;
}

export function WaypointRig({ nav }: { nav: LabNavigation }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const initialized = useRef(false);

  const home = useMemo(() => LAB_WAYPOINTS.humanoid, []);

  // One-shot camera placement for frameloop='never' transitions.
  useEffect(() => {
    if (nav.state.phase === "disabled" && nav.path.length > 0) {
      samplePath(nav.path, 1, _pos, _target);
      camera.position.copy(_pos);
      _look.copy(_target);
      camera.lookAt(_look);
      invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.state.transitionId]);

  useFrame(() => {
    if (!initialized.current) {
      initialized.current = true;
      // Start framed on the humanoid unless a navigation is in flight.
      const start = nav.path.length > 0 && nav.state.phase !== "idle"
        ? null
        : home;
      if (start) {
        camera.position.set(start.position[0], start.position[1], start.position[2]);
        _look.set(start.target[0], start.target[1], start.target[2]);
        camera.lookAt(_look);
      }
      return;
    }
    if (nav.path.length === 0) return;
    if (!samplePath(nav.path, nav.progress, _pos, _target)) return;
    camera.position.lerp(_pos, 0.18);
    _look.lerp(_target, 0.22);
    camera.lookAt(_look);
  });

  return null;
}
