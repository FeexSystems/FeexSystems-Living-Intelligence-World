---
name: feex-brand-identity
description: Reference and cheat sheet for integrating FeexSystems brand identity, navigating the Sovereign Engine HUD, extending ECOSYSTEM_NODES, and applying custom WebGL shaders to 3D elements.
---

# FeexSystems Brand Identity & Sovereign Engine UI Standards

This skill provides the required standards, patterns, and code snippets for modifying the **FeexSystems Sovereign Engine** (`FeexSovereignEngine.tsx` and `SovereignScene.tsx`). When making UI, UX, or 3D scene changes, adhere to the guidelines documented here.

## 1. Aesthetic and Branding
- **Color Palette**: Strict monochrome-noir (blacks, dark grays, and whites).
- **Accents**: Use subtle "Phosphor Green" (`0x00ff88` in WebGL or `text-emerald-400` in Tailwind) strictly for interactive glowing elements (e.g., hovering, data streams).
- **Typography**: Utilize highly structured uppercase, wide-tracking (`tracking-wider`, `tracking-widest`), mono-spaced fonts (`font-mono`) for metadata, footers, and HUD readouts.
- **Glassmorphism**: UI panels must use heavy blur (`backdrop-blur-md`), minimal background opacity (`bg-black/40`), and thin white borders (`border-white/10` or `border-white/20`).

## 2. Integrating Nodes into `ECOSYSTEM_NODES`
Whenever you need to add a new world, platform, or project (like Vyra Labs or Holokai) to the central Sovereign Engine, you MUST update the `ECOSYSTEM_NODES` array in `client/components/sovereign/FeexSovereignEngine.tsx`.

### Required Node Properties
Every node must strictly implement the following interface:
```typescript
{
  id: 'vyralabs',
  title: 'VYRA LABS', 
  tagline: 'Creator AI Chat Interface', // Short summary
  category: 'SOCIAL INTELLIGENCE',      // Broad classification
  description: 'The first creator chat interface platform with full AI Core features and FanDNA.',
  icon: Layers,                         // Imported from lucide-react
  metrics: {                            // Exactly 3 key-value pairs for the HUD
    status: 'Live', 
    AI: 'Core Features', 
    Engine: 'FanDNA' 
  },
  position: {                           // CSS absolute positioning string
    top: '48%', 
    left: '86%' 
  }
}
```

## 3. WebGL Data-Stream Shaders (R3F)
When asked to add "moving light trails" or "data streams" to wireframe objects (like the GlowingGlobe), use a custom overlay mesh with `THREE.ShaderMaterial`.

### Implementation Pattern
1. Duplicate the geometry and scale it slightly up (e.g. from `1.8` to `1.802`).
2. Apply `THREE.AdditiveBlending` and set `wireframe: true`.
3. Animate the `time` uniform in a `useFrame` loop.
4. Use `uv.x` and `uv.y` combined with `fract` and a pseudo-random noise function (`rand`) to generate dashed glowing packets.

**Example Fragment Shader for Data Packets**:
```glsl
uniform float time;
uniform vec3 color;
varying vec2 vUv;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  float speed = 1.5;
  // Discrete bands along longitude and latitude
  float bandX = fract(vUv.x * 30.0 - time * speed);
  float bandY = fract(vUv.y * 30.0 + time * speed * 1.2);
  
  // Random activation noise
  float activeX = step(0.9, rand(vec2(floor(vUv.x * 30.0), 1.0)));
  float activeY = step(0.9, rand(vec2(1.0, floor(vUv.y * 30.0))));
  
  // Smooth edges of the packet
  float packetX = smoothstep(0.6, 1.0, bandX) * activeX;
  float packetY = smoothstep(0.6, 1.0, bandY) * activeY;
  
  float intensity = max(packetX, packetY);
  
  gl_FragColor = vec4(color, intensity * 0.9);
}
```

## 4. Navigation & Footer Enhancements
- **Header**: Primary actions (e.g., "Explore FeexSystems") should direct users to the Technical Dossier rather than standard SaaS dashboards. Use buttons with subtle white shadows (`shadow-[0_0_15px_rgba(255,255,255,0.2)]`).
- **Footer**: The footer must include the FeexSystems logo (using the `Sparkles` icon), the manifesto ("Living Engineering Intelligence..."), and standard diagnostic links (System Health, Security Mesh, Technical Dossier).
