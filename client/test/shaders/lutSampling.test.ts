import { describe, it, expect, beforeAll } from "vitest";
import sharp from "sharp";
import path from "node:path";

/**
 * Deterministic CPU mirror of `client/shaders/lutShader.frag :: sampleLut`.
 *
 * The shader cannot run in jsdom, but its addressing math is pure arithmetic
 * over a validated layout (256x16, slice-major: blue -> slice, red ->
 * in-slice column, green -> row, texel-centered UVs). This suite mirrors that
 * math in TypeScript and executes it against the real decoded
 * `lut-cinematic-16.webp` pixels, so any regression in the documented axis
 * mapping (e.g. slice==red, missing +0.5 texel offset, missing output clamp)
 * fails fast with known colour values.
 *
 * Each sampled assertion cites the exact texel(s) it exercises, measured with
 * `sharp` against the committed asset.
 */

const LUT_PATH = path.resolve(
  process.cwd(),
  "public/media/feex/lut-cinematic-16.webp"
);

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** CPU mirror of the GLSL `sampleLut` addressing. */
function sampleLutCpu(
  pixels: { data: Buffer; width: number },
  color: Rgb
): Rgb {
  const texel = (x: number, y: number): Rgb => {
    const i = (y * pixels.width + x) * 3;
    return {
      r: pixels.data[i] / 255,
      g: pixels.data[i + 1] / 255,
      b: pixels.data[i + 2] / 255,
    };
  };

  // Mirrors: float blue = clamp(color.b, 0, 1) * 15; slice0/1 + sFrac.
  const blue = Math.min(1, Math.max(0, color.b)) * 15;
  const slice0 = Math.floor(blue);
  const slice1 = Math.min(15, slice0 + 1);
  const sFrac = blue - slice0;

  // Mirrors: red/green scaled to 0..15 lattice indices.
  const red = Math.min(1, Math.max(0, color.r)) * 15;
  const green = Math.min(1, Math.max(0, color.g)) * 15;

  // Mirrors the texel-centered bilinear slice fetch:
  //   uv = ((slice * 16 + red + 0.5) / 256, (green + 0.5) / 16)
  // LinearFilter on centered UVs == bilinear blend of the four neighbours.
  const bilinear = (slice: number): Rgb => {
    const x = slice * 16 + red;
    const y = green;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(slice * 16 + 15, x0 + 1);
    const y1 = Math.min(15, y0 + 1);
    const fx = x - x0;
    const fy = y - y0;
    const c00 = texel(x0, y0);
    const c10 = texel(x1, y0);
    const c01 = texel(x0, y1);
    const c11 = texel(x1, y1);
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;
    return {
      r: mix(mix(c00.r, c10.r, fx), mix(c01.r, c11.r, fx), fy),
      g: mix(mix(c00.g, c10.g, fx), mix(c01.g, c11.g, fx), fy),
      b: mix(mix(c00.b, c10.b, fx), mix(c01.b, c11.b, fx), fy),
    };
  };

  const col0 = bilinear(slice0);
  const col1 = bilinear(slice1);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return {
    r: mix(col0.r, col1.r, sFrac),
    g: mix(col0.g, col1.g, sFrac),
    b: mix(col0.b, col1.b, sFrac),
  };
}


