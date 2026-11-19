import { useMemo } from "react";
import { Color } from "three";
import type { HumanoidVisualProps } from "./ParticleHumanoid";
import { HumanoidAnimationController } from "./HumanoidAnimationController";

/** Procedural mechanical presentation. No external GLB or unverified asset rights. */
export function MechanicalHumanoid({
  animation,
  reducedMotion = false,
  accentColor = "#8cf5d2",
}: HumanoidVisualProps) {
  const accent = useMemo(() => new Color(accentColor), [accentColor]);

  return (
    <HumanoidAnimationController animation={animation} reducedMotion={reducedMotion}>
      <group position={[0, -0.12, 0]}>
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[0.42, 0.42, 0.38]} />
          <meshStandardMaterial color="#1a252d" metalness={0.82} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[0.58, 0.72, 0.32]} />
          <meshStandardMaterial color="#26343d" metalness={0.76} roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.56, 0.2]}>
          <boxGeometry args={[0.22, 0.045, 0.025]} />
          <meshBasicMaterial color={accent} />
        </mesh>
        <mesh position={[-0.4, 0.9, 0]} rotation={[0, 0, -0.12]}>
          <cylinderGeometry args={[0.075, 0.095, 0.62, 8]} />
          <meshStandardMaterial color={accent} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[0.4, 0.9, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.075, 0.095, 0.62, 8]} />
          <meshStandardMaterial color={accent} metalness={0.7} roughness={0.28} />
        </mesh>
        <mesh position={[-0.16, 0.2, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.62, 8]} />
          <meshStandardMaterial color="#26343d" metalness={0.7} roughness={0.32} />
        </mesh>
        <mesh position={[0.16, 0.2, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.62, 8]} />
          <meshStandardMaterial color="#26343d" metalness={0.7} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.9, 0.18]}>
          <boxGeometry args={[0.18, 0.2, 0.035]} />
          <meshBasicMaterial color={accent} />
        </mesh>
        <pointLight position={[0, 1.2, 0.55]} color={accent} intensity={0.25} distance={2.4} />
      </group>
    </HumanoidAnimationController>
  );
}
