/**
 * FEEX EIL — HumanoidFace  (Renderer plane)
 *
 * Minimal stylized face for the particle/mechanical humanoids: a visor
 * with two eye slits and a mouth bar. Mouth aperture is driven by
 * profile.amplitude × a speech envelope so SPEAKING visibly articulates
 * and OFFLINE stays closed.
 *
 * This is a renderer primitive — it takes an animation profile, never
 * an AgentState directly, so it cannot invent state.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HumanoidAnimationProfile } from "./animation-profile";

interface HumanoidFaceProps {
  profile: HumanoidAnimationProfile;
  /** Vertical position of the face inside the humanoid group. */
  y?: number;
  /** Overall scale. */
  scale?: number;
}

export function HumanoidFace({
  profile,
  y = 1.15,
  scale = 1,
}: HumanoidFaceProps) {
  const mouthRef = useRef<THREE.Mesh>(null);
  const eyesRef = useRef<THREE.Group>(null);
  const eyeColor = useMemo(() => new THREE.Color(profile.uiAccent), [profile.uiAccent]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speaking =
      profile.state === "SPEAKING" || profile.state === "RESPONDING";
    const rate = speaking ? 9 : profile.speed * 2;
    // Speech envelope: pseudo-phoneme oscillation, clamped.
    const openness = speaking
      ? 0.15 + 0.55 * Math.abs(Math.sin(t * rate)) * profile.amplitude
      : 0.05 + 0.1 * Math.sin(t * 0.8) * profile.amplitude;
    if (mouthRef.current) {
      mouthRef.current.scale.y = THREE.MathUtils.clamp(openness, 0.02, 1);
    }
    if (eyesRef.current) {
      // Eyes dim toward OFFLINE/ERROR palettes automatically via color,
      // and blink occasionally while awake.
      const blink =
        profile.state === "OFFLINE"
          ? 0.4
          : Math.sin(t * 0.7) > 0.985
            ? 0.15
            : 1;
      eyesRef.current.scale.y = blink;
    }
  });

  const mouthColor =
    profile.state === "ERROR" ? "#f87171" : profile.uiAccent;

  return (
    <group position={[0, y, 0]} scale={scale}>
      {/* Visor band */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.72, 0.34, 0.08]} />
        <meshBasicMaterial color="#0b0f1a" transparent opacity={0.85} />
      </mesh>
      {/* Eyes */}
      <group ref={eyesRef} position={[0, 0.14, 0.05]}>
        <mesh position={[-0.18, 0, 0]}>
          <planeGeometry args={[0.16, 0.05]} />
          <meshBasicMaterial color={eyeColor} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <planeGeometry args={[0.16, 0.05]} />
          <meshBasicMaterial color={eyeColor} />
        </mesh>
      </group>
      {/* Mouth */}
      <mesh ref={mouthRef} position={[0, -0.08, 0.05]}>
        <planeGeometry args={[0.34, 0.06]} />
        <meshBasicMaterial color={mouthColor} />
      </mesh>
    </group>
  );
}
