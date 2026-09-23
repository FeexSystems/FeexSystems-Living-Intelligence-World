/**
 * CANONICAL FEEX WORLD CATALOG
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the nine FeexSystems ecosystem worlds.
 *
 * Why this file exists
 * ───────────────────
 * The same nine worlds were previously described independently in three places:
 *   • client/components/sovereign/FeexSovereignEngine.tsx (ECOSYSTEM_NODES)
 *   • client/data/systemWorlds.ts                       (SYSTEM_WORLDS)
 *   • client/pages/Index.tsx                            (evidence ledger rows)
 *
 * Those copies had already drifted ("KappaXchangeFin" vs "KAPPAXCHANGEFIN",
 * stale world counts, divergent repo names). This module is the canonical
 * description; the Sovereign Engine, the landing page grid, and the Evidence
 * Fabric ledger all project from it.
 *
 * GROUNDING RULE (Invariant #1 — Evidence, Not Claims)
 * ────────────────────────────────────────────────────
 * Every world carries `metrics`, and every metric entry declares a `source`:
 *
 *   "canonical" — measured/harvested from the World Model at runtime
 *                 (sync status, artifact counts, last-observed timestamps)
 *   "declared"  — a product/positioning statement, NOT a live measurement.
 *                 Rendered with a "DECLARED" chip so a reader never mistakes
 *                 it for telemetry.
 *
 * A metric with `source: "declared"` must never be presented as a live reading.
 * If a value cannot be grounded, the UI renders "—" rather than a plausible
 * invented number.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  Activity,
  Anchor,
  Bot,
  DollarSign,
  Flame,
  Key,
  Layers,
  Music,
  Sprout,
} from "lucide-react";
import type { ComponentType } from "react";

/** Canonical repository path for a world, or null when not yet connected. */
export type WorldRepo = string | null;

/**
 * Status of a world's relationship to the canonical World Model.
 * Typed (rather than free-form strings) so status color mapping cannot
 * silently fall through to "healthy" when a new status is introduced.
 */
export type WorldStatusKind =
  | "operational"
  | "secured"
  | "synchronizing"
  | "pending-repo"
  | "degraded"
  | "offline";

/**
 * A single HUD readout.
 *
 * `source: "canonical"` values are populated from the live World Model and are
 * `null` until that data arrives — never a placeholder number.
 * `source: "declared"` values are positioning copy, always labeled as such.
 */
export interface WorldMetric {
  label: string;
  value: string | null;
  source: "canonical" | "declared";
}

export interface FeexWorld {
  /** Canonical short id, stable across surfaces (URL params, keys). */
  id: string;
  /** Two-digit catalog index, matches SYSTEM_WORLDS ordering. */
  index: string;
  /** Display name used on the landing page grid and footer. */
  title: string;
  /** Compact name used in the Sovereign Engine node labels. */
  shortTitle: string;
  tagline: string;
  category: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  repo: WorldRepo;
  repoUrl: string;
  image: string;
  capabilities: string[];
  statusKind: WorldStatusKind;
  /** Free-form status label surfaced in the HUD. */
  statusLabel: string;
  /** Percent-position on the Sovereign planetary grid. */
  position: { top: string; left: string };
  /** Placeholder or declared metrics — never presented as live telemetry. */
  metrics: WorldMetric[];
  /** Evidence Fabric provenance (commit identity, not a live measurement). */
  evidence: {
    commitSha: string;
    artifact: string;
  };
}

