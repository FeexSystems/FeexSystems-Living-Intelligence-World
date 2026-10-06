import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PresentationControls, Float, Edges } from "@react-three/drei";
import * as THREE from "three";

interface ProjectMini3DCardProps {
  domain?: string;
  isPinned?: boolean;
  color?: string;
}

function MiniArtifact({
  domain = "Intelligence",
  isPinned = false,
  color = "#ffffff",
}: ProjectMini3DCardProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.2;
    }
  });

  const dom = (domain || "").toLowerCase();

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.5}>
      <mesh ref={meshRef} scale={isPinned ? 1.05 : 0.9}>
        {dom.includes("health") ? (
          <icosahedronGeometry args={[1, 0]} />
        ) : dom.includes("finance") ? (
          <octahedronGeometry args={[1, 0]} />
        ) : dom.includes("research") ? (
          <torusKnotGeometry args={[0.65, 0.22, 48, 8]} />
        ) : (
          <dodecahedronGeometry args={[1, 0]} />
        )}
        <meshStandardMaterial
          color="#121212"
          roughness={0.2}
          metalness={0.85}
        />
        <Edges
          color={color}
          threshold={15}
          scale={1.002}
        />
      </mesh>
    </Float>
  );
}

export function ProjectMini3DCard({
  domain = "Intelligence",
  isPinned = false,
  color = "#ffffff",
  className = "",
}: ProjectMini3DCardProps & { className?: string }) {
  return (
    <div className={`relative h-28 w-full overflow-hidden select-none ${className}`}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[3, 3, 3]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-3, -3, -3]} intensity={0.6} color="#ffffff" />
        
        <PresentationControls
          global={false}
          cursor={true}
          snap={true}
          speed={1.6}
          zoom={1}
          polar={[-Math.PI / 4, Math.PI / 4]}
          azimuth={[-Math.PI / 4, Math.PI / 4]}
          config={{ mass: 1, tension: 170, friction: 26 }}
        >
          <MiniArtifact domain={domain} isPinned={isPinned} color={color} />
        </PresentationControls>
      </Canvas>
    </div>
  );
}

export default ProjectMini3DCard;
