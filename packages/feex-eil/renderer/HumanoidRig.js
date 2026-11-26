

/**
 * Model-specific node names live in configuration, never in animation logic.
 * Only the root is required; optional facial/limb controls degrade gracefully.
 */

















export const DEFAULT_HUMANOID_RIG_MAP = Object.freeze({
  head: "Head",
  leftEye: "LeftEye",
  rightEye: "RightEye",
  leftArm: "LeftArm",
  rightArm: "RightArm",
});

/** Resolve optional rig nodes by configured names without hard-coded asset assumptions. */
export function resolveHumanoidRig(
  root,
  mapping = DEFAULT_HUMANOID_RIG_MAP,
) {
  if (!root || typeof root.getObjectByName !== "function") {
    throw new Error("Humanoid rig requires a valid Three.js Object3D root");
  }

  const resolve = (name) =>
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
