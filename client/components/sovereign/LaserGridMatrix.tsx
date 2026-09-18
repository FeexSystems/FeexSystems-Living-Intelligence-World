import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function LaserGridMatrix() {
  const shaderRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
      <planeGeometry args={[70, 70, 16, 16]} />
      <shaderMaterial
        ref={shaderRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#00f0ff") },
        }}
        vertexShader={`
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColor;
          varying vec3 vPosition;
          
          void main() {
            // Compute sharp grid line pathways using derivative screen-space anti-aliasing
            vec2 grid = abs(fract(vPosition.xy * 0.5 - 0.5) - 0.5) / fwidth(vPosition.xy * 0.5);
            float line = min(grid.x, grid.y);
            float gridIntensity = 1.0 - min(line, 1.0);
            
            // Generate rhythmic laser waves shooting across coordinates
            float wave = sin(vPosition.y * 0.2 - uTime * 4.0) * 0.5 + 0.5;
            wave = pow(wave, 16.0); // Sharpen into high-energy laser beams
            
            // Edge attenuation fadeout
            float edgeFade = 1.0 - smoothstep(12.0, 34.0, length(vPosition.xy));
            
            vec3 finalColor = uColor * (gridIntensity * 0.18 + wave * 0.85) * edgeFade;
            gl_FragColor = vec4(finalColor, finalColor.r > 0.005 ? 0.75 * edgeFade : 0.0);
          }
        `}
      />
    </mesh>
  );
}

export default LaserGridMatrix;
