/**
 * FEEX EIL — Particle humanoid shaders.
 *
 * GLSL is exported as strings (not .vert/.frag files) so the package
 * needs no additional Vite/Rollup loader configuration. Consumers
 * create THREE.ShaderMaterial directly.
 */

export const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmplitude;
  uniform float uFlowBias;
  uniform float uMotion;

  attribute float aSeed;
  attribute float aSize;

  varying float vSeed;
  varying float vFade;

  // Pseudo-random per-particle phase from seed.
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    vSeed = aSeed;
    vec3 p = position;

    float t = uTime * uSpeed;
    float phase = aSeed * 6.28318;

    // Directional advection biased by agent flow (e.g. THINKING circulation).
    float drift = sin(t * 0.7 + phase) * 0.35 + uFlowBias * 0.25;
    p.x += drift * uAmplitude * uMotion;
    p.y += sin(t * 0.9 + phase * 1.7) * 0.3 * uAmplitude * uMotion;
    p.z += cos(t * 0.6 + phase * 2.3) * 0.3 * uAmplitude * uMotion;

    // Gentle radial breathing — the IDLE "slow_particle_breathing" cue.
    float breath = 1.0 + 0.06 * sin(t * 0.5 + phase) * uMotion;
    p *= breath;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = -mv.z;
    gl_PointSize = aSize * (140.0 / max(dist, 0.1)) * (0.6 + 0.4 * uMotion);
    vFade = smoothstep(8.0, 2.0, dist);
  }
`;

export const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uCoreColor;
  uniform vec3 uAccentColor;
  uniform float uGlow;
  uniform float uTime;
  uniform float uSpeed;

  varying float vSeed;
  varying float vFade;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Soft radial falloff.
    float alpha = smoothstep(0.5, 0.05, d);

    // Per-particle shimmer, scaled by glow.
    float shimmer = 0.75 + 0.25 * sin(uTime * (1.0 + uSpeed * 3.0) + vSeed * 40.0);
    vec3 col = mix(uAccentColor, uCoreColor, vSeed);
    col *= shimmer * (0.4 + uGlow);

    gl_FragColor = vec4(col, alpha * vFade * (0.35 + uGlow * 0.65));
  }
`;
