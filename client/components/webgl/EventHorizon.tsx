/**
 * Event Horizon Three.js Shader
 * Black hole accretion disk visualization with WebGL shaders
 * Based on event-horizon-three-js-glsl by @[author]
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Shared GLSL utilities
const GLSL_COMMON = `
  vec3 decodificar(vec3 e){
    e = min(e, vec3(0.996));
    return e / (1.0 - e);
  }
  vec3 codificar(vec3 c){
    return c / (1.0 + c);
  }
`;

// Vertex shader
const VERT = `
  void main(){
    gl_Position = vec4(position, 1.0);
  }
`;

// Event Horizon Fragment Shader - Black Hole Simulation
const FRAG_EVENT_HORIZON = GLSL_COMMON + `
uniform float uTime;
uniform vec2 uRes;
uniform float uCamDist;
uniform float uYaw;
uniform float uPitch;
uniform float uVel;
uniform float uTemp;
uniform float uDoppler;
uniform float uFondo;
uniform float uPasos;
uniform sampler2D tTexto;
uniform float uTextoOn;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hash31(vec3 p){
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float noise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p){
  float v = 0.0; float a = 0.55;
  for(int i = 0; i < 4; i++){
    v += a * noise2(p);
    p = p * 2.13 + vec2(13.7, 7.1);
    a *= 0.5;
  }
  return v;
}

vec3 cielo(vec3 rd){
  vec3 col = vec3(0.0);

  for(int capa = 0; capa < 4; capa++){
    float fc = float(capa);
    float esc = 140.0 + fc * 200.0;
    vec3 q = rd * esc;
    vec3 id = floor(q);
    float h = hash31(id);
    if(h > 0.990 - fc * 0.0025){
      vec3 c = fract(q) - 0.5;
      float d = length(c);
      float b = 1.0 - smoothstep(0.0, 0.5, d);
      b = pow(b, 12.0) * (0.5 + 1.6 * fract(h * 91.7));
      vec3 tinte = mix(vec3(0.65, 0.78, 1.0), vec3(1.0, 0.83, 0.62), fract(h * 53.1));
      if(fract(h * 17.3) > 0.90) b *= 6.0;
      col += b * tinte * 2.0;
    }
  }

  float n1 = fbm(rd.xy * 2.0 + rd.z * 1.3);
  float n2 = fbm(rd.zy * 3.1 - rd.x * 1.7 + 5.0);
  vec3 gas = vec3(0.020, 0.045, 0.110) * pow(n1, 2.6) * 0.50
           + vec3(0.090, 0.040, 0.022) * pow(n2, 3.2) * 0.40;

  float banda = exp(-pow((rd.y + 0.16) * 2.6, 2.0));
  float polvo = fbm(rd.xz * 5.0 + 2.3) * 0.7 + fbm(rd.xz * 11.0) * 0.5;
  gas += (vec3(0.05, 0.06, 0.10) + vec3(0.06, 0.04, 0.02) * polvo) * banda * polvo * 0.30;

  float oscuro = smoothstep(0.45, 0.75, fbm(rd.xz * 7.0 + 9.1));
  gas *= mix(1.0, 0.25, oscuro * banda);

  col += gas * uFondo;
  return col;
}

vec3 colorGas(float r, float rIn, float rOut){
  float t = clamp((r - rIn) / (rOut - rIn), 0.0, 1.0);
  vec3 nucleo = mix(vec3(1.00, 0.98, 0.94), vec3(0.80, 0.90, 1.00), uTemp);
  vec3 medio  = vec3(1.00, 0.60, 0.20);
  vec3 borde  = vec3(0.50, 0.14, 0.03);
  vec3 c = mix(nucleo, medio, smoothstep(0.0, 0.40, t));
  return mix(c, borde, smoothstep(0.40, 1.0, t));
}

vec4 disco(vec3 p, vec3 rd, float rIn, float rOut){
  float r = length(p.xz);
  if(r < rIn - 0.4 || r > rOut) return vec4(0.0);

  float H = 0.085 + 0.34 * pow(clamp((r - 2.0) / 11.0, 0.0, 1.0), 1.7);
  float y = p.y / H;
  if(abs(y) > 3.5) return vec4(0.0);

  float vertical = exp(-y * y * 2.1);
  float bruma = exp(-y * y * 0.45) * 0.16;

  float ang = atan(p.z, p.x);
  float omega = uVel * 0.9 / pow(r, 1.5);
  float a1 = ang + uTime * omega * 9.0;

  float brazos = fbm(vec2(r * 2.2, a1 * 2.4));
  float hebras = fbm(vec2(r * 14.0 - uTime * 0.05, a1 * 1.3) + 7.3);
  float hilos  = noise2(vec2(r * 46.0, a1 * 4.0));
  float espiral = fbm(vec2(r * 5.0, a1 * 3.5 + r * 2.2));
  float grumos  = pow(noise2(vec2(r * 3.5, a1 * 6.0)), 3.0);
  float dens = brazos * 0.42 + hebras * 0.38 + hilos * 0.14
             + espiral * 0.30 + grumos * 0.55;
  dens = smoothstep(0.12, 1.05, dens);
  dens = dens * dens * (1.2 + 0.5 * hebras);
  dens = dens * vertical + bruma * (0.4 + 0.6 * brazos);
  dens *= smoothstep(rIn - 0.4, rIn + 0.45, r);
  dens *= 1.0 - smoothstep(rOut - 2.6, rOut, r);

  if(dens < 0.003) return vec4(0.0);

  float perfil = pow(3.0 / r, 1.9);

  float beta = clamp(sqrt(0.5 / max(r - 1.0, 0.4)), 0.0, 0.85) * min(uVel, 1.6);
  vec3 velDir = normalize(vec3(-p.z, 0.0, p.x));
  float coseno = dot(rd, velDir);
  float dop = 1.0 / max(1.0 - beta * coseno, 0.15);
  float beaming = mix(1.0, pow(dop, 3.0), uDoppler);
  float shift = uDoppler * clamp(beta * coseno, -1.0, 1.0);

  float zGrav = sqrt(max(1.0 - 1.0 / r, 0.05));
  beaming *= mix(1.0, zGrav * zGrav, uDoppler * 0.7);

  vec3 col = colorGas(r, rIn, rOut);
  col = mix(col, vec3(1.0, 0.99, 0.95), clamp(perfil * 0.45, 0.0, 0.9));
  col = mix(col, vec3(0.72, 0.84, 1.00), max(shift, 0.0) * 0.55);
  col = mix(col, vec3(0.85, 0.25, 0.07), max(-shift, 0.0) * 0.6);

  return vec4(col * perfil * beaming * dens, dens);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  float cy = cos(uYaw); float sy = sin(uYaw);
  float cp = cos(uPitch); float sp = sin(uPitch);
  vec3 ro = uCamDist * vec3(cy * cp, sp, sy * cp);
  vec3 fw = normalize(-ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw * 1.5 + uv.x * rt + uv.y * up);

  vec3 p = ro;
  vec3 v = rd;
  vec3 hVec = cross(p, v);
  float h2 = dot(hVec, hVec);

  float rIn = 3.0; float rOut = 13.0;

  vec3 col = vec3(0.0);
  float transmit = 1.0;
  float capturado = 0.0;
  float minR = 100000.0;

  vec3 aDir = vec3(cy, 0.0, sy);
  vec3 tDir = vec3(-sy, 0.0, cy);
  float sPrev = dot(p, aDir) + 20.0;

  for(int i = 0; i < 480; i++){
    if(float(i) >= uPasos) break;

    float r2 = dot(p, p);
    float r  = sqrt(r2);
    minR = min(minR, r);

    float dt = clamp(r * 0.065, 0.018, 0.42);
    float grosor = 0.085 + 0.34 * pow(clamp((r - 2.0) / 11.0, 0.0, 1.0), 1.7);
    if(abs(p.y) < grosor * 3.5 && r > rIn - 1.0 && r < rOut + 0.5) dt *= 0.45;

    vec3 a = -1.5 * h2 * p / (r2 * r2 * r);
    v += a * dt;
    p += v * dt;

    if(dot(p, p) < 1.0){ capturado = 1.0; break; }

    if(transmit > 0.012){
      vec4 d = disco(p, normalize(v), rIn, rOut);
      if(d.a > 0.0){
        col += d.rgb * transmit * dt * 4.6;
        transmit *= exp(-d.a * dt * 2.8);
      }
    }

    if(uTextoOn > 0.5 && transmit > 0.012){
      float sNow = dot(p, aDir) + 20.0;
      if(sPrev * sNow < 0.0){
        float f = sPrev / (sPrev - sNow);
        vec3 q = mix(p - v * dt, p, f);
        vec2 uvT = vec2(fract(0.5 - dot(q, tDir) / 38.0 - uTime * 0.045),
                        0.5 + q.y / 19.0);
        if(uvT.y > 0.001 && uvT.y < 0.999){
          vec4 tx = texture2D(tTexto, uvT);
          col += tx.rgb * tx.a * transmit * 1.7;
          transmit *= (1.0 - tx.a * 0.92);
        }
      }
      sPrev = sNow;
    }

    if(dot(p, p) > 1400.0) break;
  }

  if(capturado < 0.5 && transmit > 0.012){
    col += cielo(normalize(v)) * transmit;
  }

  float halo = exp(-abs(minR - 1.5) * 3.0);
  col += vec3(1.0, 0.80, 0.52) * halo * 0.45 * mix(1.0, 0.35, capturado);

  col += vec3(1.0, 0.62, 0.32) * exp(-minR * 0.34) * 0.10;

  gl_FragColor = vec4(codificar(col), 1.0);
}
`;

// Brightpass Fragment Shader
const FRAG_BRIGHT = GLSL_COMMON + `
uniform sampler2D tSrc;
uniform float uUmbral;
varying vec2 vUv;
void main(){
  vec3 c = decodificar(texture2D(tSrc, vUv).rgb);
  c = max(c - uUmbral, vec3(0.0));
  gl_FragColor = vec4(codificar(c), 1.0);
}
`;

// Blur Fragment Shader
const FRAG_BLUR = GLSL_COMMON + `
uniform sampler2D tSrc;
uniform vec2 uDir, uRes;
varying vec2 vUv;
void main(){
  vec2 px = uDir / uRes;
  vec3 suma = decodificar(texture2D(tSrc, vUv).rgb) * 0.227;
  float pesos[4];
  pesos[0] = 0.194; pesos[1] = 0.121; pesos[2] = 0.054; pesos[3] = 0.016;
  for(int i = 1; i <= 4; i++){
    float o = float(i) * 1.6;
    suma += decodificar(texture2D(tSrc, vUv + px * o).rgb) * pesos[i-1];
    suma += decodificar(texture2D(tSrc, vUv - px * o).rgb) * pesos[i-1];
  }
  gl_FragColor = vec4(codificar(suma), 1.0);
}
`;

// Composition Fragment Shader
const FRAG_COMP = GLSL_COMMON + `
uniform sampler2D tEscena, tBloom;
uniform float uFuerza, uExpo, uTime, uAspecto;
varying vec2 vUv;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main(){
  vec2 centro = vUv - 0.5;
  centro.x *= uAspecto;
  float radial = length(centro);

  vec2 dir = (vUv - 0.5) * radial * 0.012;
  float r = decodificar(texture2D(tEscena, vUv + dir).rgb).r;
  float g = decodificar(texture2D(tEscena, vUv).rgb).g;
  float b = decodificar(texture2D(tEscena, vUv - dir).rgb).b;
  vec3 col = vec3(r, g, b);

  col += decodificar(texture2D(tBloom, vUv).rgb) * uFuerza;

  col += decodificar(texture2D(tBloom, vec2(1.0) - vUv).rgb)
         * vec3(0.55, 0.70, 1.00) * 0.06;

  col *= uExpo;

  col *= vec3(1.06, 0.99, 0.88);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 0.92);

  col = aces(col);
  col = pow(col, vec3(1.0 / 1.10));

  col *= 1.0 - smoothstep(0.45, 1.05, radial) * 0.55;

  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.022;

  gl_FragColor = vec4(col, 1.0);
}
`;

interface EventHorizonProps {
  className?: string;
  text?: string;
}

export function EventHorizon({ className = '', text = 'BLACK HOLE' }: EventHorizonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textTexture, setTextTexture] = useState<THREE.CanvasTexture | null>(null);
  const [textData, setTextData] = useState({
    yaw: 0,
    pitch: 0.12,
    distance: 27,
  });
  const [settings, setSettings] = useState({
    velocity: 1.45,
    temperature: 0.76,
    doppler: 1.0,
    background: 1.0,
    steps: 230,
    bloomStrength: 0.75,
    exposure: 0.95,
  });
  const [autoOrbit, setAutoOrbit] = useState(true);

  // Create text texture
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.shadowColor = 'rgba(255,180,94,0.85)';
      ctx.shadowBlur = 48;
      ctx.fillStyle = '#fff3df';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const fontSize = 250;
      ctx.font = `700 ${fontSize}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      
      ctx.shadowBlur = 0;
      
      const lineWidth = Math.min(canvas.width * 0.8, 1500);
      const lineWidthY = canvas.height / 2 - fontSize * 0.74;
      ctx.fillStyle = 'rgba(255,243,223,0.7)';
      ctx.fillRect((canvas.width - lineWidth) / 2, lineWidthY, lineWidth, 4);
      ctx.fillRect((canvas.width - lineWidth) / 2, lineWidthY + fontSize * 1.4, lineWidth, 4);
      
      setTextTexture(new THREE.CanvasTexture(canvas));
    }

    return () => {
      textTexture?.dispose();
    };
  }, [text]);

  // Animation loop
  useFrame((state, delta) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Update auto orbit
    if (autoOrbit && !textData.yaw) {
      setTextData(prev => ({
        ...prev,
        yaw: prev.yaw + delta * 0.04
      }));
    }
  });

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-6 left-8 text-white/90 tracking-[0.42em] text-[13px] uppercase">
          EVENT HORIZON
          <small className="block mt-1.5 tracking-[0.18em] text-[9px] text-gray-500">
            C U R V A T U R A   D E L   E S P A C I O - T I E M P O
          </small>
        </div>
        
        <div className="absolute top-6 right-8 text-right text-[9px] tracking-[0.14em] text-gray-500 uppercase">
          <div className="mb-1">YAW <b>{textData.yaw.toFixed(2)}</b></div>
          <div className="mb-1">PITCH <b>{textData.pitch.toFixed(2)}</b></div>
          <div className="mb-1">DIST <b>{textData.distance.toFixed(1)}</b></div>
          <div className="mb-1">VELOCITY <b>{settings.velocity.toFixed(2)}</b></div>
          <div>TEMP <b>{settings.temperature.toFixed(2)}</b></div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
        style={{ display: 'block' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width * 2 - 1;
          const y = -(e.clientY - rect.top) / rect.height * 2 + 1;
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) {
            setTextData(prev => ({
              ...prev,
              yaw: prev.yaw + e.movementX * 0.005,
              pitch: Math.max(-1.35, Math.min(1.35, prev.pitch + e.movementY * 0.004))
            }));
          }
        }}
        onWheel={(e) => {
          e.preventDefault();
          const newDistance = textData.distance * (1 - Math.sign(e.deltaY) * 0.08);
          setTextData(prev => ({
            ...prev,
            distance: Math.max(6.0, Math.min(34, newDistance))
          }));
        }}
      />
    </div>
  );
}

export default EventHorizon;
