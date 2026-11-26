#!/usr/bin/env node
// FEEX-SORL Phase 2 (procedural fallback) — inject FEEX_NOIR PBR material
// into Tripo GLBs that have zero materials, so they render graphite/
// titanium instead of default white in R3F. Skips files that already
// carry materials (e.g. the procedural observation deck).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'public/models/feex-sorl';
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
    simplifier: MeshoptSimplifier,
  });

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.glb')) yield p;
  }
}

for (const file of walk(ROOT)) {
  const doc = await io.read(file);
  const root = doc.getRoot();
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());
  if (prims.length === 0) { console.log('skip (no prims)', file); continue; }
  if (root.listMaterials().length > 0) { console.log('skip (has materials)', relative('.', file)); continue; }

  const mat = doc.createMaterial('M_SORL_Prop')
    .setBaseColorFactor([0.12, 0.12, 0.13, 1])   // graphite #1f1f21-ish
    .setMetallicFactor(0.55)
    .setRoughnessFactor(0.55);
  for (const p of prims) p.setMaterial(mat);
  await io.write(file, doc);
  console.log('injected', relative('.', file), statSync(file).size, 'bytes');
}
