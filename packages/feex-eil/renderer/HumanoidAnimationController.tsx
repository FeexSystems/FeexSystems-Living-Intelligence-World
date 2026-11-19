import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import type { HumanoidAnimationState } from "./HumanoidStateAdapter";

export interface HumanoidAnimationControllerProps {
  animation: HumanoidAnimationState;
  reducedMotion?: boolean;
  children: ReactNode;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener?.("change", onChange);
  return () => media.removeEventListener?.("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

/**
 * Deterministic, state-driven presentation controller.
 * It owns no renderer, clock, RAF loop, or perception source.
 * Invalidates the host when continuous animation runs under frameloop="demand".
 */
export function HumanoidAnimationController({
  animation,
  reducedMotion,
  children,
}: HumanoidAnimationControllerProps) {
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const systemReducedMotion = useSystemReducedMotion();
  const motionSuppressed = reducedMotion ?? systemReducedMotion;

  useFrame(({ clock }, delta) => {
    const target = group.current;
    if (!target) return;

    if (motionSuppressed || !animation.animated) {
      target.position.y = 0;
      target.rotation.y = 0;
      target.scale.setScalar(1);
      return;
    }

    const time = clock.elapsedTime;
    const speed = Math.min(delta, 0.05);
    const breath = Math.sin(time * 1.35) * 0.012 * animation.intensity;
    const attentive = animation.motion === "listening" ? 0.035 : 0;
    const perceiving = animation.motion === "perceiving" ? Math.sin(time * 2.4) * 0.012 : 0;
    const thinking = animation.motion === "thinking" ? 0.018 : 0;
    const responding = animation.motion === "responding" ? Math.sin(time * 1.8) * 0.009 : 0;
    const speaking = animation.motion === "speaking" ? Math.sin(time * 7) * 0.012 : 0;
    const executing = animation.motion === "executing" ? Math.sin(time * 2.2) * 0.018 : 0;
    const error = animation.motion === "error" ? Math.sin(time * 3.5) * 0.012 : 0;

    target.position.y += (breath + perceiving + responding + speaking + executing - target.position.y) * Math.min(1, speed * 5);
    target.rotation.y += (Math.sin(time * 0.45) * attentive + thinking + error - target.rotation.y) * Math.min(1, speed * 3);
    const pulse = 1 + Math.sin(time * 1.8) * 0.006 * animation.intensity;
    target.scale.setScalar(pulse);

    // R3F's demand loop sleeps until explicitly invalidated.
    invalidate();
  });

  return <group ref={group}>{children}</group>;
}
