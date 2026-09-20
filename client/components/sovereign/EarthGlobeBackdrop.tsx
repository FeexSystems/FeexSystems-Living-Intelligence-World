/**
 * EarthGlobeBackdrop — dual wireframe / hybrid Earth for Feex World OS
 *
 * Drop into: client/components/sovereign/EarthGlobeBackdrop.tsx
 * Mount inside the existing FeexSovereignEngine <Canvas> (one Canvas only).
 *
 * Design intent (target HUD image):
 *   - Primary large globe (center / slightly back)
 *   - Secondary smaller globe offset
 *   - Monochrome wireframe + optional soft continent fill
 *   - Respects prefers-reduced-motion (no spin)
 *
 * Dependencies: @react-three/fiber, three, @react-three/drei (optional texture)
 */

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface EarthGlobeBackdropProps {
  /** Primary globe radius (default 2.6) */
  primaryRadius?: number;
  /** Secondary globe radius (default 1.1) */
  secondaryRadius?: number;
  /** Offset of secondary globe [x, y, z] */
  secondaryOffset?: [number, number, number];
  /** Phosphor / wire color */
  wireColor?: string;
  /** Fill opacity for solid underlay (0 = pure wireframe) */
  fillOpacity?: number;
  /** Yaw spin speed (rad/s). 0 when reduced-motion. */
  spinSpeed?: number;
  /** Disable spin entirely */
  reducedMotion?: boolean;
}

function GlobeMesh({
  radius,
  position,
  wireColor,
  fillOpacity,
  spinSpeed,
  reducedMotion,
  segments = 48,
}: {
  radius: number;
  position: [number, number, number];
  wireColor: string;
  fillOpacity: number;
  spinSpeed: number;
  reducedMotion: boolean;
  segments?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current || spinSpeed === 0) return;
    groupRef.current.rotation.y += delta * spinSpeed;
  });

  const wireMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: wireColor,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    [wireColor]
  );

  const fillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#0a1218",
        transparent: true,
        opacity: fillOpacity,
        depthWrite: false,
      }),
    [fillOpacity]
  );

  // Meridian / parallel helper rings for "technical dossier" look
  const rings = useMemo(() => {
    const items: { rot: [number, number, number]; r: number }[] = [];
    // equator-ish
    items.push({ rot: [Math.PI / 2, 0, 0], r: radius * 1.002 });
    // tilt rings
    items.push({ rot: [Math.PI / 2.4, 0.2, 0], r: radius * 1.004 });
    items.push({ rot: [Math.PI / 1.7, -0.15, 0.1], r: radius * 1.003 });
    return items;
  }, [radius]);

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: wireColor,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [wireColor]
  );

  return (
    <group ref={groupRef} position={position}>
      {fillOpacity > 0 && (
        <mesh>
          <sphereGeometry args={[radius * 0.98, segments, segments]} />
          <primitive object={fillMat} attach="material" />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[radius, segments, segments]} />
        <primitive object={wireMat} attach="material" />
      </mesh>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={ring.rot}>
          <ringGeometry args={[ring.r - 0.012, ring.r + 0.012, 96]} />
          <primitive object={ringMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Dual-globe backdrop. Place near origin; existing ExplodingArchitectureCore
 * and satellites sit in front / orbit around this layer.
 */
export function EarthGlobeBackdrop({
  primaryRadius = 2.6,
  secondaryRadius = 1.05,
  secondaryOffset = [3.4, -0.4, -1.2],
  wireColor = "#c8d0d8",
  fillOpacity = 0.12,
  spinSpeed = 0.03,
  reducedMotion = false,
}: EarthGlobeBackdropProps) {
  const speed = reducedMotion ? 0 : spinSpeed;

  return (
    <group>
      {/* Soft atmospheric rim (additive feel via low opacity shell) */}
      <mesh>
        <sphereGeometry args={[primaryRadius * 1.06, 32, 32]} />
        <meshBasicMaterial
          color="#00ff66"
          transparent
          opacity={0.03}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <GlobeMesh
        radius={primaryRadius}
        position={[0, 0, -0.5]}
        wireColor={wireColor}
        fillOpacity={fillOpacity}
        spinSpeed={speed}
        reducedMotion={reducedMotion}
        segments={56}
      />

      <GlobeMesh
        radius={secondaryRadius}
        position={secondaryOffset}
        wireColor={wireColor}
        fillOpacity={fillOpacity * 0.85}
        spinSpeed={-speed * 0.7}
        reducedMotion={reducedMotion}
        segments={36}
      />
    </group>
  );
}

export default EarthGlobeBackdrop;
