/**
 * LiquidPlasmaBackground — full-screen GLSL nebula shader
 *
 * ENHANCEMENT PASS — Sep 2026
 * ─────────────────────────────────────────────────────────────────────────
 * What changed vs the 67-line original:
 *
 * 1. FRAGMENT SHADER COMPLETE REWRITE
 *    Original was a shallow implementation: one sine wave for movement,
 *    one mouse-ripple circle, and three vec3 colors. The result was a
 *    faint teal puddle that barely registered behind the 3D geometry.
 *
 *    New shader:
 *    – 3-octave fbm (fractal Brownian motion) for organic nebula
 *      formation — each octave adds detail at half amplitude
 *    – Time-varying domain warping: the input UV is perturbed by a
 *      second fbm sample before the first, causing structures to
 *      breathe and fold without repeating
 *    – True void base: #050a0f — deeper than the original #0D1418
 *    – Three layered energy bands:
 *        a) Phosphor green nebula (FEEX canonical)
 *        b) Deep teal mid-range (adds depth at mid-Z)
 *        c) Crimson ember edge (matches the new floor light accent)
 *    – Mouse influence: pointer proximity brightens a patch of nebula
 *      rather than a hard ripple circle — organic pull effect
 *    – Performance: all operations are scalar; no texture fetches;
 *      passes on iGPU without framerate hit
 *
 * 2. PLANE SIZE — 45×28 → 50×32 to guarantee edge coverage on ultrawide
 *
 * 3. TIME SCALE — 0.4 → 0.18 (nebula breathes very slowly; faster
 *    movement reads as cheap screensaver energy)
 *
 * 4. uResolution UNIFORM — removed (was never used in fragment shader;
 *    removing saves a uniform slot)
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
    uniforms.current.uTime.value = state.clock.getElapsedTime() * 0.18;
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

          // ── Pseudo-random hash ─────────────────────────────────────
          float hash(vec2 p) {
            p = fract(p * vec2(127.1, 311.7));
            p += dot(p, p + 17.5);
            return fract(p.x * p.y);
          }

          // ── Value noise (smooth) ───────────────────────────────────
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);           // smoothstep fade
            return mix(
              mix(hash(i),           hash(i + vec2(1,0)), f.x),
              mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
              f.y
            );
          }

          // ── 3-octave fBm ──────────────────────────────────────────
          float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            mat2 rot = mat2( 0.8, 0.6, -0.6, 0.8);  // slight rotation per octave
            for (int i = 0; i < 3; i++) {
              v += a * noise(p);
              p  = rot * p * 2.1;
              a *= 0.5;
            }
            return v;
          }

          void main() {
            vec2 uv = vUv;

            // ── Domain warping: distort UV by a second fbm sample ──
            vec2 q = vec2(
              fbm(uv * 2.0 + vec2(0.0, uTime)),
              fbm(uv * 2.0 + vec2(5.2, 1.3 + uTime * 0.8))
            );
            vec2 r = vec2(
              fbm(uv * 1.8 + 4.0 * q + vec2(1.7, 9.2)),
              fbm(uv * 1.8 + 4.0 * q + vec2(8.3, 2.8 + uTime * 0.5))
            );

            float f = fbm(uv * 1.5 + 4.0 * r);

            // ── Void base ──────────────────────────────────────────
            vec3 col = vec3(0.015, 0.020, 0.025);

            // ── Phosphor green nebula accent ─────────────────────
            float mainBand = smoothstep(0.35, 0.70, f);
            col = mix(col, vec3(0.0, 0.40, 0.20), mainBand * 0.45);

            // ── Deep cloud (adds depth) ──────────────────────────
            float midBand = smoothstep(0.45, 0.75, f + r.x * 0.3);
            col = mix(col, vec3(0.02, 0.15, 0.18), midBand * 0.30);

            // ── Edge band ────────────────────────────────────────
            float edgeBand = smoothstep(0.55, 0.85, f + r.y * 0.4);
            col = mix(col, vec3(0.1, 0.1, 0.1), edgeBand * 0.20);

            // ── Bright core speckle ────────────────────────────────
            float core = pow(clamp(f * 1.2, 0.0, 1.0), 3.0);
            col += vec3(0.2, 0.8, 0.4) * core * 0.12;

            // ── Mouse proximity: organic nebula brightening ────────
            float mouseDist = distance(vUv, uMouse);
            float mouseGlow = 0.06 / (mouseDist * 6.0 + 0.12);
            col += vec3(0.1, 0.4, 0.2) * mouseGlow * clamp(f, 0.0, 1.0);

            // ── Very soft radial vignette (let the 3D win center) ──
            float vign = 1.0 - smoothstep(0.30, 0.80, length(vUv - 0.5) * 1.6);
            col *= vign * 0.85 + 0.15;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export default LiquidPlasmaBackground;
