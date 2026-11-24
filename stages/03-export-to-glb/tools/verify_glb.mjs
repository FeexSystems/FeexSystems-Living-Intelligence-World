import { NodeIO } from '@gltf-transform/core';

// Usage: node verify_glb.mjs <path/to/model.glb> [requiredAnimName] [--mesh <name>]
const args = process.argv.slice(2);
const glbPath = args[0];
const requiredAnim = args[1] && !args[1].startsWith('--') ? args[1] : 'Idles_Breathing';
const meshFlagIdx = args.indexOf('--mesh');
const requiredMesh = meshFlagIdx !== -1 ? args[meshFlagIdx + 1] : null;

if (!glbPath) {
  console.error('Usage: node verify_glb.mjs <path/to/model.glb> [requiredAnimName] [--mesh <name>]');
  process.exit(2);
}

const io = new NodeIO();
const doc = await io.read(glbPath);
const root = doc.getRoot();

// 1. Check required animation clip
const animNames = root.listAnimations().map((a) => a.getName());
if (requiredAnim && !animNames.includes(requiredAnim)) {
  console.error(`FAIL: Missing required animation "${requiredAnim}". Found: [${animNames.join(', ')}]`);
  process.exit(1);
}

// 2. Check morph targets across mesh primitives
let totalMorphTargets = 0;
const meshesWithMorphs = [];

for (const mesh of root.listMeshes()) {
  const meshName = mesh.getName() || '<unnamed>';
  if (requiredMesh && meshName !== requiredMesh) continue;

  let meshTargets = 0;
  for (const prim of mesh.listPrimitives()) {
    meshTargets += prim.listTargets().length;
  }
  if (meshTargets > 0) {
    meshesWithMorphs.push(`${meshName}:${meshTargets}`);
    totalMorphTargets += meshTargets;
  }
}

if (requiredMesh && meshesWithMorphs.length === 0) {
  console.error(`FAIL: Mesh "${requiredMesh}" not found or carries no morph targets.`);
  process.exit(1);
}

if (totalMorphTargets === 0) {
  console.error('FAIL: No morph targets found on any mesh primitive.');
  process.exit(1);
}

console.log(
  `PASS: animations=[${animNames.join(', ')}], morphTargets=${totalMorphTargets} (${meshesWithMorphs.join(', ')})`
);
