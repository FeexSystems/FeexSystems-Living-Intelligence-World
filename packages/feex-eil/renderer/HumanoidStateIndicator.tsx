import type { HumanoidAnimationState } from "./HumanoidStateAdapter";

const INDICATOR_COLORS = {
  attention: "#8cf5d2",
  perception: "#35d8ff",
  cognition: "#9c8cff",
  response: "#6da7ff",
  speech: "#dc8cff",
  task: "#ffb45e",
  error: "#ff5268",
  offline: "#7c8792",
} as const;

/** Persistent, state-specific visual marker. It does not imply sensor capability. */
export function HumanoidStateIndicator({
  animation,
}: {
  animation: HumanoidAnimationState;
}) {
  if (animation.indicator === "none") return null;

  const color = INDICATOR_COLORS[animation.indicator];

  return (
    <group name={`feex-state-indicator-${animation.indicator}`} position={[0, 2.05, 0]}>
      <mesh>
        <torusGeometry args={[0.19, 0.025, 8, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.055, 12, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
