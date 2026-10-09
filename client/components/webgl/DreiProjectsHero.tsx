import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Edges, Stars, Html, Sparkles as DreiSparkles } from "@react-three/drei";
import * as THREE from "three";

function TopologyNode({
  position,
  color = "#ffffff",
  label: _label,
  speed = 1,
}: {
  position: [number, number, number];
  color?: string;
  label: string;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.4 * speed;
      meshRef.current.rotation.y += delta * 0.6 * speed;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color="#121212"
          roughness={0.2}
          metalness={0.85}
        />
        <Edges threshold={15} color={color} scale={1.002} />
      </mesh>
    </group>
  );
}

function ConnectingLines() {
  const points = [
    new THREE.Vector3(-3.2, 0.4, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(3.2, 0.4, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-1.6, -1.2, 0.5),
    new THREE.Vector3(1.6, -1.2, 0.5),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.25} />
    </lineSegments>
  );
}

export function DreiProjectsHero() {
  return (
    <div className="relative h-52 sm:h-64 w-full overflow-hidden border-b border-white/10 bg-[#000000]">
      {/* Background wireframe cross-hatching */}
      <div className="bg-diagonal-stripes absolute inset-0 opacity-10 pointer-events-none" />

      {/* Screen-space telemetry overlay badge */}
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase bg-[#121212]/90 px-2.5 py-1 border border-white/10 rounded-[10px] shadow-sm backdrop-blur-md">
          FEEX // ECOSYSTEM TOPOLOGY ACTIVE
        </span>
      </div>

      <div className="absolute top-4 right-6 z-10 hidden sm:flex items-center gap-2 text-[10px] font-mono text-white/40">
        <span>TOPOLOGY: 6 REPOSITORIES</span>
        <span className="text-white/20">|</span>
        <span>EVIDENCE: CANONICAL</span>
      </div>

      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[6, 6, 6]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-6, -6, -6]} intensity={1.0} color="#ffffff" />

        <Stars radius={40} depth={20} count={350} factor={3} saturation={0} fade speed={1} />
        <DreiSparkles count={30} scale={[10, 4, 10]} size={2} color="#ffffff" opacity={0.5} />

        <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
          <ConnectingLines />
          <TopologyNode position={[-3.2, 0.4, 0]} color="#ffffff" label="Persona OS" speed={1.1} />
          <TopologyNode position={[0, 0, 0]} color="#ffffff" label="FEEX Core" speed={0.9} />
          <TopologyNode position={[3.2, 0.4, 0]} color="#ffffff" label="Yurrheeler" speed={1.2} />
          <TopologyNode position={[-1.6, -1.2, 0.5]} color="#ffffff" label="KappaXchange" speed={0.8} />
          <TopologyNode position={[1.6, -1.2, 0.5]} color="#ffffff" label="HoloKai" speed={1.0} />

          {/* Screen-space HUD in 3D center */}
          <Html center distanceFactor={14} className="pointer-events-none select-none">
            <div className="px-3 py-1 rounded-[10px] bg-[#121212]/95 border border-white/20 backdrop-blur-xl shadow-2xl text-[10px] font-mono tracking-widest text-white uppercase whitespace-nowrap">
              Ecosystem Hub
            </div>
          </Html>
        </Float>
      </Canvas>
    </div>
  );
}

export default DreiProjectsHero;
