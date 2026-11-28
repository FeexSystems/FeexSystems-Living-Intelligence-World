#!/usr/bin/env node
/**
 * glb_primitive_targetnames.mjs — copy mesh.extras.targetNames onto every
 * primitive's extras.targetNames (the FEEX verifier reads prim-level extras;
 * the Blender glTF exporter writes mesh-level). Rebuilds the GLB container.
 *
 * Usage: node glb_primitive_targetnames.mjs <in.glb> <out.glb>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error("usage: node glb_primitive_targetnames.mjs <in.glb> <out.glb>");
  process.exit(2);
}

const buf = readFileSync(inPath);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");

const jsonLen = buf.readUInt32LE(12);
const jsonType = buf.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) throw new Error("first chunk not JSON");
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));

let patched = 0;
for (const mesh of json.meshes ?? []) {
  const names = mesh.extras?.targetNames;
  if (!Array.isArray(names) || !names.length) continue;
  for (const prim of mesh.primitives ?? []) {
    prim.extras = { ...(prim.extras ?? {}), targetNames: names };
    patched++;
  }
}
console.log(`patched ${patched} primitives across ${json.meshes?.length ?? 0} meshes`);

// rebuild GLB: header + JSON chunk + remaining chunks verbatim
let jsonStr = JSON.stringify(json);
while (jsonStr.length % 4 !== 0) jsonStr += " ";
const jsonBuf = Buffer.from(jsonStr, "utf8");

const rest = buf.subarray(20 + jsonLen); // BIN chunk header+data (and any extras)
const total = 12 + 8 + jsonBuf.length + rest.length;
const out = Buffer.alloc(total);
out.writeUInt32LE(0x46546c67, 0);
out.writeUInt32LE(2, 4);
out.writeUInt32LE(total, 8);
out.writeUInt32LE(jsonBuf.length, 12);
out.writeUInt32LE(0x4e4f534a, 16);
jsonBuf.copy(out, 20);
rest.copy(out, 20 + jsonBuf.length);

writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${(total / 1024).toFixed(0)} KB)`);
