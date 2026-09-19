import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import * as THREE from "three";

export function ExplodingArchitectureCore() {
  const groupRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const scrollData = useScroll();

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const scrollOffset = scrollData.offset;

    // Autonomous subtle gyro rotation
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.4;
      coreRef.current.rotation.x += delta * 0.2;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.5;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.35;
    }

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
      {/* Tier 01: Persona Space (Stark Monochrome Wireframe Ring) */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.15, 32]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.35} />
      </mesh>

      {/* Tier 02: World Model Canonical DB (Obsidian Hex Plate with Thin Wireframe) */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[2.4, 0.18, 2.4]} />
        <meshBasicMaterial color="#222222" wireframe />
      </mesh>

      {/* Tier 03: Gyroscopic Torus Ring (White Wireframe) */}
      <mesh ref={ring1Ref} position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.02, 16, 64]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.4} />
      </mesh>

      {/* Tier 04: Central HoloKai AI Q-Core (Pulsing Phosphor Neon Green Wireframe Icosahedron) */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial
          color="#00ff41"
          wireframe
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Tier 05: Outer Orbital Torus Ring (Darkened Charcoal Wireframe) */}
      <mesh ref={ring2Ref} position={[0, -0.8, 0]} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[2.8, 0.03, 16, 64]} />
        <meshBasicMaterial color="#555555" wireframe transparent opacity={0.6} />
      </mesh>

      {/* Tier 06: Model Reasoning Grid Plate (Monochrome Obsidian Plate) */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[2.0, 0.15, 2.0]} />
        <meshBasicMaterial color="#1a1a1a" wireframe />
      </mesh>

      {/* Tier 07: Autonomous Base Foundation (Deep Obsidian Charcoal Cylinder Base) */}
      <mesh position={[0, -2.4, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.25, 32]} />
        <meshBasicMaterial color="#2a2a2a" wireframe />
      </mesh>
    </group>
  );
}

export default ExplodingArchitectureCore;
