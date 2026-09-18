import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useBox } from "@react-three/cannon";
import * as THREE from "three";

export interface BladeServerProps {
  position: [number, number, number];
  domain: string;
  isActivePulse?: boolean;
  pulseColor?: string;
  onCollision: (msg: string) => void;
}

export function LiveStreamBladeServer({
  position,
  domain,
  isActivePulse = false,
  pulseColor = "#00f0ff",
  onCollision,
}: BladeServerProps) {
  const [ref] = useBox(() => ({
    type: "Static",
    position,
    args: [2.5, 3.5, 1.0],
    onCollide: () => {
      onCollision(`Manual Probe Override: Telemetry locked on ${domain}`);
    },
  }));

  const glassMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null!);

  // Smoothly decay the light flash emission directly on the GPU frame
  useFrame(() => {
    if (glassMaterialRef.current) {
      const currentEmissive = glassMaterialRef.current.emissiveIntensity;
      glassMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        currentEmissive,
        0.05,
        0.08
      );
    }
  });

  // Trigger surge whenever a fresh event is pushed down the pipe
  useEffect(() => {
    if (isActivePulse && glassMaterialRef.current) {
      glassMaterialRef.current.emissiveIntensity = 4.8;
    }
  }, [isActivePulse]);

  return (
    <group ref={ref as any}>
      {/* Structural Main Frame Rack - Polished Obsidian Chassis */}
      <mesh>
        <boxGeometry args={[2.5, 3.5, 1.0]} />
        <meshPhysicalMaterial
          color="#06060a"
          roughness={0.02}
          metalness={0.98}
          clearcoat={1.0}
          clearcoatRoughness={0.01}
          reflectivity={1.0}
        />
      </mesh>

      {/* Front Interface Facade - Frosted Hairline Glass Panel */}
      <mesh position={[0, 0, 0.51]}>
        <planeGeometry args={[2.3, 3.3]} />
        <meshPhysicalMaterial
          ref={glassMaterialRef}
          color="#0b1120"
          emissive={pulseColor}
          emissiveIntensity={0.05}
          transparent
          opacity={0.4}
          roughness={0.2}
          transmission={0.5}
          thickness={1.0}
          ior={1.52}
        />
      </mesh>

      {/* Internal Hardware Blade Arrays slots */}
      {[-1.2, -0.6, 0, 0.6, 1.2].map((yOffset, i) => (
        <mesh key={i} position={[0, yOffset, 0.53]}>
          <boxGeometry args={[1.9, 0.12, 0.04]} />
          <meshStandardMaterial
            color={pulseColor}
            emissive={pulseColor}
            emissiveIntensity={isActivePulse ? 2.5 : 0.4}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

export default LiveStreamBladeServer;
