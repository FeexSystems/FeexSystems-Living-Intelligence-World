/**
 * FEEX EIL — ParticleField  (Renderer plane)
 *
 * GPU point-sprite particle cloud driven entirely by a
 * HumanoidAnimationProfile. All animation parameters come from the
 * canonical AgentState mapping — this component renders state, it does
 * not decide it.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  PARTICLE_FRAG,
  PARTICLE_VERT,
} from "./shaders/humanoidParticles";
import type { HumanoidAnimationProfile } from "./animation-profile";

const MAX_PARTICLES = 4000;

interface ParticleFieldProps {
  profile: HumanoidAnimationProfile;
  /** Particle count. Clamped to MAX_PARTICLES. Default 1400. */
  count?: number;
  /** Ellipsoid radii [x, y, z]. Default humanoid-ish vertical form. */
  radii?: [number, number, number];
  /** Uniform time offset so multiple fields don't pulse in sync. */
  phase?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ParticleField({
  profile,
  count = 1400,
  radii = [0.9, 1.5, 0.9],
  phase = 0,
}: ParticleFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const safeCount = Math.min(Math.max(1, Math.floor(count)), MAX_PARTICLES);

  const geometry = useMemo(() => {
    const rand = mulberry32(1337);
    const positions = new Float32Array(safeCount * 3);
    const seeds = new Float32Array(safeCount);
    const sizes = new Float32Array(safeCount);

    for (let i = 0; i < safeCount; i++) {
      // Uniform-ish sampling inside ellipsoid via rejection on unit sphere.
      let x = 0;
      let y = 0;
      let z = 0;
      let len = 0;
      do {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        z = rand() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(rand()); // volume-uniform radius
      const s = Math.sqrt(len);
      positions[i * 3] = (x / s) * r * radii[0];
      positions[i * 3 + 1] = (y / s) * r * radii[1];
      positions[i * 3 + 2] = (z / s) * r * radii[2];
      seeds[i] = rand();
      sizes[i] = 0.06 + rand() * 0.14;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [safeCount, radii[0], radii[1], radii[2]]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: profile.speed },
      uAmplitude: { value: profile.amplitude },
      uFlowBias: { value: profile.flowBias },
      uMotion: { value: profile.state === "OFFLINE" ? 0 : 1 },
      uGlow: { value: profile.glow },
      uCoreColor: { value: new THREE.Color(profile.coreColor) },
      uAccentColor: { value: new THREE.Color(profile.accentColor) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- profile fields are primitives; color objects rebuilt on profile identity change only
    [profile],
  );

  const targetCore = useMemo(
    () => new THREE.Color(profile.coreColor),
    [profile.coreColor],
  );
  const targetAccent = useMemo(
    () => new THREE.Color(profile.accentColor),
    [profile.accentColor],
  );

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;
    // uTime advances at profile.speed so OFFLINE (speed 0) is truly frozen.
    mat.uniforms.uTime.value =
      state.clock.elapsedTime * profile.speed + phase;
    mat.uniforms.uSpeed.value = profile.speed;
    mat.uniforms.uAmplitude.value = profile.amplitude;
    mat.uniforms.uFlowBias.value = profile.flowBias;
    mat.uniforms.uGlow.value = profile.glow;
    mat.uniforms.uMotion.value = profile.state === "OFFLINE" ? 0 : 1;
    (mat.uniforms.uCoreColor.value as THREE.Color).copy(targetCore);
    (mat.uniforms.uAccentColor.value as THREE.Color).copy(targetAccent);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
