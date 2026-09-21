import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PLANETARY_ECOSYSTEMS, type EcosystemSatellite } from "@/world-model";

interface PlanetaryEcosystemSatellitesProps {
  selectedId: string | null;
  onSelect: (satellite: EcosystemSatellite) => void;
}

export function PlanetaryEcosystemSatellites({ selectedId, onSelect }: PlanetaryEcosystemSatellitesProps) {
  const orbitGroupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.04;
    }
  });

  const orbitRadius = 7.5;

  return (
    <group ref={orbitGroupRef} position={[0, 0, -2]}>
      {/* Visual Orbit Reference Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.02, orbitRadius + 0.02, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      {PLANETARY_ECOSYSTEMS.map((eco, idx) => {
        const angle = (idx / PLANETARY_ECOSYSTEMS.length) * Math.PI * 2;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        const isSelected = selectedId === eco.id;

        return (
          <group key={eco.id} position={[x, 0, z]}>
            {/* Satellite Node Geometry */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect(eco);
              }}
              scale={isSelected ? [1.3, 1.3, 1.3] : [0.9, 0.9, 0.9]}
            >
              <octahedronGeometry args={[0.35, 0]} />
              <meshBasicMaterial
                color={isSelected ? "#00ff66" : "#ffffff"}
                wireframe
                transparent
                opacity={isSelected ? 1.0 : 0.6}
              />
            </mesh>

            {/* Orbit Target Beacon Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 0.54, 32]} />
              <meshBasicMaterial
                color={isSelected ? "#00ff66" : "#444444"}
                transparent
                opacity={isSelected ? 0.8 : 0.3}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Swiss Typographic 3D Label */}
            <Html
              position={[0, 0.5, 0]}
              center
              distanceFactor={36}
              className="pointer-events-auto select-none"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(eco);
                }}
                className={`px-1.5 py-0.5 border text-[8px] font-mono tracking-wider whitespace-nowrap uppercase transition shadow-md ${
                  isSelected
                    ? "border-[#00ff66] text-[#00ff66] bg-black/90 shadow-[0_0_8px_rgba(0,255,102,0.4)]"
                    : "border-white/20 text-white/70 bg-black/80 hover:border-[#00ff66] hover:text-[#00ff66]"
                }`}
              >
                [{String(idx + 1).padStart(2, "0")}] {eco.name}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default PlanetaryEcosystemSatellites;
