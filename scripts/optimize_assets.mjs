import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const jpegTargets = [
  { file: 'public/media/feex/yurrhealer-lab.jpg', maxDim: 1920, quality: 80 },
  { file: 'public/media/feex/rental-paradise-architecture.jpg', maxDim: 1920, quality: 80 },
  { file: 'public/media/feex/sonik-audio-dsp.jpg', maxDim: 1920, quality: 80 },
  { file: 'public/media/feex/ai-neural-core.jpg', maxDim: 1920, quality: 80 },
  { file: 'public/media/feex/kappaxchangefin-ledger.jpg', maxDim: 1920, quality: 80 },
  { file: 'public/media/feex/feex-architecture-board.jpeg', maxDim: 1280, quality: 78 },
  { file: 'public/media/feex/holokai-guardians-armor.jpeg', maxDim: 1280, quality: 78 },
];

const pngTargets = [
  { file: 'docs/brand-assets/screenshots/world-screenshot.png' },
  { file: 'docs/brand-assets/screenshots/navigator-screenshot.png' },
  { file: 'docs/brand-assets/screenshots/projects-screenshot.png' },
  { file: 'docs/brand-assets/screenshots/showcase-carousel-slider.png' },
];

async function optimizeJpeg(target) {
  const { file, maxDim, quality } = target;
  if (!fs.existsSync(file)) {
    console.log(`Skipping missing file: ${file}`);
    return;
  }
  const originalSize = fs.statSync(file).size;
  const image = sharp(file);
  const meta = await image.metadata();

  let transform = sharp(file);
  if (meta.width > maxDim || meta.height > maxDim) {
    transform = transform.resize({
      width: meta.width >= meta.height ? maxDim : undefined,
      height: meta.height > meta.width ? maxDim : undefined,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  const tempFile = file + '.tmp.jpg';
  await transform
    .jpeg({
      quality,
      progressive: true,
      mozjpeg: true
    })
    .toFile(tempFile);

  const newSize = fs.statSync(tempFile).size;
  fs.renameSync(tempFile, file);

  const savings = Math.round((originalSize - newSize) / 1024);
  const pct = Math.round(((originalSize - newSize) / originalSize) * 100);
  console.log(`[JPEG] ${file}: ${Math.round(originalSize / 1024)} KB -> ${Math.round(newSize / 1024)} KB (${pct}% reduction, saved ${savings} KB)`);
}

async function optimizePng(target) {
  const { file } = target;
  if (!fs.existsSync(file)) {
    console.log(`Skipping missing file: ${file}`);
    return;
  }
  const originalSize = fs.statSync(file).size;
  const tempFile = file + '.tmp.png';

  await sharp(file)
    .png({
      compressionLevel: 9,
      palette: true,
      quality: 85,
      effort: 10
    })
    .toFile(tempFile);

  const newSize = fs.statSync(tempFile).size;
  if (newSize < originalSize) {
    fs.renameSync(tempFile, file);
    const savings = Math.round((originalSize - newSize) / 1024);
    const pct = Math.round(((originalSize - newSize) / originalSize) * 100);
    console.log(`[PNG]  ${file}: ${Math.round(originalSize / 1024)} KB -> ${Math.round(newSize / 1024)} KB (${pct}% reduction, saved ${savings} KB)`);
  } else {
    fs.unlinkSync(tempFile);
    console.log(`[PNG]  ${file}: Already optimal (${Math.round(originalSize / 1024)} KB)`);
  }
}

async function main() {
  console.log('Starting image asset optimization...');
  for (const t of jpegTargets) {
    await optimizeJpeg(t);
  }
  for (const t of pngTargets) {
    await optimizePng(t);
  }
  console.log('Optimization complete.');
}

main().catch(console.error);
