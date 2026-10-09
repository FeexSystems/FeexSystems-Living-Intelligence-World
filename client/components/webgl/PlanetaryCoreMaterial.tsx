import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 1. Planetary Core GLSL Shaders
const PLANETARY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  uniform float u_time;
  uniform float u_displacement;

  // Simplex noise approximation for vertex pulse
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Dynamic surface elevation breathing
    float elevation = snoise(position * 0.4 + vec3(0.0, 0.0, u_time * 0.15)) * u_displacement;
    vec3 newPosition = position + normal * elevation;

    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PLANETARY_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  uniform float u_time;
  uniform float u_noise_freq;
  uniform float u_warp_amp;
  uniform vec3 u_color_primary;
  uniform vec3 u_color_secondary;
  uniform vec3 u_color_accent;
  uniform vec3 u_color_void;

  float hash(vec3 p) {
    p  = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(in vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p = p * 2.02;
    f += 0.2500 * noise(p); p = p * 2.03;
    f += 0.1250 * noise(p); p = p * 2.01;
    f += 0.0625 * noise(p);
    return f;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    // 4-Octave Domain Warping
    vec3 p = vPosition * u_noise_freq;
    vec3 q = vec3(fbm(p + vec3(0.0, u_time * 0.08, 0.0)),
                  fbm(p + vec3(5.2, 1.3, 2.8)),
                  fbm(p + vec3(2.2, 8.4, 0.5)));

    vec3 r = vec3(fbm(p + u_warp_amp * q + vec3(1.7, 9.2, u_time * 0.12)),
                  fbm(p + u_warp_amp * q + vec3(8.3, 2.8, 4.1)),
                  fbm(p + u_warp_amp * q + vec3(4.1, 1.2, 7.3)));

    float f = fbm(p + u_warp_amp * r);

    // Latitudinal & Longitudinal Coordinates Grid (20 bands)
    float latGrid = abs(sin(vUv.y * 62.8318));
    float lonGrid = abs(sin(vUv.x * 62.8318));
    float gridIntensity = step(0.965, latGrid) + step(0.965, lonGrid);

    // Continuous Equator Traversal Energy Pulse
    float pulseRing = smoothstep(0.02, 0.0, abs(fract(vUv.y * 2.0 - u_time * 0.2) - 0.5) - 0.02);

    // Chromatic Spectral Composition
    vec3 color = mix(u_color_void, u_color_secondary, smoothstep(0.1, 0.6, f));
    color = mix(color, u_color_primary, smoothstep(0.5, 0.9, f));
    color = mix(color, u_color_accent, smoothstep(0.85, 1.0, f));

    // Energy grid lines & pulse highlights
    color += u_color_primary * gridIntensity * 0.45;
    color += u_color_accent * pulseRing * 0.6;

    // Rim Fresnel Lighting
    float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
    fresnel = pow(fresnel, 2.5);
    color += u_color_primary * fresnel * 0.85;

    gl_FragColor = vec4(color, 0.98);
  }
`;

// 2. Volumetric Atmosphere Glow Shaders
const ATMOSPHERE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ATMOSPHERE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  uniform vec3 u_glow_color;
  uniform float u_fresnel_power;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);

    float intensity = pow(1.0 - max(dot(normal, viewDir), 0.0), u_fresnel_power);
    gl_FragColor = vec4(u_glow_color, intensity * 0.8);
  }
`;

export interface SystemWorldChroma {
  primary: string;
  secondary: string;
  accent: string;
  voidColor?: string;
  tag?: string;
}

export const CANONICAL_WORLD_CHROMAS: Record<string, SystemWorldChroma> = {
  kappaxchangefin: {
    primary: "#FFFFFF", // High-Contrast Monochrome White
    secondary: "#A1A1AA", // Zinc 400
    accent: "#E4E4E7", // Zinc 200
    voidColor: "#09090B",
    tag: "FINANCIAL_INFRASTRUCTURE",
  },
  holokai: {
    primary: "#F4F4F5", // High-Contrast Platinum White
    secondary: "#71717A", // Zinc 500
    accent: "#FFFFFF",
    voidColor: "#000000",
    tag: "CULTURAL_INTELLIGENCE",
  },
  yurrheeler: {
    primary: "#E4E4E7", // Silver Zinc
    secondary: "#52525B", // Deep Zinc 600
    accent: "#FFFFFF",
    voidColor: "#09090B",
    tag: "HEALTHCARE_INTELLIGENCE",
  },
  sonik: {
    primary: "#FFFFFF", // Pure White Luminescence
    secondary: "#3F3F46", // Charcoal Zinc 700
    accent: "#D4D4D8", // Silver Chrome
    voidColor: "#000000",
    tag: "NEURAL_DSP_AUDIO",
  },
  vyra: {
    primary: "#D4D4D8", // Light Zinc
    secondary: "#27272A", // Dark Charcoal 800
    accent: "#FFFFFF",
    voidColor: "#09090B",
    tag: "CONVERSATIONAL_INTELLIGENCE",
  },
  rental: {
    primary: "#F4F4F5", // Stark White
    secondary: "#71717A", // Zinc
    accent: "#E4E4E7",
    voidColor: "#000000",
    tag: "SPATIAL_COMMERCE",
  },
  default: {
    primary: "#FFFFFF", // High-Contrast Monochrome White
    secondary: "#71717A", // Slate/Zinc Midtone
    accent: "#E4E4E7", // High Silver Accent
    voidColor: "#000000",
    tag: "CANONICAL_WORLD_MODEL",
  },
};

export function resolveWorldChroma(name: string, domain?: string): SystemWorldChroma {
  const lower = (name + " " + (domain || "")).toLowerCase();
  if (lower.includes("kappa") || lower.includes("fin")) return CANONICAL_WORLD_CHROMAS.kappaxchangefin;
  if (lower.includes("holo")) return CANONICAL_WORLD_CHROMAS.holokai;
  if (lower.includes("yurr") || lower.includes("health")) return CANONICAL_WORLD_CHROMAS.yurrheeler;
  if (lower.includes("sonik") || lower.includes("audio") || lower.includes("3wm")) return CANONICAL_WORLD_CHROMAS.sonik;
  if (lower.includes("vyra")) return CANONICAL_WORLD_CHROMAS.vyra;
  if (lower.includes("rental") || lower.includes("paradise")) return CANONICAL_WORLD_CHROMAS.rental;
  return CANONICAL_WORLD_CHROMAS.default;
}

/**
 * Procedural GLSL Planetary Core Material with dynamic domain warping
 */
export function PlanetaryCoreShaderMaterial({
  chroma,
  isSelected = false,
  isDimmed = false,
}: {
  chroma: SystemWorldChroma;
  isSelected?: boolean;
  isDimmed?: boolean;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => {
    return {
      u_time: { value: 0 },
      u_noise_freq: { value: 2.6 },
      u_warp_amp: { value: 0.45 },
      u_displacement: { value: isSelected ? 0.12 : 0.06 },
      u_color_primary: { value: new THREE.Color(chroma.primary) },
      u_color_secondary: { value: new THREE.Color(chroma.secondary) },
      u_color_accent: { value: new THREE.Color(chroma.accent) },
      u_color_void: { value: new THREE.Color(chroma.voidColor || "#030508") },
    };
  }, [chroma, isSelected]);

  useFrame((_state, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.u_time.value += delta * (isSelected ? 1.4 : 0.8);
      // Sync colors if changed
      matRef.current.uniforms.u_color_primary.value.set(chroma.primary);
      matRef.current.uniforms.u_color_secondary.value.set(chroma.secondary);
      matRef.current.uniforms.u_color_accent.value.set(chroma.accent);
    }
  });

  return (
    <shaderMaterial
      ref={matRef}
      vertexShader={PLANETARY_VERTEX_SHADER}
      fragmentShader={PLANETARY_FRAGMENT_SHADER}
      uniforms={uniforms}
      transparent
      opacity={isDimmed ? 0.25 : 1.0}
    />
  );
}

/**
 * Volumetric Atmospheric Glow Shader Halo
 */
export function AtmosphericHalo({
  color,
  radius,
  fresnelPower = 3.2,
}: {
  color: string;
  radius: number;
  fresnelPower?: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => {
    return {
      u_glow_color: { value: new THREE.Color(color) },
      u_fresnel_power: { value: fresnelPower },
    };
  }, [color, fresnelPower]);

  return (
    <mesh>
      <sphereGeometry args={[radius * 1.18, 48, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={ATMOSPHERE_VERTEX_SHADER}
        fragmentShader={ATMOSPHERE_FRAGMENT_SHADER}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
      />
    </mesh>
  );
}

export const AtmosphereHalo = AtmosphericHalo;

/**
 * Cryptographic Wireframe Icosahedron Lattice around core
 */
export function CryptographicLattice({
  radius,
  color,
}: {
  radius: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.15;
      ref.current.rotation.x += delta * 0.08;
    }
  });

  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[radius * 1.08, 1]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Equatorial Sensor Telemetry Orbit Ring
 */
export function EquatorialTelemetryRing({
  radius,
  color,
}: {
  radius: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2.2, 0, 0]}>
      <ringGeometry args={[radius * 1.35, radius * 1.38, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.65}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
