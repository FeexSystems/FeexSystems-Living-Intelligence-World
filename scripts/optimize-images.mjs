import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const IMAGES = [
  'public/media/feex/feex-architecture-board.jpeg',
  'public/media/feex/yurrhealer-lab.jpg',
  'public/media/feex/kappaxchangefin-ledger.jpg',
  'public/media/feex/holokai-guardians-armor.jpeg',
  'public/media/feex/ai-neural-core.jpg',
  'public/media/feex/sonik-audio-dsp.jpg',
  'public/media/feex/rental-paradise-architecture.jpg',
  'docs/brand-assets/screenshots/world-screenshot.png',
  'docs/brand-assets/screenshots/navigator-screenshot.png',
  'docs/brand-assets/screenshots/projects-screenshot.png',
  'docs/brand-assets/screenshots/showcase-carousel-slider.png',
];

async function optimize(relPath) {
  const fullPath = join(ROOT, relPath);
  const inputBuffer = readFileSync(fullPath);
  const before = inputBuffer.length;

  let outputBuffer;
  if (relPath.endsWith('.jpg') || relPath.endsWith('.jpeg')) {
    outputBuffer = await sharp(inputBuffer)
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();
  } else if (relPath.endsWith('.png')) {
    outputBuffer = await sharp(inputBuffer)
      .png({ compressionLevel: 9, effort: 10, palette: true, quality: 80 })
      .toBuffer();
  }

  if (outputBuffer && outputBuffer.length < before) {
    writeFileSync(fullPath, outputBuffer);
    console.log(`Optimized ${relPath}: ${(before/1024).toFixed(1)} KB -> ${(outputBuffer.length/1024).toFixed(1)} KB (saved ${( (before - outputBuffer.length)/1024 ).toFixed(1)} KB)`);
  } else {
    console.log(`Kept ${relPath}: already optimal (${(before/1024).toFixed(1)} KB)`);
  }
}

async function main() {
  for (const img of IMAGES) {
    try {
      await optimize(img);
    } catch (e) {
      console.error(`Error on ${img}:`, e.message);
    }
  }
}

main();
