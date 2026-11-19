import type { Object3D } from "three";

/**
 * Model-specific node names live in configuration, never in animation logic.
 * Only the root is required; optional facial/limb controls degrade gracefully.
 */
export interface HumanoidRigMap {
  head?: string;
  leftEye?: string;
  rightEye?: string;
  leftArm?: string;
  rightArm?: string;
}

export interface ResolvedHumanoidRig {
  root: Object3D;
  head?: Object3D;
  leftEye?: Object3D;
  rightEye?: Object3D;
  leftArm?: Object3D;
  rightArm?: Object3D;
}

export const DEFAULT_HUMANOID_RIG_MAP: Readonly<HumanoidRigMap> = Object.freeze({
  head: "Head",
  leftEye: "LeftEye",
  rightEye: "RightEye",
  leftArm: "LeftArm",
  rightArm: "RightArm",
});

/** Resolve optional rig nodes by configured names without hard-coded asset assumptions. */
export function resolveHumanoidRig(
  root: Object3D,
  mapping: HumanoidRigMap = DEFAULT_HUMANOID_RIG_MAP,
): ResolvedHumanoidRig {
  if (!root || typeof root.getObjectByName !== "function") {
    throw new Error("Humanoid rig requires a valid Three.js Object3D root");
  }

  const resolve = (name: string | undefined) =>
    name ? root.getObjectByName(name) : undefined;

  return {
    root,
    head: resolve(mapping.head),
    leftEye: resolve(mapping.leftEye),
    rightEye: resolve(mapping.rightEye),
    leftArm: resolve(mapping.leftArm),
    rightArm: resolve(mapping.rightArm),
  };
}
