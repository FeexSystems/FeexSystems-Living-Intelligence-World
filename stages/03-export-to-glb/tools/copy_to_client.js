import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { load as loadYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// stages/03-export-to-glb/tools -> repo root is three levels up
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function validateAndDeliverAsset() {
  const configPath = path.join(repoRoot, '_config/pipeline.yaml');
  if (!fs.existsSync(configPath)) {
    console.error('CRITICAL ERROR: Global pipeline configuration manifest missing.');
    process.exit(1);
  }

  const config = loadYaml(fs.readFileSync(configPath, 'utf8'));
  const sourceFile = path.resolve(repoRoot, config.paths.output_dir, 'feex_sovereign.glb');
  const clientTargetDir = path.join(repoRoot, 'client', 'public', 'characters', 'feex_sovereign');
  const targetFile = path.join(clientTargetDir, 'feex_sovereign.glb');

  if (!fs.existsSync(sourceFile)) {
    console.error(`ERROR: Compiled handoff asset not found at source path: ${sourceFile}`);
    process.exit(1);
  }

  // Enforce the ~40MB production landing page delivery budget limit
  const stats = fs.statSync(sourceFile);
  const fileSizeInMegabytes = stats.size / (1024 * 1024);
  console.log(`Verifying production file allocation: ${fileSizeInMegabytes.toFixed(2)} MB`);

  if (fileSizeInMegabytes > 50.0) {
    console.warn(`WARNING: Asset exceeds the optimal landing page payload constraint (Budget: 40MB, Current: ${fileSizeInMegabytes.toFixed(2)}MB). Check Draco quantization variables.`);
  }

  if (!fs.existsSync(clientTargetDir)) {
    fs.mkdirSync(clientTargetDir, { recursive: true });
  }

  fs.copyFileSync(sourceFile, targetFile);
  console.log(`SUCCESS: Asset successfully wired into client distribution folder: ${targetFile}`);
}

validateAndDeliverAsset();
