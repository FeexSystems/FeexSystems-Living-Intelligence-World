import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LiquidPlasmaBackground } from './LiquidPlasmaBackground';
import { PostProcessingPipeline } from './PostProcessingPipeline';

function GlowingGlobe() {
  const globeRef = useRef<THREE.Mesh>(null);
  const streamRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.002;
      globeRef.current.rotation.x += 0.001;
    }
    if (streamRef.current) {
      streamRef.current.rotation.y += 0.002;
      streamRef.current.rotation.x += 0.001;
      (streamRef.current.material as THREE.ShaderMaterial).uniforms.time.value = state.clock.elapsedTime;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y -= 0.003;
    }
  });

  const streamMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(0x00ff88) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      varying vec2 vUv;
      
      float rand(vec2 co){
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }
      
      void main() {
        float speed = 1.5;
        
        // Create moving packets along longitude (vUv.x) and latitude (vUv.y)
        float bandX = fract(vUv.x * 30.0 - time * speed);
        float bandY = fract(vUv.y * 30.0 + time * speed * 1.2);
        
        // Randomly activate some bands to look like sparse data streams
        float activeX = step(0.9, rand(vec2(floor(vUv.x * 30.0), 1.0)));
        float activeY = step(0.9, rand(vec2(1.0, floor(vUv.y * 30.0))));
        
        float packetX = smoothstep(0.6, 1.0, bandX) * activeX;
        float packetY = smoothstep(0.6, 1.0, bandY) * activeY;
        
        float intensity = max(packetX, packetY);
        
        gl_FragColor = vec4(color, intensity * 0.9);
      }
    `,
    transparent: true,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }), []);

  return (
    <group>
      {/* Base Wireframe */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1.8, 48, 48]} />
        <meshBasicMaterial color={0xffffff} wireframe transparent opacity={0.05} />
      </mesh>
      
      {/* Data Stream Wireframe Overlay */}
      <mesh ref={streamRef}>
        <sphereGeometry args={[1.802, 48, 48]} />
        <primitive object={streamMaterial} attach="material" />
      </mesh>

      {/* Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color={0x111111} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const particlesCount = 800;

  const positions = useMemo(() => {
    const arr = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      const radius = 2.2 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      arr[i] = radius * Math.cos(phi) * Math.cos(theta);
      arr[i + 1] = radius * Math.sin(phi);
      arr[i + 2] = radius * Math.cos(phi) * Math.sin(theta);
    }
    return arr;
  }, [particlesCount]);

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.001;
      pointsRef.current.rotation.z -= 0.0005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={0xffffff} size={0.02} transparent opacity={0.4} />
    </points>
  );
}

export function SovereignScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <LiquidPlasmaBackground />
      <GlowingGlobe />
      <ParticleSystem />
      <PostProcessingPipeline />
    </Canvas>
  );
}

export default SovereignScene;
