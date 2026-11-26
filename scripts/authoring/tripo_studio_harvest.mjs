#!/usr/bin/env node
// Harvest a Tripo Studio model: download signed model_url, decode meshopt,
// weld, simplify, write to public/models/feex-sorl/<zone>/<asset>.glb
// Usage: node scripts/authoring/tripo_studio_harvest.mjs <model_url> <zone> <asset-id> [simplify-ratio]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [url, zone, assetId, ratioArg] = process.argv.slice(2);
if (!url || !zone || !assetId) {
  console.error('usage: tripo_studio_harvest.mjs <model_url> <zone> <asset-id> [ratio]');
  process.exit(1);
}
const ratio = ratioArg ? parseFloat(ratioArg) : 0.1;

const res = await fetch(url);
if (!res.ok) { console.error('download failed', res.status); process.exit(1); }
const buf = Buffer.from(await res.arrayBuffer());
console.log('downloaded', (buf.length / 1024).toFixed(0), 'KB');

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
    simplifier: MeshoptSimplifier,
  });
const doc = await io.readBinary(new Uint8Array(buf));

await doc.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, error: 0.01, ratio })
);

const outDir = join('public', 'models', 'feex-sorl', zone);
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${assetId}.glb`);
await io.write(outPath, doc);
const bytes = statSync(outPath).size;

let verts = 0;
for (const mesh of doc.getRoot().listMeshes())
  for (const prim of mesh.listPrimitives()) verts += prim.getAttribute('POSITION')?.getCount() ?? 0;
console.log(JSON.stringify({ outPath, bytes, verts }));
