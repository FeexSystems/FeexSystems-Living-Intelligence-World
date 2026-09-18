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

// Encode/decode the slice index so the blue axis keeps its low bits. Sampling
// the strip directly from (slice * 16) truncates the 4-bit fractional part of
// blue, collapsing every colour onto 16 discrete blue steps. The extra 1/641
// offset is the classic .png/.cube trick: 4 * 0.5 / (16 * 16.001) = 0.0078,
// which is rounded away on decode but survives the 8-bit PNG encode.
const float LUT_UPPER = 16.001 * 16.0 - 1.0;
const float LUT_INDEX = 0.0078;

vec4 sampleLut(vec3 color) {
  // 16x16x16 LUT formatted as a 256x16 strip (16 slices along X axis)
  float blue = clamp(color.b, 0.0, 1.0) * 15.0;

  float slice0 = floor(blue);
  float slice1 = min(15.0, slice0 + 1.0);
  float sFrac = fract(blue);

  // Coordinate calculations within the 256x16 strip texture
  float red = clamp(color.r, 0.0, 1.0);
  float green = clamp(color.g, 0.0, 1.0);

  // Within-slice coordinate: (red, green) scaled across the 16x16 slice.
  vec2 inSlice = vec2(red * 15.0, green * 15.0);

  vec4 col0 = textureClamped(uLutMap, vec2((slice0 * 16.0 + inSlice.x) * LUT_INDEX, inSlice.y * LUT_INDEX));
  vec4 col1 = textureClamped(uLutMap, vec2((slice1 * 16.0 + inSlice.x) * LUT_INDEX, inSlice.y * LUT_INDEX));

  // Undo the LUT_UPPER scale introduced by the encode trick above.
  return mix(col0, col1, sFrac) * LUT_UPPER;
}

void main() {
  // Sample video texture with aspect-ratio-corrected cover UV
  vec4 baseColor = texture2D(uTexture, vCoverUv);
  vec4 gradedColor = sampleLut(baseColor.rgb);
  gl_FragColor = vec4(mix(baseColor.rgb, gradedColor.rgb, clamp(uLutIntensity, 0.0, 1.0)), baseColor.a);
}
