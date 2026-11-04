 














/**
 * Initial public showcase registry.
 * This is deliberately small and evidence-safe: the ingestion service will
 * become the authoritative source as GitHub synchronization is implemented.
 */
export const feexProjects = [
  {
    id: "persona-os",
    name: "Persona Digital Operating Environment",
    repository: "FEEXSYSTEMS-Persona-Digital-Portfolio",
    description: "A spatial digital environment for exploring the Persona, systems, technologies and engineering relationships.",
    domain: "Intelligence",
    status: "active",
    visibility: "public",
    technologies: ["JavaScript", "Three.js", "WebGL"],
    featured: true,
    image: "/media/feex/feex-architecture-board.webp",
  },
  {
    id: "yurrheeler-med-advisor",
    name: "Yurrheeler Med Advisor",
    repository: "yurrheeler-med-advisor",
    description: "AI-oriented healthcare application and medical-advisor engineering project.",
    domain: "Healthcare",
    status: "active",
    visibility: "public",
    technologies: ["TypeScript", "React", "AI"],
    featured: true,
    image: "/media/feex/yurrhealer-lab.webp",
  },
  {
    id: "kappaxchangefin",
    name: "KappaXchangeFin",
    repository: "kappaxchangefin",
    description: "Financial infrastructure project within the FEEXSYSTEMS engineering ecosystem.",
    domain: "Finance",
    status: "active",
    visibility: "public",
    technologies: ["TypeScript", "Finance", "APIs"],
    featured: true,
    image: "/media/feex/kappaxchangefin-ledger.webp",
  },
  {
    id: "holokai-systems-labs",
    name: "HoloKai Systems Labs",
    repository: "HoloKai-Systems-Labs",
    description: "Research and systems work exploring civilization intelligence and knowledge interfaces.",
    domain: "Research",
    status: "research",
    visibility: "public",
    technologies: ["TypeScript", "AI", "Knowledge Systems"],
    image: "/media/feex/holokai-guardians-armor.webp",
  },
  {
    id: "vyra-labs",
    name: "VYRA Labs",
    repository: "VYRA-LABS",
    description: "Experimental systems laboratory within the broader FEEXSYSTEMS ecosystem.",
    domain: "Research",
    status: "research",
    visibility: "public",
    technologies: ["TypeScript", "AI", "Systems"],
    image: "/media/feex/ai-neural-core.webp",
  },
  {
    id: "3wm-sonik-labs",
    name: "3WM SONIK Labs",
    repository: "3WM-SONIK-LABS",
    description: "Three-world-model research and engineering laboratory.",
    domain: "Intelligence",
    status: "research",
    visibility: "public",
    technologies: ["TypeScript", "World Models", "AI"],
    image: "/media/feex/sonik-audio-dsp.webp",
  },
];

export const githubRepositoryUrl = (repository) =>
  `https://github.com/FeexSystems/${repository}`;
