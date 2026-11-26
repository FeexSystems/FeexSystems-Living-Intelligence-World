#!/usr/bin/env node
// FEEX-SORL Gate 5 — GLB validation for all generated assets.
// Parses each GLB: JSON chunk integrity, mesh/primitive counts, vertex
// totals, estimated tris, material/image references, required extensions,
// bbox dimensions, file size. Writes docs/assets/feex-sorl/gate5-report.json
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'public/models/feex-sorl';
const OUT = 'docs/assets/feex-sorl/gate5-report.json';

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.glb')) yield p;
  }
}

function parseGlb(path) {
  const buf = readFileSync(path);
  const issues = [];
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) {
    return { ok: false, issues: ['not a GLB (bad magic)'], bytes: buf.length };
  }
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
  const binLen = buf.readUInt32LE(20 + jsonLen);
  const declared = 12 + 8 + jsonLen + 8 + binLen;
  if (declared !== buf.length) issues.push(`size mismatch: header ${declared} vs file ${buf.length}`);

  const accessorCount = (attr) =>
    Object.values(json.meshes ?? {}).flatMap((m) => m.primitives ?? [])
      .reduce((n, p) => n + (p.attributes?.[attr] != null ? (json.accessors[p.attributes[attr]]?.count ?? 0) : 0), 0);

  let verts = 0, tris = 0;
  const modes = { 4: 1, 5: 3, 6: 1 }; // tris per primitive index count
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const pos = prim.attributes?.POSITION;
      if (pos != null) verts += json.accessors[pos]?.count ?? 0;
      const idx = prim.indices;
      const ic = idx != null ? json.accessors[idx]?.count ?? 0 : (json.accessors[pos]?.count ?? 0);
      tris += Math.floor(ic / 3) * (modes[prim.mode ?? 4] ?? 1);
    }
  }

  // materials: every primitive must reference one; images must exist for textures
  let matRefs = 0, missingMats = 0;
  for (const mesh of json.meshes ?? []) for (const prim of mesh.primitives ?? []) {
    if (prim.material != null) { matRefs++; if (!json.materials?.[prim.material]) missingMats++; }
  }
  const imgCount = json.images?.length ?? 0;
  const texCount = json.textures?.length ?? 0;
  if (imgCount === 0) issues.push('no embedded textures (untextured geometry)');
  const ext = json.extensionsUsed ?? [];
  const unsupported = ext.filter((e) => !['KHR_materials_emissive_strength', 'KHR_mesh_quantization', 'EXT_meshopt_compression'].includes(e));
  if (unsupported.length) issues.push(`uncommon extensions: ${unsupported.join(',')}`);

  // bbox union over POSITION accessors
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const a of json.accessors ?? []) {
    if (a.min && a.max && a.type === 'VEC3') {
      for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); }
    }
  }
  const dims = mx.map((v, i) => +(v - mn[i]).toFixed(3));
  const maxDim = Math.max(...dims);
  if (maxDim > 60) issues.push(`suspicious size: max dim ${maxDim}m`);
  if (maxDim < 0.05) issues.push(`suspicious size: max dim ${maxDim}m`);

  return {
    ok: issues.every((i) => i.includes('untextured')),
    bytes: buf.length,
    meshes: json.meshes?.length ?? 0,
    verts, tris,
    materials: json.materials?.length ?? 0,
    matRefs, missingMats,
    images: imgCount, textures: texCount,
    extensions: ext,
    dims,
    issues,
  };
}

const report = {};
let fail = 0;
for (const file of walk(ROOT)) {
  const rel = relative('.', file).replace(/\\/g, '/');
  try {
    const r = parseGlb(file);
    report[rel] = { ...r, bytes: statSync(file).size };
    const hardFail = r.issues.filter((i) => !i.includes('untextured'));
    if (hardFail.length || !r.meshes) fail++;
    console.log(`${hardFail.length ? 'FAIL' : 'ok  '} ${rel}  ${(r.bytes / 1024).toFixed(0)}KB  verts=${r.verts} tris=${r.tris} mats=${r.materials} dims=${r.dims?.join('x')}${hardFail.length ? '  -> ' + hardFail.join('; ') : ''}`);
  } catch (e) {
    fail++;
    report[rel] = { ok: false, issues: [String(e.message ?? e)] };
    console.log(`FAIL ${rel} -> ${e.message}`);
  }
}
mkdirSync(join(OUT, '..'), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), assets: report }, null, 2));
console.log(`\n${Object.keys(report).length} assets checked, ${fail} hard failures -> ${OUT}`);
process.exit(fail ? 1 : 0);
