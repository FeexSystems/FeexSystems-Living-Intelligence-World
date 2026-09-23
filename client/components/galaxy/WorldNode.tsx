import { useMemo, useRef, useState, memo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Float,
  Billboard,
  Text,
  Html,
  MeshTransmissionMaterial,
  useCursor,
} from "@react-three/drei";
import * as THREE from "three";
import {
  PlanetaryCoreShaderMaterial,
  AtmosphereHalo,
  CryptographicLattice,
  EquatorialTelemetryRing,
  resolveWorldChroma,
} from "@/components/webgl/PlanetaryCoreMaterial";
import type { GalaxyQuality, GraphNode } from "./types";
import { QUALITY_PRESETS, nodeRadius } from "./types";

const WorldNode = memo(function WorldNode({
  node,
  isSelected,
  isDimmed,
  quality,
  onClick,
}: {
  node: GraphNode;
  isSelected: boolean;
  isDimmed: boolean;
  quality: GalaxyQuality;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  const preset = QUALITY_PRESETS[quality];
  const chroma = useMemo(() => resolveWorldChroma(node.name, node.domain), [node]);
  const size = nodeRadius(node);
  useCursor(hovered, "pointer", "auto");

  // LOD: distance-based simplification
  const lodRef = useRef(0); // 0 full, 1 mid, 2 far
  useFrame((state) => {
    if (!groupRef.current || !node.position) return;
    const dist = camera.position.distanceTo(groupRef.current.position);
    lodRef.current = dist > 42 ? 2 : dist > 22 ? 1 : 0;

    // subtle living drift
    const t = state.clock.elapsedTime;
    const idHash = node.id.length * 0.17;
    groupRef.current.position.x = node.position[0] + Math.sin(t * 0.15 + idHash) * 0.12;
    groupRef.current.position.y = node.position[1] + Math.cos(t * 0.12 + idHash) * 0.1;
    groupRef.current.position.z = node.position[2] + Math.sin(t * 0.11 + idHash * 2) * 0.12;

    if (meshRef.current && isSelected) {
      const s = 1 + Math.sin(t * 3.5) * 0.08;
      meshRef.current.scale.setScalar(s);
    }
  });

  const segs = lodRef.current === 2 ? 16 : preset.sphereSegments;
  const showFull = lodRef.current === 0 && !isDimmed;
  const showMid = lodRef.current <= 1;

  return (
    <group ref={groupRef} position={node.position || [0, 0, 0]}>
      <Float speed={1.1} rotationIntensity={0.2} floatIntensity={0.28}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[size, segs, segs]} />
          {node.type === "project" && quality !== "performance" ? (
            <PlanetaryCoreShaderMaterial chroma={chroma} isSelected={isSelected} isDimmed={isDimmed} />
          ) : (
            <meshStandardMaterial
              color={chroma.primary}
              emissive={chroma.primary}
              emissiveIntensity={isSelected ? 0.95 : isDimmed ? 0.08 : 0.5}
              roughness={0.22}
              metalness={node.type === "technology" ? 0.85 : 0.55}
              transparent
              opacity={isDimmed ? 0.18 : 0.95}
            />
          )}
        </mesh>

        {isSelected && preset.transmission && showFull && (
          <mesh scale={1.18}>
            <sphereGeometry args={[size, 32, 32]} />
            <MeshTransmissionMaterial
              backside
              samples={quality === "cinematic" ? 6 : 3}
              thickness={0.2}
              chromaticAberration={0.05}
              anisotropy={0.1}
              distortion={0.12}
              color={chroma.primary}
              roughness={0.12}
              transmission={0.9}
            />
          </mesh>
        )}

        {showFull && node.type === "project" && (
          <AtmosphereHalo color={chroma.primary} radius={size} fresnelPower={isSelected ? 2.4 : 3.2} />
        )}

        {showFull && (node.isPinned || isSelected) && (
          <>
            <CryptographicLattice radius={size} color={chroma.accent} />
            <EquatorialTelemetryRing radius={size} color={chroma.primary} />
          </>
        )}

        {showMid && (
          <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <Text
              position={[0, size + 0.95, 0]}
              fontSize={node.type === "project" ? 0.55 : 0.38}
              maxWidth={8}
              color={isDimmed ? "#64748b" : "#f8fafc"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.06}
              outlineColor="#030508"
            >
              {node.name}
            </Text>
            {node.domain && !isDimmed && lodRef.current === 0 && (
              <Text
                position={[0, size + 0.55, 0]}
                fontSize={0.24}
                color={chroma.primary}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#030508"
              >
                {node.domain.toUpperCase()}
              </Text>
            )}
          </Billboard>
        )}

        {isSelected && (
          <Html center distanceFactor={18} className="pointer-events-none select-none">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#040406]/90 border border-white text-[9px] font-mono text-white uppercase tracking-widest whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.35)]">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
              FOCUS · {node.domain || node.type}
            </div>
          </Html>
        )}
      </Float>
    </group>
  );
});

export default WorldNode;
