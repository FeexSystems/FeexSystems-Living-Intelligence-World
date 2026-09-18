uniform vec4 uCoverTransform; // sx, sy, ox, oy
varying vec2 vUv;
varying vec2 vCoverUv;

void main() {
  vUv = uv;
  vCoverUv = uv * uCoverTransform.xy + uCoverTransform.zw;
  gl_Position = vec4(position, 1.0);
}
