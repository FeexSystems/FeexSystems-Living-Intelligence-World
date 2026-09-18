import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function LiquidPlasmaBackground() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useRef({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uResolution: {
      value: new THREE.Vector2(
        typeof window !== "undefined" ? window.innerWidth : 1920,
        typeof window !== "undefined" ? window.innerHeight : 1080
      ),
    },
  });

  useFrame((state) => {
    uniforms.current.uTime.value = state.clock.getElapsedTime() * 0.4;
    uniforms.current.uMouse.value.lerp(
      new THREE.Vector2(state.pointer.x, state.pointer.y),
      0.05
    );
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -10]}>
      <planeGeometry args={[45, 28]} />
      <shaderMaterial
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uMouse;
          varying vec2 vUv;
          
          void main() {
            vec2 uv = vUv;
            // Create organic cellular fluid currents
            float movement = sin(uv.x * 4.0 + uTime) * cos(uv.y * 4.0 - uTime) * 0.2;
            uv += movement;
            
            float distToMouse = distance(vUv, uMouse * 0.5 + 0.5);
            float mouseRipple = 0.03 / (distToMouse + 0.04);
            
            // Cybernetic color gradient matching FeexSystems dark tech aesthetic
            vec3 darkSpace = vec3(0.005, 0.008, 0.015);
            vec3 neonMatrix = vec3(0.0, 0.65, 0.95) * mouseRipple;
            vec3 systemPulse = vec3(0.93, 0.0, 0.33) * (sin(uTime + uv.x * 10.0) * 0.02 + 0.02);
            
            gl_FragColor = vec4(darkSpace + neonMatrix + systemPulse, 1.0);
          }
        `}
        uniforms={uniforms.current}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default LiquidPlasmaBackground;
