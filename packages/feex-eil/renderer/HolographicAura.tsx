import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import type { Group } from "three";
import type { HumanoidAnimationState } from "./HumanoidStateAdapter";
import { useSystemReducedMotion } from "./HumanoidAnimationController";

export interface HolographicAuraProps {
  animation: HumanoidAnimationState;
  reducedMotion?: boolean;
  accentColor?: string;
}

/**
 * Phase 6 — holographic projection layer for the EIL humanoid.
 *
 * Purely presentational: wireframe shell + gyroscopic rings + base
 * disc, all `meshBasicMaterial` (unlit, depthWrite off) so the layer
 * costs a handful of trivial draw calls and no shader compilation.
 * Opacity follows `animation.intensity` — it brightens with agent
 * activity and dims toward OFFLINE, never asserting state itself.
 *
 * Motion: a single slow spin on the ring assembly, driven by the host
 * Canvas frame loop and suppressed under reduced motion or when the
 * agent animation is not `animated` (e.g. OFFLINE). It issues no
 * invalidate() of its own — when the host controller sleeps (demand
 * loop), the aura freezes with it.
 */
export function HolographicAura({
  animation,
  reducedMotion,
  accentColor = "#8cf5d2",
}: HolographicAuraProps) {
  const rings = useRef<Group>(null);
  const ringsInner = useRef<Group>(null);
  const systemReducedMotion = useSystemReducedMotion();
  const suppressed = reducedMotion ?? systemReducedMotion;
  const spinning = !suppressed && animation.animated;

  const shellOpacity = 0.08 + animation.intensity * 0.28;
  const ringOpacity = 0.10 + animation.intensity * 0.30;

  useFrame((_, delta) => {
    if (!spinning) return;
    const step = Math.min(delta, 0.05);
    if (rings.current) rings.current.rotation.y += step * 0.45;
    if (ringsInner.current) ringsInner.current.rotation.x += step * 0.3;
  });

  return (
    <group name="feex-eil-holographic-aura" position={[0, -0.15, 0]}>
      {/* Head wireframe shell */}
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.36, 14, 10]} />
        <meshBasicMaterial
          color={accentColor}
          wireframe
          transparent
          opacity={shellOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* Projection base disc */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, 40]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.05 + animation.intensity * 0.06}
          depthWrite={false}
        />
      </mesh>

      {/* Gyroscopic rings */}
      <group ref={rings} position={[0, 0.95, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.52, 0.56, 48]} />
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={ringOpacity}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
        <group ref={ringsInner}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.4, 0.43, 40]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={ringOpacity * 0.8}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