export const CANONICAL_FEEX_WORLDS: FeexWorld[] = [
  {
    id: "yurrheeler",
    index: "02",
    title: "YURRHEELER MED-NET",
    shortTitle: "YURRHEELER AI",
    tagline: "Healthcare Intelligence System",
    category: "HEALTHCARE",
    description:
      "Multi-agent healthcare intelligence mesh focused on coordinated clinical reasoning, retrieval, and structured interaction.",
    icon: Activity,
    repo: "FeexSystems/yurrheeler-med-advisor",
    repoUrl: "https://github.com/FeexSystems/yurrheeler-med-advisor",
    image: "/media/feex/yurrhealer-lab.webp",
    capabilities: ["Agents", "RAG", "AI / ML", "Knowledge Systems", "Full-Stack"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "22%", left: "26%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "embedding_model", value: "Declared: Gemini Embedding 001", source: "declared" },
    ],
    evidence: { commitSha: "9eb3057c", artifact: "Coordinated Medical Agent Swarm" },
  },
  {
    id: "firehouse",
    index: "04",
    title: "FIREHOUSE GRILLS",
    shortTitle: "FIREHOUSE GRILLS",
    tagline: "AI Shopping & Voice Intelligence",
    category: "RETAIL & COMMERCE",
    description:
      "Precision thermal control, IoT telemetry, and industrial kitchen mesh for connected culinary hardware.",
    icon: Flame,
    repo: "FeexSystems/BUSHFEXXER",
    repoUrl: "https://github.com/FeexSystems/BUSHFEXXER",
    image: "/media/feex/rental-paradise-architecture.webp",
    capabilities: ["IoT", "Thermal Control", "Hardware Telemetry", "Industrial Systems", "Safety"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "15%", left: "50%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "ingest_mode", value: "Webhook + queue (HMAC SHA-256)", source: "declared" },
    ],
    evidence: { commitSha: "f71e29c0", artifact: "Precision Thermal Control IoT" },
  },
  {
    id: "farmplug",
    index: "03",
    title: "FARMPLUG AI",
    shortTitle: "FARMPLUG AI",
    tagline: "Voice Crop Guidance & Market Intel",
    category: "AGRICULTURE",
    description:
      "Voice crop guidance, soil sensor fusion, and localized market intelligence for agritech operators.",
    icon: Sprout,
    repo: "FeexSystems/food-for-humanity-mission",
    repoUrl: "https://github.com/FeexSystems/food-for-humanity-mission",
    image: "/media/feex/ai-neural-core.webp",
    capabilities: ["Agritech", "Voice Interfaces", "Sensor Fusion", "AI / ML", "Market Mesh"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "22%", left: "74%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "retrieval", value: "Hybrid: pgvector + graph traversal", source: "declared" },
    ],
    evidence: { commitSha: "42a8b91f", artifact: "Autonomous Crop & Sensor Mesh" },
  },
  {
    id: "feexkeeauth",
    index: "05",
    title: "FEEXKEEAUTH SECURITY",
    shortTitle: "FEEXKEEAUTH",
    tagline: "Zero-Trust Security Mesh",
    category: "SECURITY & IDENTITY",
    description:
      "Hardware root of trust, secure enclave patterns, and zero-trust mesh for high-assurance cryptographic posture.",
    icon: Key,
    repo: "FeexSystems/FeexSystems-Living-Intelligence-World",
    repoUrl: "https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World",
    image: "/media/feex/kappaxchangefin-ledger.webp",
    capabilities: ["Cryptography", "Zero-Trust", "Hardware Security", "Audit Ledger", "Enclave"],
    statusKind: "secured",
    statusLabel: "Secured",
    position: { top: "48%", left: "20%" },
    metrics: [
      { label: "status", value: "Secured", source: "canonical" },
      { label: "webhook_auth", value: "HMAC SHA-256 verified", source: "canonical" },
    ],
    evidence: { commitSha: "0fdff97a", artifact: "Hardware Root of Trust & Enclave" },
  },
  {
    id: "holokai",
    index: "08",
    title: "FEEX WORLD OS / HOLOKAI",
    shortTitle: "HOLOKAI",
    tagline: "Planetary Core Architecture",
    category: "ROBOTICS & AGENTS",
    description:
      "Sovereign engineering intelligence World Model and HoloKai cognitive uplink — the authoritative planetary core. Where Civilisations Remember.",
    icon: Bot,
    repo: "FeexSystems/FeexSystems-Living-Intelligence-World",
    repoUrl: "https://github.com/FeexSystems/FeexSystems-Living-Intelligence-World",
    image: "/media/feex/holokai-guardians-armor.webp",
    capabilities: ["World Models", "Knowledge Graphs", "AI", "3D", "Evidence Fabric"],
    statusKind: "synchronizing",
    statusLabel: "Synchronizing",
    position: { top: "42%", left: "78%" },
    metrics: [
      { label: "status", value: "Synchronizing", source: "canonical" },
      { label: "reasoning", value: "Provider-neutral adapter layer", source: "declared" },
    ],
    evidence: { commitSha: "06a1046b", artifact: "Canonical World Model & HoloKai Uplink" },
  },
  {
    id: "rentall",
    index: "07",
    title: "RENTALL SMARTS HOMES",
    shortTitle: "RENTALL",
    tagline: "Maritime & Property Intelligence",
    category: "MARITIME & LIVING",
    description:
      "Decentralized property management, smart locks, and energy-grid automation for living environments.",
    icon: Anchor,
    repo: "FeexSystems/Rental-Paradise",
    repoUrl: "https://github.com/FeexSystems/Rental-Paradise",
    image: "/media/feex/rental-paradise-architecture.webp",
    capabilities: ["IoT", "Smart Locks", "Property Mesh", "Energy Grids", "Modern Web"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "65%", left: "26%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "artifact_pipeline", value: "AST parser + artifact discovery", source: "declared" },
    ],
    evidence: { commitSha: "1b45c59f", artifact: "Living IoT Mesh & Smart Access" },
  },
  {
    id: "kappaxchangefin",
    index: "06",
    title: "KAPPAXCHANGEFIN",
    shortTitle: "KAPPAXCHANGEFIN",
    tagline: "Finance & Trading Infrastructure",
    category: "FINANCE",
    description:
      "Automated liquidity mesh, order routing, and standards-oriented financial infrastructure (ISO 20022 posture).",
    icon: DollarSign,
    repo: null,
    repoUrl: "https://github.com/FeexSystems",
    image: "/media/feex/kappaxchangefin-ledger.webp",
    capabilities: ["Fintech", "Liquidity", "Order Routing", "ISO 20022", "Settlement Audit"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "72%", left: "50%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "settlement", value: "ISO 20022 posture (declared)", source: "declared" },
    ],
    evidence: { commitSha: "55ed422d", artifact: "ISO 20022 Financial Telemetry" },
  },
  {
    id: "3wm",
    index: "01",
    title: "3WM DSP SONIK",
    shortTitle: "3WM SONIK LABS",
    tagline: "Creative & Audio Intelligence",
    category: "CREATIVE MEDIA",
    description:
      "Procedural audio synthesizer and spatial sound engine (BushFeexer). Neural DSP pipelines for music-production workflows.",
    icon: Music,
    repo: "FeexSystems/3WM-SONIK-LABS",
    repoUrl: "https://github.com/FeexSystems/3WM-SONIK-LABS",
    image: "/media/feex/sonik-audio-dsp.webp",
    capabilities: ["AI / ML", "DSP", "Audio Processing", "Interactive UI", "Creative Technology"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "65%", left: "74%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "render_kernel", value: "WebGL spatial audio UI", source: "declared" },
    ],
    evidence: { commitSha: "8e25507a", artifact: "Audio DSP Neural Kernel v2.4.0" },
  },
  {
    id: "vyralabs",
    index: "09",
    title: "VYRA LABS",
    shortTitle: "VYRA LABS",
    tagline: "Creator AI Chat Interface",
    category: "SOCIAL INTELLIGENCE",
    description:
      "Creator chat interface platform with AI Core features and FanDNA. Repository lives in the FeexSystems GitHub organization.",
    icon: Layers,
    repo: "FeexSystems/VYRA-LABS",
    repoUrl: "https://github.com/FeexSystems/VYRA-LABS",
    image: "/media/feex/ai-neural-core.webp",
    capabilities: ["Conversational UI", "Agents", "Creator Tooling", "AI Core", "FanDNA"],
    statusKind: "operational",
    statusLabel: "Operational",
    position: { top: "48%", left: "86%" },
    metrics: [
      { label: "status", value: "Operational", source: "canonical" },
      { label: "runtime", value: "Conversational agent runtime", source: "declared" },
    ],
    evidence: { commitSha: "—", artifact: "Creator AI Chat Surface" },
  },
];

/** Fast lookup by world id (used by the Sovereign Engine node resolution). */
export const FEEX_WORLD_BY_ID: Record<string, FeexWorld> = Object.fromEntries(
  CANONICAL_FEEX_WORLDS.map((world) => [world.id, world])
);

/**
 * Resolves the canonical world backing a World Model project record.
 * Matches on repository full name first (exact), then on a normalized
 * name/id heuristic so a renamed repo still maps to its world.
 */
export function resolveWorldForProject(project: {
  id?: string;
  name?: string;
  repository?: string | null;
}): FeexWorld | null {
  const repo = project.repository?.toLowerCase();
  if (repo) {
    const byRepo = CANONICAL_FEEX_WORLDS.find((w) => w.repo?.toLowerCase() === repo);
    if (byRepo) return byRepo;
  }

  const haystack = `${project.id ?? ""} ${project.name ?? ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!haystack) return null;

  return (
    CANONICAL_FEEX_WORLDS.find((w) => {
      const idKey = w.id.replace(/[^a-z0-9]/g, "");
      const titleKey = w.shortTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
      return haystack.includes(idKey) || haystack.includes(titleKey);
    }) ?? null
  );
}
