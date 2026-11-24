import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { FeexSovereignHumanoid } from './FeexSovereign';

export default function StudioScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        alpha: false,
        outputColorSpace: THREE.SRGBColorSpace
      }}
      camera={{ position: [0, 1.2, 2.2], fov: 32 }}
    >
      <color attach="background" args={['#08080a']} />

      {/* Controlled Silver-White Cinematic Studio Lighting Rig Layout */}
      <ambientLight intensity={0.2} color="#ffffff" />

      <directionalLight
        position={[5, 5, 4]}
        intensity={2.0}
        color="#f0f4f8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />

      <directionalLight
        position={[-4, 2, -2]}
        intensity={1.5}
        color="#d2daf0"
      />

      <spotLight
        position={[0, 4, 2]}
        angle={0.3}
        penumbra={1}
        intensity={0.8}
        color="#ffffff"
      />

      <Suspense fallback={null}>
        <Stage
          intensity={0.5}
          environment="studio"
          shadows={{ type: 'contact', opacity: 0.6, blur: 2 }}
          adjustCamera={false}
        >
          <group position={[0, -0.85, 0]}>
            <FeexSovereignHumanoid />
          </group>
        </Stage>
        <Environment preset="neutral" intensity={0.2} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={1.2}
        maxDistance={3.5}
        minPolarAngle={Math.PI / 2.4}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}
