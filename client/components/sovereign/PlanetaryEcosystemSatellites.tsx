import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export type EvidenceClass = "CANONICAL" | "OBSERVED_TELEMETRY" | "DESIGN_SPEC" | "ILLUSTRATIVE" | "SIMULATED";

export interface EvidenceProvenance {
  class: EvidenceClass;
  source: "world-model" | "static-registry" | "runtime-telemetry" | "simulation";
  verified: boolean;
  reference?: string;
}

/** Static registry values are design specifications until backed by World Model evidence. */
export const DESIGN_SPEC_PROVENANCE: EvidenceProvenance = {
  class: "DESIGN_SPEC",
  source: "static-registry",
  verified: false,
};

export interface EcosystemSatellite {
  evidence: EvidenceProvenance;
  id: string;
  name: string;
  category: string;
  tagline: string;
  status: string;
  metrics: {
    l1: string;
    l2: string;
    r1: string;
    r2: string;
  };
  highlight: {
    title: string;
    value: string;
    status: string;
    subtitle: string;
  };
  sysLog: string;
}

export const PLANETARY_ECOSYSTEMS: EcosystemSatellite[] = [
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "3wm",
    name: "3WM DSP SONIK",
    category: "AUDIO PLATFORM (BUSHFEEXER)",
    tagline: "Procedural Audio Synthesizer & Spatial Sound Engine",
    status: "60 FPS LOCKED // STREAM ONLINE",
    metrics: {
      l1: "DSP CLOCK: 44.1 kHz | STEREO BUS",
      l2: "CYBER HAPTIC ENGINE: NOMINAL",
      r1: "HARMONIC DISTORTION: < 0.001%",
      r2: "CHANNELS: 16 MODULAR TRACKS"
    },
    highlight: {
      title: "Procedural DSP Audio Synthesis",
      value: "44.1 kHz",
      status: "LOCKED",
      subtitle: "Stereo Bus Latency: < 0.1ms"
    },
    sysLog: "> 3WM AUDIO DSP LOCKED // PROCEDURAL HARMONICS ACTIVE\n> SYNTHESIS MATRIX RUNNING ON BUSHFEEXER PROTOCOL"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "yurrheeler",
    name: "YURRHEELER MED-NET",
    category: "HEALTHCARE INTELLIGENCE",
    tagline: "16 Specialized Medical AIs & Tele-Diagnostic Mesh",
    status: "CLINICAL TELEMETRY // ENCRYPTED",
    metrics: {
      l1: "AI CLUSTERS: 16 ACTIVE SPECIALIZATIONS",
      l2: "DIAGNOSTIC LATENCY: 14ms",
      r1: "PATIENT PRIVACY: ZERO-KNOWLEDGE PROOF",
      r2: "EHR EVIDENCE SHAS: 100% VERIFIED"
    },
    highlight: {
      title: "Clinical Medical Diagnostics",
      value: "16 AIs",
      status: "ONLINE",
      subtitle: "Tele-Diagnostic Response: 14ms"
    },
    sysLog: "> YURRHEELER MEDICAL SWARM INITIALIZED\n> 16 CLINICAL SPECIALTIES OPERATING UNDER HIPAA-COMPLIANT EVIDENCE FABRIC"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "farmplug",
    name: "FARMPLUG AI",
    category: "AGRICULTURAL INTELLIGENCE",
    tagline: "Voice Crop Guidance, Soil Sensor Fusion & Market Mesh",
    status: "SOIL SENSORS SYNCED // MULTI-SPECTRAL",
    metrics: {
      l1: "ACREAGE COVERAGE: 42,800 HECTARES",
      l2: "VOICE QUERY ROUTING: 99.4% INTENT HIT",
      r1: "YIELD PREDICTION VARIANCE: ±1.2%",
      r2: "WEATHER TELEMETRY: REAL-TIME RADAR"
    },
    highlight: {
      title: "Autonomous Crop Guidance",
      value: "42.8k HA",
      status: "SYNCED",
      subtitle: "Multi-Spectral Sensor Accuracy: 99.4%"
    },
    sysLog: "> FARMPLUG AGRITECH TELEMETRY ONLINE\n> HARVEST TIMING ALGORITHM OPTIMIZED VIA LOCALIZED CLIMATE EVIDENCE"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "firehouse",
    name: "FIREHOUSE GRILLS",
    category: "SMART CULINARY HARDWARE",
    tagline: "Precision Thermal Control, IoT Telemetry & Industrial Kitchen Mesh",
    status: "HEAT INDUCTION // PID THERMOSTAT",
    metrics: {
      l1: "CORE THERMAL MATRIX: 385°C STABLE",
      l2: "HEAT DELTA EFFICIENCY: +94.2%",
      r1: "SAFETY SHUTOFF RELAY: ARMED",
      r2: "SMOKE/AIR QUALITY INDEX: GRADE-A"
    },
    highlight: {
      title: "Precision Thermal Control",
      value: "385°C",
      status: "STABLE",
      subtitle: "Heat Delta Efficiency: +94.2%"
    },
    sysLog: "> FIREHOUSE GRILL TELEMETRY UPLINK ESTABLISHED\n> INDUSTRIAL THERMAL REGULATORS LOCKED"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "feexkeeauth",
    name: "FEEXKEEAUTH SECURITY",
    category: "HIGH-ASSURANCE DEFENSE & CRYPTOGRAPHY",
    tagline: "Hardware Root of Trust, Secure Enclave & Zero-Trust Mesh",
    status: "ENCLAVE ARMED // ZERO-TRUST ACTIVE",
    metrics: {
      l1: "CRYPTO CIPHER: ED25519 + AES-256-GCM",
      l2: "HARDWARE KEY REFRESH: 300s INTERVAL",
      r1: "INTRUSION DETECTION: 0 THREATS DETECTED",
      r2: "AUDIT LEDGER: CANONICAL PROVENANCE"
    },
    highlight: {
      title: "Hardware Root of Trust Vault",
      value: "ED25519",
      status: "ARMED",
      subtitle: "Zero-Trust Encryption: AES-256-GCM"
    },
    sysLog: "> FEEXKEEAUTH CRYPTOGRAPHIC POSTURE VERIFIED\n> HARDWARE KEYS ISOLATED IN TAMPER-RESISTANT VAULT"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "kappaxchangefin",
    name: "KAPPAXCHANGEFIN",
    category: "DECENTRALIZED FINANCE & TRADING",
    tagline: "Automated Liquidity Mesh, Order Routing & Algorithmic Hedging",
    status: "LIQUIDITY ORACLES ACTIVE",
    metrics: {
      l1: "ORDER LATENCY: 2.1ms HIGH-FREQUENCY",
      l2: "SLIPPAGE TOLERANCE: < 0.05%",
      r1: "SETTLEMENT AUDIT: 100% CANONICAL",
      r2: "CROSS-CHAIN BRIDGES: CRYPTO LOCKED"
    },
    highlight: {
      title: "Algorithmic Order Routing Matrix",
      value: "2.1ms",
      status: "HIGH-FREQ",
      subtitle: "Execution Slippage Tolerance: < 0.05%"
    },
    sysLog: "> KAPPAXCHANGEFIN TRADING MATRIX NOMINAL\n> LIQUIDITY ROUTERS OPERATING ON PROVABLE EXECUTION EVIDENCE"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "rentall",
    name: "RENTALL SMARTS HOMES",
    category: "AUTONOMOUS IOT & LIVING ENVIRONMENT",
    tagline: "Decentralized Property Management, Smart Locks & Energy Grids",
    status: "12,400 UNITS ONLINE // MESH LOCKED",
    metrics: {
      l1: "SMART LOCK STATUS: 100% ENCRYPTED",
      l2: "GRID POWER CONSERVATION: +28.4%",
      r1: "OCCUPANCY TELEMETRY: ANONYMIZED",
      r2: "HVAC AUTOMATION: PID PREDICTIVE"
    },
    highlight: {
      title: "Autonomous Property IoT Mesh",
      value: "12.4k UNITS",
      status: "CONNECTED",
      subtitle: "Grid Power Conservation: +28.4%"
    },
    sysLog: "> RENTALL SMART HOMES PLATFORM SYNCED\n> TENANT PROPERTY MESH OPERATING UNDER ZERO-KNOWLEDGE ACCESS TOKENS"
  },
  {
    evidence: DESIGN_SPEC_PROVENANCE,
    id: "feexsystems",
    name: "FEEX WORLD OS",
    category: "PLANETARY CORE ARCHITECTURE",
    tagline: "The Sovereign Engineering Intelligence World Model & HoloKai",
    status: "CANONICAL REALITY // AUTHORITATIVE",
    metrics: {
      l1: "TOPOLOGY NODES: 8 ORBITING WORLDS",
      l2: "GEMINI 3.7 FLASH: DIRECT UPLINK",
      r1: "DATABASE: POSTGRESQL 15 + PRISMA",
      r2: "PROVENANCE: CRYPTOGRAPHIC COMMIT SHAS"
    },
    highlight: {
      title: "Canonical Reality Engine",
      value: "100%",
      status: "AUTHORITATIVE",
      subtitle: "Evidence Fabric Provenance Grounded"
    },
    sysLog: "> FEEX WORLD OS AUTHORITATIVE RUNTIME RUNNING\n> HOLOKAI AI INITIALIZED AS COGNITIVE GHOST IN THE MACHINE"
  }
];

