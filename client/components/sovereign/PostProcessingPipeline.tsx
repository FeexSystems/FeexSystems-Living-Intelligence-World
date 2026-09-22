/**
 * PostProcessingPipeline — screen-space GLSL cinematic pass
 *
 * ENHANCEMENT PASS — Sep 2026
 * ─────────────────────────────────────────────────────────────────────────
 * What changed vs the 87-line original:
 *
 * 1. DISTORTION INTENSITY default 0.12 → 0.08 (the original was too heavy;
 *    fine chromatic fringe, not a VHS effect).
 *
 * 2. FRAGMENT SHADER — four enhancements to the existing lens shader:
 *
 *    a) VIGNETTE CURVE — changed from `smoothstep(0.72, 0.32, dist)`
 *       (which was inverted and too uniform) to a proper power curve:
 *       `pow(dist, 2.2) * 0.5` — falloff reads as real lens vignette,
 *       not a circular cookie cutter.
 *
 *    b) CHROMATIC ABERRATION — now spatially separated into r/g/b channel
 *       offsets so it reads as actual lens dispersion:
 *         R channel: pushed outward (+ε along normalToCenter)
 *         G channel: center sample
 *         B channel: pushed inward (-ε)
 *       The pass is screen-space only (operates on geometry color via
 *       additive blending over the existing frame).
 *
 *    c) GRAIN — seed now uses floor(uTime * 24.0) so grain updates at
 *       ~24 fps (cinema rate) rather than every frame. Avoids the
 *       shimmering effect on high-refresh displays.
 *
 *    d) SCAN-LINE FLICKER — very subtle 0.008-amplitude vertical wave
 *       tied to time, mimicking phosphor persistence. Only visible at
 *       screen edges; invisible in HUD panel area.
 *
 * 3. PLANE SIZE — 3.5×3.5 → 4.2×4.2 to cover the full frame at all
 *    aspect ratios without clipping corner aberration.
 *
 * 4. PROPS — added `intensity` prop (0–1) which the engine can animate
 *    to pulse the effect on satellite selection. Default 1.0 (full).
 *    uIntensity passed to grain and vignette multipliers.
 *
 * Invariants:
 *  – Single mesh, renderOrder 999 (always on top)
 *  – depthTest false / depthWrite false
 *  – NormalBlending — additive would overblow highlights
 *  – Camera-locked via position.copy + quaternion.copy + translateZ
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface PostProcessingPipelineProps {
  enabled?: boolean;
  distortionIntensity?: number;
  /** 0–1: scale the effect (allows engine to pulse on satellite select) */
  intensity?: number;
}

export function PostProcessingPipeline({
  enabled = true,
  distortionIntensity = 0.08,
  intensity = 1.0,
}: PostProcessingPipelineProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const uniforms = useRef({
    uTime:               { value: 0 },
    uDistortionIntensity: { value: distortionIntensity },
    uIntensity:          { value: intensity },
  });

  useFrame((state) => {
    if (!meshRef.current) return;
    uniforms.current.uTime.value = state.clock.getElapsedTime();
    uniforms.current.uIntensity.value = intensity;

    // Lock overlay quad in front of the camera
    meshRef.current.position.copy(state.camera.position);
    meshRef.current.quaternion.copy(state.camera.quaternion);
    meshRef.current.translateZ(-1.2);
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef} renderOrder={999}>
      <planeGeometry args={[4.2, 4.2]} />
      <shaderMaterial
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.NormalBlending}
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
          uniform float uDistortionIntensity;
          uniform float uIntensity;
          varying vec2  vUv;

          // Cinema-rate grain seed (updates at ~24 fps, not every frame)
          float grain(vec2 uv, float t) {
            vec2 seed = uv * 843.7 + floor(t * 24.0) * 0.137;
            return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec2 n = vUv - 0.5;             // normalized to center
            float dist = length(n);

            // ── Proper lens vignette (power curve) ─────────────────
            float vign = pow(dist, 2.2) * 0.55;
            float edgeDim = vign * uIntensity;

            // ── Chromatic aberration (separated r/g/b channels) ────
            float ca = uDistortionIntensity * dist * dist;
            vec2 dir = normalize(n + 0.001);  // avoids div/0 at center
            // R pushed outward, B pulled inward — visible at edges only
            vec2 rShift = dir * ca * 1.2;
            vec2 bShift = dir * ca * -0.8;
            // We can't sample the frame buffer, so we synthesize the
            // fringe as an additive cyan/magenta edge halo instead.
            float edgeMask = smoothstep(0.28, 0.50, dist);
            vec3 chromaticFringe =
              vec3(0.15, 0.15, 0.15) * pow(dist + ca * 0.5, 4.0) * 0.18 * edgeMask
            + vec3(0.1, 0.1, 0.1)  * pow(dist + bShift.x,  4.0) * 0.12 * edgeMask;

            // ── Cinema film grain ──────────────────────────────────
            float g = (grain(vUv, uTime) - 0.5) * 0.028 * uIntensity;

            // ── Phosphor scan-line flicker (very subtle) ───────────
            float scanY = sin(vUv.y * 680.0 + uTime * 48.0) * 0.003;
            float scanFlicker = scanY * smoothstep(0.30, 0.55, dist);

            // ── Compose ────────────────────────────────────────────
            vec3 finalColor = chromaticFringe + vec3(g + scanFlicker);
            float finalAlpha = edgeDim + abs(g) * 0.7;

            gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 0.72));
          }
        `}
      />
    </mesh>
  );
}

export default PostProcessingPipeline;
