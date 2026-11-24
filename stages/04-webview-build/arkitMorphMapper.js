/**
 * Cached morph-target index resolver.
 *
 * GLB morph target names arrive in three possible shapes:
 *   1. Exact ARKit camelCase names        (jawOpen, eyeBlinkLeft, ...)
 *   2. Pipeline ordinal names             (ARK_Pose_00 ... ARK_Pose_51)
 *   3. Unprefixed positional keys         (handled via shapeOrder index)
 *
 * Resolution priority per canonical shape name:
 *   a) exact key in morphTargetDictionary
 *   b) ARK_Pose_<k> where k = index of the shape in PIPELINE_ARKIT_ORDER
 *      (padded or unpadded)
 *
 * PIPELINE_ARKIT_ORDER mirrors stages/01-unreal-glb-export ARKIT_SHAPES —
 * the order Stage 02 writes ARK_Pose_XX keys in. If the Blender export order
 * ever changes, update this array to match or ordinal fallback will misalign.
 */

export const PIPELINE_ARKIT_ORDER = [
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
  "cheekPuff", "cheekSquintLeft", "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight",
  "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft",
  "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
  "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose", "mouthDimpleLeft",
  "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft",
  "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight",
  "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower",
  "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
  "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSquintRight", "tongueOut"
];

const POSE_KEY_RE = /^ARK_Pose_(\d+)$/;

function isValidIndex(v) {
  return Number.isInteger(v) && v >= 0;
}

/**
 * Build a one-time { [arkitShapeName]: morphTargetIndex } lookup for a mesh.
 * Safe to call per mesh; do NOT call inside useFrame.
 *
 * @param {Object<string, number>} morphTargetDictionary  three.js morphTargetDictionary
 * @param {string[]} [shapeOrder]  canonical shape order (defaults to pipeline order)
 * @returns {Object<string, number>}
 */
export function resolveMorphIndices(morphTargetDictionary, shapeOrder = PIPELINE_ARKIT_ORDER) {
  const dict = morphTargetDictionary || {};
  const indices = {};

  const canonicalIndex = {};
  shapeOrder.forEach((name, i) => {
    canonicalIndex[name] = i;
  });

  const dictKeys = Object.keys(dict);
  const hasPoseKeys = dictKeys.some((k) => POSE_KEY_RE.test(k));

  let ordinalUsed = false;
  let exactCount = 0;

  for (const name of shapeOrder) {
    // 1) Exact ARKit name match
    if (isValidIndex(dict[name])) {
      indices[name] = dict[name];
      exactCount += 1;
      continue;
    }

    // 2) Ordinal fallback via ARK_Pose_XX
    if (hasPoseKeys) {
      const k = canonicalIndex[name];
      const padded = `ARK_Pose_${String(k).padStart(2, '0')}`;
      const raw = `ARK_Pose_${k}`;
      const idx = isValidIndex(dict[padded]) ? dict[padded]
                : isValidIndex(dict[raw]) ? dict[raw]
                : undefined;
      if (idx !== undefined) {
        indices[name] = idx;
        ordinalUsed = true;
        continue;
      }
    }
  }

  if (ordinalUsed) {
    console.warn(
      `[arkitMorphMapper] Morph targets resolved via ARK_Pose_XX ordinal fallback ` +
      `(${exactCount} exact / ${Object.keys(indices).length} total). ` +
      `Verify Stage 02 export order matches PIPELINE_ARKIT_ORDER.`
    );
  }

  return indices;
}
