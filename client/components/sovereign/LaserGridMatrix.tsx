import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sonikAudio } from "../../lib/sonikAudio";

export interface LaserGridMatrixProps {
  audioIntensity?: number;
}

export function LaserGridMatrix({ audioIntensity }: LaserGridMatrixProps = {}) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      const currentAudio = audioIntensity !== undefined ? audioIntensity : sonikAudio.getAudioEnergy();
      shaderRef.current.uniforms.uAudioIntensity.value = currentAudio;
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
          uAudioIntensity: { value: 0 },
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
          uniform float uAudioIntensity;
          uniform vec3 uColor;
          varying vec3 vPosition;
          
          void main() {
            // Compute sharp grid line pathways using derivative screen-space anti-aliasing
            vec2 grid = abs(fract(vPosition.xy * 0.5 - 0.5) - 0.5) / fwidth(vPosition.xy * 0.5);
            float line = min(grid.x, grid.y);
            float gridIntensity = 1.0 - min(line, 1.0);
            
            // Modulate laser wave frequency and propagation speed dynamically with DSP audio energy
            float laserFreq = 0.2 + uAudioIntensity * 0.45;
            float laserSpeed = 4.0 + uAudioIntensity * 8.0;
            float wave = sin(vPosition.y * laserFreq - uTime * laserSpeed) * 0.5 + 0.5;
            
            // Sharpen into high-energy laser beams with dynamic exponent
            float sharpness = mix(16.0, 6.0, clamp(uAudioIntensity, 0.0, 1.0));
            wave = pow(wave, sharpness);
            
            // Edge attenuation fadeout
            float edgeFade = 1.0 - smoothstep(12.0, 34.0, length(vPosition.xy));
            
            // Modulate beam luminescence and color saturation with audio energy
            float luminescence = (gridIntensity * (0.18 + uAudioIntensity * 0.4) + wave * (0.85 + uAudioIntensity * 1.6)) * edgeFade;
            vec3 finalColor = uColor * luminescence;
            
            // Reactive audio flare tint
            if (uAudioIntensity > 0.3) {
              finalColor += vec3(0.3, 0.0, 0.5) * (uAudioIntensity - 0.3) * wave;
            }
            
            gl_FragColor = vec4(finalColor, finalColor.r > 0.005 ? 0.75 * edgeFade : 0.0);
          }
        `}
      />
    </mesh>
  );
}

export default LaserGridMatrix;

