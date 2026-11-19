import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { HumanoidAnimationState } from "./HumanoidStateAdapter";

export interface HumanoidAnimationControllerProps {
  animation: HumanoidAnimationState;
  reducedMotion?: boolean;
  children: ReactNode;
}

/**
 * Deterministic, state-driven presentation controller.
 * It owns no renderer, clock, RAF loop, or perception source.
 */
export function HumanoidAnimationController({
  animation,
  reducedMotion = false,
  children,
}: HumanoidAnimationControllerProps) {
  const group = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    const target = group.current;
    if (!target) return;

    if (reducedMotion || !animation.animated) {
      target.position.y = 0;
      target.rotation.y = 0;
      target.scale.setScalar(1);
      return;
    }

    const time = clock.elapsedTime;
    const speed = Math.min(delta, 0.05);
    const breath = Math.sin(time * 1.35) * 0.012 * animation.intensity;
    const attentive = animation.motion === "listening" ? 0.035 : 0;
    const thinking = animation.motion === "thinking" ? 0.018 : 0;
    const speaking = animation.motion === "speaking" ? Math.sin(time * 7) * 0.012 : 0;
    const executing = animation.motion === "executing" ? Math.sin(time * 2.2) * 0.018 : 0;
    const error = animation.motion === "error" ? Math.sin(time * 3.5) * 0.012 : 0;

    target.position.y += (breath + speaking + executing - target.position.y) * Math.min(1, speed * 5);
    target.rotation.y += (Math.sin(time * 0.45) * attentive + thinking + error - target.rotation.y) * Math.min(1, speed * 3);
    const pulse = 1 + Math.sin(time * 1.8) * 0.006 * animation.intensity;
    target.scale.setScalar(pulse);
  });

  return <group ref={group}>{children}</group>;
}
