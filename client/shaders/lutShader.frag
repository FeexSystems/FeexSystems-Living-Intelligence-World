uniform sampler2D uTexture;
uniform sampler2D uLutMap;
uniform float uLutIntensity;
varying vec2 vUv;
varying vec2 vCoverUv;

// Clamp extrapolated UVs to the inside of the strip so the LinearFilter
// sampler never bleeds across a slice boundary.
vec4 textureClamped(sampler2D map, vec2 uv) {
  vec2 texel = vec2(1.0 / 256.0, 1.0 / 16.0);
  vec2 safeUv = clamp(uv, texel * 0.5, vec2(1.0) - texel * 0.5);
  return texture2D(map, safeUv);
}

// Validated LUT addressing for `lut-cinematic-16.webp` (256x16, slice-major),
// verified texel-by-texel against the decoded asset:
//
//   channel  axis                indices
//   blue     slice along X       slice s occupies x in [s*16, s*16+15]
//   red      in-slice column     x = s*16 + red*15  (red rises left-to-right)
//   green    row                 y = green*15       (green rises top-to-bottom)
//
// Spot checks: pure blue (0,0,1) -> x=240,y=0 = (72,0,239) vivid blue;
// pure green (0,1,0) -> x=0,y=15 = (11,244,29) vivid green;
// white (1,1,1) -> x=255,y=15 = (252,251,233). A slice==red reading would
// map pure red to (72,0,239) blue, which rules it out.
//
// The +0.5 texel-center offset is required: the texture uses LinearFilter,
// so sampling at integer texel borders would straddle slices and bleed one
// slice's grade into its neighbour. Texels are plain 8-bit values already
// in 0..1 — there is no encode trick to undo, so no rescale is applied.

vec4 sampleLut(vec3 color) {
  // 16x16x16 LUT formatted as a 256x16 strip (16 slices along X axis)
  float blue = clamp(color.b, 0.0, 1.0) * 15.0;

  float slice0 = floor(blue);
  float slice1 = min(15.0, slice0 + 1.0);
  float sFrac = fract(blue);

  // Coordinate calculations within the 256x16 strip texture
  float red = clamp(color.r, 0.0, 1.0) * 15.0;
  float green = clamp(color.g, 0.0, 1.0) * 15.0;

  vec2 uv0 = vec2((slice0 * 16.0 + red + 0.5) / 256.0, (green + 0.5) / 16.0);
  vec2 uv1 = vec2((slice1 * 16.0 + red + 0.5) / 256.0, (green + 0.5) / 16.0);

  // Trilinear-equivalent lookup: bilinear within each slice (free via
  // LinearFilter on texel-centered UVs) plus a manual lerp across the
  // neighbouring blue slice for the fractional blue component.
  return mix(textureClamped(uLutMap, uv0), textureClamped(uLutMap, uv1), sFrac);
}

void main() {
  // Sample video texture with aspect-ratio-corrected cover UV
  vec4 baseColor = texture2D(uTexture, vCoverUv);
  vec4 gradedColor = sampleLut(baseColor.rgb);
  gl_FragColor = vec4(mix(baseColor.rgb, gradedColor.rgb, clamp(uLutIntensity, 0.0, 1.0)), baseColor.a);
}
