import sharp from 'sharp';
import fs from 'fs';

const files = [
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
  'docs/brand-assets/screenshots/showcase-carousel-slider.png'
];

for (const f of files) {
  if (fs.existsSync(f)) {
    const meta = await sharp(f).metadata();
    const stat = fs.statSync(f);
    console.log(`${f}: ${meta.width}x${meta.height}, ${Math.round(stat.size / 1024)} KB, format=${meta.format}`);
  } else {
    console.log(`Not found: ${f}`);
  }
}
