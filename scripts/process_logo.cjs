const sharp = require('sharp');
const path = require('path');

async function processLogos() {
  const bannerInput = path.resolve(__dirname, '../public/media/brand/Feexsystems_horizontal_banner_logo_20260927064611.jpg');
  const bannerOutput = path.resolve(__dirname, '../public/media/brand/Feexsystems_horizontal_banner_logo_transparent.png');
  const fxInput = path.resolve(__dirname, '../public/media/brand/FX_logo_monochrome_noir_20260927064550.jpg');
  const fxOutput = path.resolve(__dirname, '../public/media/brand/FX_logo_monochrome_noir_transparent.png');

  // ==========================================
  // 1. PROCESS HORIZONTAL BANNER LOGO
  // ==========================================
  console.log('Processing banner logo...');
  const bannerSharp = sharp(bannerInput);
  const { data: bRaw, info: bInfo } = await bannerSharp
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Add 16px padding around the detected bounds: 186..1188, 301..466
  const cropX = Math.max(0, 186 - 16);
  const cropY = Math.max(0, 301 - 16);
  const cropW = Math.min(bInfo.width - cropX, (1188 - 186) + 32);
  const cropH = Math.min(bInfo.height - cropY, (466 - 301) + 32);

  console.log(`Cropping banner to: ${cropX}, ${cropY}, ${cropW}x${cropH}`);

  const croppedBuffer = await sharp(bannerInput)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cData = croppedBuffer.data;
  const cInfo = croppedBuffer.info;

  // Now perform high-precision background removal on the cropped area
  for (let i = 0; i < cData.length; i += 4) {
    const r = cData[i];
    const g = cData[i + 1];
    const b = cData[i + 2];
    const maxVal = Math.max(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Background thresholding
    if (lum < 32 && maxVal < 40) {
      cData[i + 3] = 0; // Fully transparent
    } else if (lum < 75 && maxVal < 85) {
      // Smooth anti-aliased edge
      const factor = (lum - 32) / (75 - 32);
      const alpha = Math.round(factor * 255);
      cData[i + 3] = Math.min(255, Math.max(0, alpha));
    } else {
      cData[i + 3] = 255;
    }
  }

  await sharp(cData, {
    raw: {
      width: cInfo.width,
      height: cInfo.height,
      channels: 4,
    },
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(bannerOutput);

  console.log(`Banner logo written to ${bannerOutput} (${cInfo.width}x${cInfo.height})`);

  // ==========================================
  // 2. PROCESS MONOCHROME FX MARK
  // ==========================================
  console.log('Processing FX mark...');
  const { data: fxRaw, info: fxInfo } = await sharp(fxInput)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`FX mark original dimensions: ${fxInfo.width}x${fxInfo.height}`);

  let fxMinX = fxInfo.width, fxMaxX = 0, fxMinY = fxInfo.height, fxMaxY = 0;
  for (let y = 0; y < fxInfo.height; y++) {
    for (let x = 0; x < fxInfo.width; x++) {
      const idx = (y * fxInfo.width + x) * 4;
      const r = fxRaw[idx];
      const g = fxRaw[idx + 1];
      const b = fxRaw[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 50) {
        if (x < fxMinX) fxMinX = x;
        if (x > fxMaxX) fxMaxX = x;
        if (y < fxMinY) fxMinY = y;
        if (y > fxMaxY) fxMaxY = y;
      }
    }
  }

  console.log(`FX mark bounds: X: ${fxMinX}..${fxMaxX}, Y: ${fxMinY}..${fxMaxY}`);

  const pad = 24;
  const fX = Math.max(0, fxMinX - pad);
  const fY = Math.max(0, fxMinY - pad);
  const fW = Math.min(fxInfo.width - fX, (fxMaxX - fxMinX) + pad * 2);
  const fH = Math.min(fxInfo.height - fY, (fxMaxY - fxMinY) + pad * 2);

  const croppedFx = await sharp(fxInput)
    .extract({ left: fX, top: fY, width: fW, height: fH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const fData = croppedFx.data;
  const fInfo = croppedFx.info;

  for (let i = 0; i < fData.length; i += 4) {
    const r = fData[i];
    const g = fData[i + 1];
    const b = fData[i + 2];
    const maxVal = Math.max(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum < 30 && maxVal < 38) {
      fData[i + 3] = 0;
    } else if (lum < 65 && maxVal < 75) {
      const factor = (lum - 30) / (65 - 30);
      fData[i + 3] = Math.round(Math.min(255, Math.max(0, factor * 255)));
    } else {
      fData[i + 3] = 255;
    }
  }

  await sharp(fData, {
    raw: {
      width: fInfo.width,
      height: fInfo.height,
      channels: 4,
    },
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(fxOutput);

  console.log(`FX mark written to ${fxOutput} (${fInfo.width}x${fInfo.height})`);

  // Ensure FX mark is an exact square (e.g. 512x512)
  const squareFxPath = path.resolve(__dirname, '../public/media/brand/FX_logo_square_transparent.png');
  await sharp(fxOutput)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(squareFxPath);

  // Generate favicon.png as well
  await sharp(squareFxPath)
    .resize(64, 64)
    .png()
    .toFile(path.resolve(__dirname, '../public/favicon.png'));

  console.log('Square FX mark created. Now generating favicon.ico...');
  const pngToIcoModule = await import('png-to-ico');
  const pngToIco = pngToIcoModule.default;
  const icoBuf = await pngToIco(squareFxPath);
  require('fs').writeFileSync(path.resolve(__dirname, '../public/favicon.ico'), icoBuf);
  console.log('Favicon.ico successfully generated!');
}

processLogos().catch(console.error);
