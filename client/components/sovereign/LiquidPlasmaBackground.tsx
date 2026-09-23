/**
 * LiquidPlasmaBackground — simplified monochromatic gradient shader
 *
 * NOIR REDESIGN PASS — Sep 2026
 * ─────────────────────────────────────────────────────────────────────────
 * Simplified from complex fBm nebula to performance-optimized grayscale
 * gradient for monochromatic noir aesthetic.
 *
 * Changes:
 * – Removed complex fBm fractal Brownian motion
 * – Removed phosphor green, teal, and crimson color bands
 * – Replaced with simple radial gradient (black to dark gray)
 * – Subtle white glow on mouse proximity for interactivity
 * – Performance: minimal shader operations, no texture fetches
 *
 * Invariants:
 *  – No texture fetches (zero asset deps)
 *  – depthTest false / depthWrite false (correct for background layer)
 *  – mesh at z=-10 (behind all scene objects)
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function LiquidPlasmaBackground() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useRef({
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
  });

  useFrame((state) => {
    uniforms.current.uTime.value = state.clock.getElapsedTime() * 0.1;
    uniforms.current.uMouse.value.lerp(
      new THREE.Vector2(
        state.pointer.x * 0.5 + 0.5,
        state.pointer.y * 0.5 + 0.5
      ),
      0.04
    );
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -10]}>
      <planeGeometry args={[50, 32]} />
      <shaderMaterial
        depthTest={false}
        depthWrite={false}
        uniforms={uniforms.current}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform vec2  uMouse;
          varying vec2  vUv;

          void main() {
            // ── Radial gradient from center ─────────────────────────
            float dist = length(vUv - 0.5);
            float gradient = smoothstep(0.0, 0.7, dist);

            // ── Monochromatic noir palette ────────────────────────
            vec3 voidColor = vec3(0.0, 0.0, 0.0);      // #000000
            vec3 deepColor = vec3(0.04, 0.04, 0.04);   // #0a0a0a
            vec3 midColor = vec3(0.1, 0.1, 0.1);       // #1a1a1a

            vec3 col = mix(voidColor, deepColor, gradient * 0.5);
            col = mix(col, midColor, gradient * gradient * 0.3);

            // ── Subtle white glow on mouse proximity ───────────────
            float mouseDist = distance(vUv, uMouse);
            float mouseGlow = 0.03 / (mouseDist * 8.0 + 0.15);
            col += vec3(1.0, 1.0, 1.0) * mouseGlow * 0.15;

            // ── Soft vignette ───────────────────────────────────────
            float vign = 1.0 - smoothstep(0.3, 0.8, dist * 1.5);
            col *= vign * 0.9 + 0.1;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export default LiquidPlasmaBackground;
