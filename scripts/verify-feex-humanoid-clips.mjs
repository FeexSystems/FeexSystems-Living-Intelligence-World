#!/usr/bin/env node
/**
 * verify-feex-humanoid-clips.mjs
 *
 * Node-side GLB verification for the FEEX-SORL humanoid contract
 * (docs/program/FEEX-SORL-CHARACTER-CONTRACT.md).
 *
 * Usage:
 *   node scripts/verify-feex-humanoid-clips.mjs <path-to.glb>
 *
 * Exit 0 = all required clips + minimum morph targets present.
 * Exit 1 = missing items (listed). Exit 2 = unreadable/invalid GLB.
 *
 * Parses the GLB JSON chunk directly — no dependencies required.
 */

import { readFileSync } from "node:fs";

const REQUIRED_CLIPS = [
  "Idle", "Aware", "Listen", "Think", "Acknowledge", "Explain",
  "Inspect", "Point", "Walk", "Speak", "Unavailable",
];

const REQUIRED_MORPHS = [
  "EyeBlinkLeft", "EyeBlinkRight", "JawOpen",
  "MouthSmileLeft", "MouthSmileRight",
  "BrowInnerUp", "BrowDownLeft", "BrowDownRight",
  "EyeLookUpLeft", "EyeLookDownLeft",
  "EyeLookUpRight", "EyeLookDownRight",
];

function parseGlbJson(path) {
  const buf = readFileSync(path);
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) {
    throw new Error("not a GLB (bad magic)");
  }
  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error("first chunk is not JSON");
  return JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node verify-feex-humanoid-clips.mjs <file.glb>");
    process.exit(2);
  }

  let gltf;
  try {
    gltf = parseGlbJson(file);
  } catch (err) {
    console.error(`INVALID GLB: ${err.message}`);
    process.exit(2);
  }

  const errors = [];

  const clipNames = new Set((gltf.animations ?? []).map((a) => a.name));
  const missingClips = REQUIRED_CLIPS.filter((c) => !clipNames.has(c));
  if (missingClips.length) {
    errors.push(`missing clips: ${missingClips.join(", ")}`);
  }

  const morphNames = new Set();
  for (const mesh of gltf.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      // glTF stores morph target names in extras.targetNames per primitive.
      for (const n of prim.extras?.targetNames ?? []) morphNames.add(n);
    }
  }
  const missingMorphs = REQUIRED_MORPHS.filter((m) => !morphNames.has(m));
  if (missingMorphs.length) {
    errors.push(`missing morph targets: ${missingMorphs.join(", ")}`);
  }

  const skins = (gltf.skins ?? []).length;
  if (skins === 0) errors.push("no skins (rigid mesh?)");

  console.log(`INFO: clips=${clipNames.size} morphs=${morphNames.size} skins=${skins}`);

  if (errors.length) {
    for (const e of errors) console.error(`FAIL: ${e}`);
    process.exit(1);
  }
  console.log("VERIFICATION PASSED");
}

main();