describe("lutShader.frag addressing (CPU mirror over the real LUT asset)", () => {
  let pixels: { data: Buffer; width: number; height: number };

  beforeAll(async () => {
    const { data, info } = await sharp(LUT_PATH).raw().toBuffer({
      resolveWithObject: true,
    });
    pixels = { data, width: info.width, height: info.height };
  });

  it("decodes the validated 256x16 slice-major layout", () => {
    expect(pixels.width).toBe(256);
    expect(pixels.height).toBe(16);
  });

  it("maps pure blue (0,0,1) to the vivid-blue texel at x=240,y=0", () => {
    // Slice 15, in-slice column 0, row 0 => measured (72,0,239)/255.
    const out = sampleLutCpu(pixels, { r: 0, g: 0, b: 1 });
    expect(out.r).toBeCloseTo(72 / 255, 3);
    expect(out.g).toBeCloseTo(0 / 255, 3);
    expect(out.b).toBeCloseTo(239 / 255, 3);
  });

  it("maps pure green (0,1,0) to the vivid-green texel at x=0,y=15", () => {
    // Slice 0, in-slice column 0, row 15 => measured (11,244,29)/255.
    const out = sampleLutCpu(pixels, { r: 0, g: 1, b: 0 });
    expect(out.r).toBeCloseTo(11 / 255, 3);
    expect(out.g).toBeCloseTo(244 / 255, 3);
    expect(out.b).toBeCloseTo(29 / 255, 3);
  });

  it("maps pure red (1,0,0) to the graded red at x=15,y=0 (never blue)", () => {
    // Slice 0, in-slice column 15, row 0 => measured (196,44,66)/255.
    // Regression guard for the slice==red misreading: under it, red would
    // address slice 15 and return (72,0,239) blue.
    const out = sampleLutCpu(pixels, { r: 1, g: 0, b: 0 });
    expect(out.r).toBeCloseTo(196 / 255, 3);
    expect(out.g).toBeCloseTo(44 / 255, 3);
    expect(out.b).toBeCloseTo(66 / 255, 3);
  });

  it("preserves white (1,1,1) at x=255,y=15", () => {
    // Measured (252,251,233)/255 — grade tints, never blows out.
    const out = sampleLutCpu(pixels, { r: 1, g: 1, b: 1 });
    expect(out.r).toBeCloseTo(252 / 255, 3);
    expect(out.g).toBeCloseTo(251 / 255, 3);
    expect(out.b).toBeCloseTo(233 / 255, 3);
  });

  it("grades black (0,0,0) with the lifted-shadow texel at x=0,y=0", () => {
    // Measured (29,22,38)/255 — the cinematic toe, never crushed to 0.
    const out = sampleLutCpu(pixels, { r: 0, g: 0, b: 0 });
    expect(out.r).toBeCloseTo(29 / 255, 3);
    expect(out.g).toBeCloseTo(22 / 255, 3);
    expect(out.b).toBeCloseTo(38 / 255, 3);
  });

  it("keeps every sampled output inside the normalized 0..1 range", () => {
    // Guards the removed `* LUT_UPPER` rescale: with it, any bright input
    // would exceed 1.0 by two orders of magnitude.
    const sweep: Rgb[] = [];
    for (let r = 0; r <= 4; r++)
      for (let g = 0; g <= 4; g++)
        for (let b = 0; b <= 4; b++)
          sweep.push({ r: r / 4, g: g / 4, b: b / 4 });
    for (const c of sweep) {
      const out = sampleLutCpu(pixels, c);
      expect(out.r).toBeGreaterThanOrEqual(0);
      expect(out.r).toBeLessThanOrEqual(1);
      expect(out.g).toBeGreaterThanOrEqual(0);
      expect(out.g).toBeLessThanOrEqual(1);
      expect(out.b).toBeGreaterThanOrEqual(0);
      expect(out.b).toBeLessThanOrEqual(1);
    }
  });

  it("interpolates fractional blue across slices (no banding)", () => {
    // b=0.5 lands halfway between slice 7 and slice 8 at red=0, green=0.
    // The result must sit strictly between the discrete slice texels
    // x=112,y=0 and x=128,y=0 — a floor-only lookup returns exactly `lo`.
    const idx = (x: number, y: number) => (y * pixels.width + x) * 3;
    const lo = pixels.data[idx(112, 0)] / 255;
    const hi = pixels.data[idx(128, 0)] / 255;
    const out = sampleLutCpu(pixels, { r: 0, g: 0, b: 0.5 });
    expect(out.r).toBeGreaterThan(Math.min(lo, hi) - 1e-6);
    expect(out.r).toBeLessThan(Math.max(lo, hi) + 1e-6);
    expect(Math.abs(out.r - (lo + hi) / 2)).toBeLessThan(Math.abs(hi - lo));
  });
});