interface PlanetaryEcosystemSatellitesProps {
  selectedId: string | null;
  onSelect: (satellite: EcosystemSatellite) => void;
}

export function PlanetaryEcosystemSatellites({ selectedId, onSelect }: PlanetaryEcosystemSatellitesProps) {
  const orbitGroupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * 0.04;
    }
  });

  const orbitRadius = 7.5;

  return (
    <group ref={orbitGroupRef} position={[0, 0, -2]}>
      {/* Visual Orbit Reference Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.02, orbitRadius + 0.02, 128]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>

      {PLANETARY_ECOSYSTEMS.map((eco, idx) => {
        const angle = (idx / PLANETARY_ECOSYSTEMS.length) * Math.PI * 2;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        const isSelected = selectedId === eco.id;

        return (
          <group key={eco.id} position={[x, 0, z]}>
            {/* Satellite Node Geometry */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelect(eco);
              }}
              scale={isSelected ? [1.3, 1.3, 1.3] : [0.9, 0.9, 0.9]}
            >
              <octahedronGeometry args={[0.35, 0]} />
              <meshBasicMaterial
                color={isSelected ? "#00ff66" : "#ffffff"}
                wireframe
                transparent
                opacity={isSelected ? 1.0 : 0.6}
              />
            </mesh>

            {/* Orbit Target Beacon Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 0.54, 32]} />
              <meshBasicMaterial
                color={isSelected ? "#00ff66" : "#444444"}
                transparent
                opacity={isSelected ? 0.8 : 0.3}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Swiss Typographic 3D Label */}
            <Html
              position={[0, 0.5, 0]}
              center
              distanceFactor={36}
              className="pointer-events-auto select-none"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(eco);
                }}
                className={`px-1.5 py-0.5 border text-[8px] font-mono tracking-wider whitespace-nowrap uppercase transition shadow-md ${
                  isSelected
                    ? "border-[#00ff66] text-[#00ff66] bg-black/90 shadow-[0_0_8px_rgba(0,255,102,0.4)]"
                    : "border-white/20 text-white/70 bg-black/80 hover:border-[#00ff66] hover:text-[#00ff66]"
                }`}
              >
                [{String(idx + 1).padStart(2, "0")}] {eco.name}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default PlanetaryEcosystemSatellites;
