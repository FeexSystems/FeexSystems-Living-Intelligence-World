import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

export function ExplodingArchitectureCore() {
  const groupRef = useRef<THREE.Group>(null!);
  const scrollData = useScroll();

  useFrame(() => {
    if (!groupRef.current) return;
    const scrollOffset = scrollData.offset;

    // Rotate the stack for cinematic perspective as user scrolls
    groupRef.current.rotation.y = scrollOffset * Math.PI * 1.5 + 0.3;
    groupRef.current.rotation.x = Math.sin(scrollOffset * Math.PI) * 0.25;

    // Pull tiers apart like a precision modular engine block as the user scrolls
    const tiers = groupRef.current.children;
    tiers.forEach((tier, index) => {
      const spreadFactor = (index - 3) * 1.8;
      tier.position.y = THREE.MathUtils.lerp(
        spreadFactor * 0.15,
        spreadFactor * 1.35,
        scrollOffset
      );
      tier.scale.setScalar(THREE.MathUtils.lerp(1.0, 0.88, scrollOffset));
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, -2]}>
      {/* Tier 01: Persona Space (Cyan Wireframe Ring) */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.15, 32]} />
        <meshStandardMaterial color="#00f0ff" wireframe metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Tier 02: World Model Canonical DB (Obsidian Hex Plate with Magenta Rim) */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.4, 0.18, 2.4]} />
        <meshPhysicalMaterial
          color="#08080c"
          roughness={0.03}
          metalness={0.95}
          clearcoat={1.0}
          emissive="#ff0077"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Tier 03: Knowledge Graph Structure (Emerald Torus Ring) */}
      <mesh position={[0, 0.8, 0]}>
        <torusGeometry args={[1.3, 0.08, 16, 100]} />
        <meshStandardMaterial
          color="#00ffaa"
          emissive="#00ffaa"
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Tier 04: Spatial WebGL Visualizer (Octahedron Matrix) */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[1.1]} />
        <meshStandardMaterial
          color="#ffffff"
          wireframe
          metalness={1.0}
          roughness={0.1}
          emissive="#00f0ff"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Tier 05: Evidence Fabric Cryptographic Ledger (Precision Gold Box) */}
      <mesh position={[0, -0.8, 0]}>
        <boxGeometry args={[2.0, 0.15, 2.0]} />
        <meshPhysicalMaterial
          color="#121218"
          roughness={0.05}
          metalness={0.9}
          clearcoat={1.0}
          emissive="#ffd700"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Tier 06: Model Reasoning Mesh (Electric Blue Tube Ring) */}
      <mesh position={[0, -1.6, 0]}>
        <torusGeometry args={[1.5, 0.06, 16, 64]} />
        <meshStandardMaterial
          color="#0088ff"
          emissive="#0088ff"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Tier 07: Autonomous Orchestration Conduits (Base Foundation Plate) */}
      <mesh position={[0, -2.4, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.2, 32]} />
        <meshPhysicalMaterial
          color="#050508"
          roughness={0.02}
          metalness={0.98}
          clearcoat={1.0}
        />
      </mesh>
    </group>
  );
}

export default ExplodingArchitectureCore;
