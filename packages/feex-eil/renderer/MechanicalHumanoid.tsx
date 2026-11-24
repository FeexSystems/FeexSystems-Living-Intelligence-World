/**
 * FEEX EIL — MechanicalHumanoid  (Renderer plane)
 *
 * Geometric/wireframe humanoid alternative to the particle form.
 * Segmented primitives (head, torso, pelvis, limbs) with emissive
 * edges tinted by the profile accent. Rotation/bob amplitude follows
 * profile.speed; OFFLINE renders static and dim.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HumanoidAnimationProfile } from "./animation-profile";
import { HumanoidFace } from "./HumanoidFace";

interface MechanicalHumanoidProps {
  profile: HumanoidAnimationProfile;
  scale?: number;
}

export function MechanicalHumanoid({
  profile,
  scale = 1,
}: MechanicalHumanoidProps) {
  const rootRef = useRef<THREE.Group>(null);
  const accent = useMemoColor(profile.uiAccent);
  const dim = useMemoColor(profile.coreColor);
  const active = profile.state !== "OFFLINE" && profile.state !== "ERROR";

  useFrame((state) => {
    const g = rootRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime * profile.speed;
    // Idle sway + thinking vibration, scaled by amplitude.
    g.rotation.y = Math.sin(t * 0.4) * 0.15 * profile.amplitude;
    g.position.y =
      Math.sin(t * 1.2) * 0.04 * profile.amplitude +
      (profile.state === "EXECUTING" ? Math.abs(Math.sin(t * 6)) * 0.03 : 0);
  });

  const mat = (
    <meshStandardMaterial
      color="#111827"
      metalness={0.7}
      roughness={0.35}
      emissive={accent}
      emissiveIntensity={profile.glow * (active ? 0.6 : 0.15)}
    />
  );
  const edgeMat = (
    <lineBasicMaterial color={active ? accent : dim} transparent opacity={0.9} />
  );

  return (
    <group ref={rootRef} scale={scale}>
      {/* Head */}
      <mesh position={[0, 1.55, 0]}>
        <icosahedronGeometry args={[0.28, 1]} />
        {mat}
      </mesh>
      <HumanoidFace profile={profile} y={1.55} scale={0.55} />
      {/* Neck */}
      <mesh position={[0, 1.28, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.18, 8]} />
        {mat}
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.62, 0.7, 0.4]} />
        {mat}
      </mesh>
      {/* Pelvis */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.22, 0.36]} />
        {mat}
      </mesh>
      {/* Limbs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.42, 0.85, 0]} rotation={[0, 0, s * 0.15]}>
            <capsuleGeometry args={[0.07, 0.5, 4, 8]} />
            {mat}
          </mesh>
          <mesh position={[s * 0.16, 0.35, 0]} rotation={[0, 0, -s * 0.1]}>
            <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
            {mat}
          </mesh>
          {/* Joint nodes */}
          <mesh position={[s * 0.48, 0.55, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color={active ? accent : dim} />
          </mesh>
        </group>
      ))}
      {/* Wireframe overlay for mechanical read */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.66, 0.74, 0.44]} />
        <meshBasicMaterial wireframe transparent opacity={0.25} color={accent} />
      </mesh>
      {/* eslint-disable-next-line react/no-unknown-property -- lineSegments is a three.js intrinsic */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.66, 0.74, 0.44)]} />
        {edgeMat}
      </lineSegments>
      <lineSegments position={[0, 0.85, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(0.66, 0.74, 0.44)]} />
        {edgeMat}
      </lineSegments>
    </group>
  );
}

import { useMemo } from "react";
function useMemoColor(hex: string) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new THREE.Color(hex), [hex]);
}
