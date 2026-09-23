// Canonical Feex World ecosystem — 8 orbiting system worlds
// Source of truth: PlanetaryEcosystemSatellites + Feex World OS / HoloKai uplink

export const SYSTEM_WORLDS = [
  {
    id: "01",
    name: "3WM DSP SONIK",
    domain: "Audio / Creative Technology",
    repo: "FeexSystems/3WM-SONIK-LABS",
    repoUrl: "https://github.com/FeexSystems/3WM-SONIK-LABS",
    image: "/media/feex/sonik-audio-dsp.webp",
    description:
      "Procedural audio synthesizer and spatial sound engine (BushFeexer). Neural DSP pipelines for music-production workflows.",
    capabilities: ["AI / ML", "DSP", "Audio Processing", "Interactive UI", "Creative Technology"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "8e25507a",
    evidenceArtifact: "Audio DSP Neural Kernel v2.4.0",
  },
  {
    id: "02",
    name: "YURRHEELER MED-NET",
    domain: "Healthcare Intelligence",
    repo: "FeexSystems/yurrheeler-med-advisor",
    repoUrl: "https://github.com/FeexSystems/yurrheeler-med-advisor",
    image: "/media/feex/yurrhealer-lab.webp",
    description:
      "Multi-agent healthcare intelligence mesh focused on coordinated clinical reasoning, retrieval, and structured interaction.",
    capabilities: ["Agents", "RAG", "AI / ML", "Knowledge Systems", "Full-Stack"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "9eb3057c",
    evidenceArtifact: "Coordinated Medical Agent Swarm",
  },
  {
    id: "03",
    name: "FARMPLUG AI",
    domain: "Agricultural Intelligence",
    repo: "FeexSystems/food-for-humanity-mission",
    repoUrl: "https://github.com/FeexSystems/food-for-humanity-mission",
    image: "/media/feex/ai-neural-core.webp",
    description:
      "Voice crop guidance, soil sensor fusion, and localized market intelligence for agritech operators.",
    capabilities: ["Agritech", "Voice Interfaces", "Sensor Fusion", "AI / ML", "Market Mesh"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "42a8b91f",
    evidenceArtifact: "Autonomous Crop & Sensor Mesh",
  },
  {
    id: "04",
    name: "FIREHOUSE GRILLS",
    domain: "Smart Culinary Hardware",
    repo: "FeexSystems/BUSHFEXXER",
    repoUrl: "https://github.com/FeexSystems/BUSHFEXXER",
    image: "/media/feex/rental-paradise-architecture.webp",
    description:
      "Precision thermal control, IoT telemetry, and industrial kitchen mesh for connected culinary hardware.",
    capabilities: ["IoT", "Thermal Control", "Hardware Telemetry", "Industrial Systems", "Safety"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "f71e29c0",
    evidenceArtifact: "Precision Thermal Control IoT",
  },
  {
    id: "05",
    name: "FEEXKEEAUTH SECURITY",
    domain: "High-Assurance Defense & Cryptography",
    repo: "FeexSystems/FeexSystems-Living-Intelligence-World",
    repoUrl: "https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World",
    image: "/media/feex/kappaxchangefin-ledger.webp",
    description:
      "Hardware root of trust, secure enclave patterns, and zero-trust mesh for high-assurance cryptographic posture.",
    capabilities: ["Cryptography", "Zero-Trust", "Hardware Security", "Audit Ledger", "Enclave"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "0fdff97a",
    evidenceArtifact: "Hardware Root of Trust & Enclave",
  },
  {
    id: "06",
    name: "KAPPAXCHANGEFIN",
    domain: "Fintech / Liquidity / Trading",
    repo: "Pending canonical repository connection",
    repoUrl: "https://github.com/FeexSystems",
    image: "/media/feex/kappaxchangefin-ledger.webp",
    description:
      "Automated liquidity mesh, order routing, and standards-oriented financial infrastructure (ISO 20022 posture).",
    capabilities: ["Fintech", "Liquidity", "Order Routing", "ISO 20022", "Settlement Audit"],
    status: "PENDING REPO",
    evidenceCommitSha: "55ed422d",
    evidenceArtifact: "ISO 20022 Financial Telemetry",
  },
  {
    id: "07",
    name: "RENTALL SMARTS HOMES",
    domain: "Autonomous IoT & Living Environment",
    repo: "FeexSystems/Rental-Paradise",
    repoUrl: "https://github.com/FeexSystems/Rental-Paradise",
    image: "/media/feex/rental-paradise-architecture.webp",
    description:
      "Decentralized property management, smart locks, and energy-grid automation for living environments.",
    capabilities: ["IoT", "Smart Locks", "Property Mesh", "Energy Grids", "Modern Web"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "1b45c59f",
    evidenceArtifact: "Living IoT Mesh & Smart Access",
  },
  {
    id: "08",
    name: "FEEX WORLD OS / HOLOKAI",
    domain: "Planetary Core Architecture",
    repo: "FeexSystems/FeexSystems-Living-Intelligence-World",
    repoUrl: "https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World",
    image: "/media/feex/holokai-guardians-armor.webp",
    tagline: "Where Civilisations Remember.",
    description:
      "Sovereign engineering intelligence World Model and HoloKai cognitive uplink — the authoritative planetary core.",
    capabilities: ["World Models", "Knowledge Graphs", "AI", "3D", "Evidence Fabric"],
    status: "ACTIVE WORLD",
    evidenceCommitSha: "06a1046b",
    evidenceArtifact: "Canonical World Model & HoloKai Uplink",
  },
];

/**
 * Evidence Fabric ledger row — one verified provenance record per system world.
 */
export interface EvidenceLedgerEntry {
  world: string;
  repo: string;
  sha: string;
  artifact: string;
  status: string;
}

/**
 * Single source of truth for the Evidence Fabric ledger table on the landing
 * page. Repository names, commit SHAs, and canonical artifacts are derived from
 * SYSTEM_WORLDS so the ledger can never drift from the System Worlds grid.
 */
export const EVIDENCE_LEDGER: EvidenceLedgerEntry[] = SYSTEM_WORLDS.map((world) => ({
  world: `${world.id} // ${world.name.split(" / ")[0]}`,
  repo: world.repo,
  sha: world.evidenceCommitSha,
  artifact: world.evidenceArtifact,
  status: "VERIFIED",
}));

export const SYSTEM_WORLD_SLIDES = [
  {
    image: "/media/feex/sonik-audio-dsp.webp",
    title: "3WM DSP SONIK: Procedural Audio & Spatial Sound",
    subtitle: "WORLD 01 // AUDIO & CREATIVE TECHNOLOGY",
    category: "01 // DSP & SYNTHESIS",
    tagline: "Neural audio pipelines, intelligent parameter synthesis, and BushFeexer music-production workflows.",
  },
  {
    image: "/media/feex/yurrhealer-lab.webp",
    title: "YURRHEELER MED-NET: Clinical Multi-Agent Mesh",
    subtitle: "WORLD 02 // HEALTHCARE INTELLIGENCE",
    category: "02 // AGENTIC REASONING",
    tagline: "Coordinated clinical reasoning, grounded retrieval, and structured medical interaction.",
  },
  {
    image: "/media/feex/ai-neural-core.webp",
    title: "FARMPLUG AI: Agritech Sensor Fusion",
    subtitle: "WORLD 03 // AGRICULTURAL INTELLIGENCE",
    category: "03 // CROP & MARKET MESH",
    tagline: "Voice crop guidance, soil sensor fusion, and localized market intelligence.",
  },
  {
    image: "/media/feex/rental-paradise-architecture.webp",
    title: "FIREHOUSE GRILLS: Precision Thermal IoT",
    subtitle: "WORLD 04 // SMART CULINARY HARDWARE",
    category: "04 // THERMAL CONTROL",
    tagline: "Industrial kitchen mesh, PID thermal regulation, and safety-first IoT telemetry.",
  },
  {
    image: "/media/feex/kappaxchangefin-ledger.webp",
    title: "FEEXKEEAUTH: Hardware Root of Trust",
    subtitle: "WORLD 05 // HIGH-ASSURANCE SECURITY",
    category: "05 // CRYPTOGRAPHY & ENCLAVE",
    tagline: "Secure enclave patterns, zero-trust mesh, and cryptographic audit posture.",
  },
  {
    image: "/media/feex/kappaxchangefin-ledger.webp",
    title: "KAPPAXCHANGEFIN: Liquidity & Settlement",
    subtitle: "WORLD 06 // FINTECH & TRADING",
    category: "06 // FINANCIAL TELEMETRY",
    tagline: "Liquidity routing, order matrices, and standards-oriented financial infrastructure.",
  },
  {
    image: "/media/feex/rental-paradise-architecture.webp",
    title: "RENTALL SMARTS HOMES: Living IoT Mesh",
    subtitle: "WORLD 07 // AUTONOMOUS PROPERTY",
    category: "07 // SMART LOCKS & ENERGY",
    tagline: "Property management, encrypted access, and energy-grid automation.",
  },
  {
    image: "/media/feex/holokai-guardians-armor.webp",
    title: "FEEX WORLD OS / HOLOKAI: Planetary Core",
    subtitle: "WORLD 08 // SOVEREIGN WORLD MODEL",
    category: "08 // AUTHORITATIVE REALITY",
    tagline: "Canonical World Model, evidence fabric, and HoloKai cognitive uplink.",
  },
];
