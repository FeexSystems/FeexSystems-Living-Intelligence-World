import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const MAX_DIM = 1920;
const QUALITY = 80;

async function processDirectory(relDir) {
  const dir = path.join(ROOT, relDir);
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  console.log(`\nScanning ${relDir}...`);

  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;

    const ext = path.extname(f).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

    try {
      const buf = fs.readFileSync(full);
      const meta = await sharp(buf).metadata();
      const beforeSize = buf.length;

      let transform = sharp(buf);
      let needsResize = false;

      if (meta.width > MAX_DIM || meta.height > MAX_DIM) {
        needsResize = true;
        transform = transform.resize({
          width: meta.width >= meta.height ? MAX_DIM : undefined,
          height: meta.height > meta.width ? MAX_DIM : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      let outputBuf;
      if (ext === '.webp') {
        outputBuf = await transform.webp({ quality: QUALITY, effort: 6 }).toBuffer();
      } else if (ext === '.jpg' || ext === '.jpeg') {
        outputBuf = await transform.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
      } else if (ext === '.png') {
        outputBuf = await transform.png({ compressionLevel: 9, effort: 10 }).toBuffer();
      }

      if (outputBuf && (outputBuf.length < beforeSize || needsResize)) {
        fs.writeFileSync(full, outputBuf);
        const savings = beforeSize - outputBuf.length;
        const pct = ((savings / beforeSize) * 100).toFixed(1);
        console.log(`  ✓ ${f}: ${(beforeSize / 1024).toFixed(0)} KB -> ${(outputBuf.length / 1024).toFixed(0)} KB (${meta.width}x${meta.height}${needsResize ? ' -> resized' : ''}, saved ${(savings / 1024).toFixed(0)} KB / ${pct}%)`);
      } else {
        console.log(`  • ${f}: already optimal (${(beforeSize / 1024).toFixed(0)} KB, ${meta.width}x${meta.height})`);
      }
    } catch (err) {
      console.error(`  ✗ ${f}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('=== FEEXSYSTEMS Comprehensive Image Optimization ===');
  await processDirectory('public/media/feex');
  await processDirectory('docs/brand-assets/screenshots');
  console.log('\nOptimization complete!');
}

main();
