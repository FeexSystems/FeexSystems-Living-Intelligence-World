/**
 * FEEX EIL — ParticleHumanoid  (Renderer plane)
 *
 * Particle-form humanoid: an ellipsoid ParticleField for the body plus
 * a HumanoidFace visor. Pure presentation — state arrives via
 * HumanoidAnimationProfile.
 */

import type { HumanoidAnimationProfile } from "./animation-profile";
import { ParticleField } from "./ParticleField";
import { HumanoidFace } from "./HumanoidFace";

interface ParticleHumanoidProps {
  profile: HumanoidAnimationProfile;
  /** Overall scale. Default 1. */
  scale?: number;
  /** Particle budget. Default 1400, hard-capped inside ParticleField. */
  particleCount?: number;
}

export function ParticleHumanoid({
  profile,
  scale = 1,
  particleCount = 1400,
}: ParticleHumanoidProps) {
  return (
    <group scale={scale}>
      {/* Body cloud — vertically elongated ellipsoid reads as a torso. */}
      <ParticleField
        profile={profile}
        count={particleCount}
        radii={[0.85, 1.35, 0.7]}
        phase={0}
      />
      {/* Denser core for head region. */}
      <group position={[0, 1.35, 0]}>
        <ParticleField
          profile={profile}
          count={Math.floor(particleCount * 0.3)}
          radii={[0.42, 0.4, 0.42]}
          phase={2.1}
        />
      </group>
      <HumanoidFace profile={profile} y={1.42} scale={0.9} />
    </group>
  );
}
