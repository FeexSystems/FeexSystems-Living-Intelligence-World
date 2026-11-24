import { useMemo } from "react";
import { Color } from "three";
import type { HumanoidAnimationState } from "./HumanoidStateAdapter";
import { HumanoidAnimationController } from "./HumanoidAnimationController";
import { HumanoidStateIndicator } from "./HumanoidStateIndicator";

export interface HumanoidVisualProps {
  animation: HumanoidAnimationState;
  reducedMotion?: boolean;
  accentColor?: string;
}

/** Procedural, asset-free humanoid silhouette for the FEEX renderer. */
export function ParticleHumanoid({
  animation,
  reducedMotion,
  accentColor = "#8cf5d2",
}: HumanoidVisualProps) {
  const accent = useMemo(() => new Color(accentColor), [accentColor]);

  return (
    <HumanoidAnimationController animation={animation} reducedMotion={reducedMotion}>
      <group position={[0, -0.15, 0]}>
        <HumanoidStateIndicator animation={animation} />
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.28, 20, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.28} roughness={0.38} />
        </mesh>
        <mesh position={[0, 0.88, 0]}>
          <capsuleGeometry args={[0.25, 0.62, 6, 12]} />
          <meshStandardMaterial color="#182b32" emissive="#163d3a" emissiveIntensity={0.18} metalness={0.35} roughness={0.48} />
        </mesh>
        <mesh position={[-0.36, 0.9, 0]} rotation={[0, 0, -0.18]}>
          <capsuleGeometry args={[0.085, 0.58, 5, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0.36, 0.9, 0]} rotation={[0, 0, 0.18]}>
          <capsuleGeometry args={[0.085, 0.58, 5, 8]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[-0.14, 0.18, 0]}>
          <capsuleGeometry args={[0.095, 0.58, 5, 8]} />
          <meshStandardMaterial color="#233941" metalness={0.25} roughness={0.55} />
        </mesh>
        <mesh position={[0.14, 0.18, 0]}>
          <capsuleGeometry args={[0.095, 0.58, 5, 8]} />
          <meshStandardMaterial color="#233941" metalness={0.25} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.55, 0.245]}>
          <sphereGeometry args={[0.035, 12, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <pointLight position={[0, 1.25, 0.5]} color={accentColor} intensity={0.22} distance={2.2} />
      </group>
    </HumanoidAnimationController>
  );
}
