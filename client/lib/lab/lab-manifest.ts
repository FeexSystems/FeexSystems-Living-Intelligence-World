/**
 * lab-manifest.ts — FEEX-SORL lab asset manifest.
 *
 * Two distinct registries live here, and they deliberately do NOT overlap:
 *
 * 1. `LAB_ASSETS` — Evidence Fabric entries. An entry only becomes a runtime
 *    `src` when BOTH the GLB is tracked in `public/models` AND its SHA-256 is
 *    recorded. Missing sha256 ⇒ `src: null` ⇒ the lab renders its procedural
 *    fallback and the inspector reports the asset honestly as unavailable.
 *    Nothing here may point at a file that does not exist.
 *
 * 2. `LAB_ASSET_FILES` / `LAB_ZONE_PROPS` — the Gate 7 zone-furniture registry
 *    actually loaded by `LabZoneProps`. Those 13 Tripo/Blender prop GLBs ARE
 *    tracked and delivered (see `docs/assets/feex-sorl/gate5-report.json`).
 *
 * The lab shell is procedural (`LabEnvironment`) and the lab character is the
 * rollback synthetic GLB (see `humanoid.config.ts`), so neither has a
 * canonical manifest entry yet.
 */

import type { LabAssetEntry } from "./lab-contracts";
import type { LabZoneId } from "./lab-zones";

/**
 * Verified SHA-256 digests for tracked GLBs. Empty until Gate 5 sign-off
 * writes digests; an empty map is the honest state, not a placeholder hash.
 */
export const LAB_ASSET_SHA256: Record<string, string> = {};

/** Runtime shell GLB. Procedural (`LabEnvironment`) is the shipped fallback. */
export const LAB_SHELL_MODEL = {
  src: "/models/feex-sorl/feex_sorl_lab_v001.glb",
  /** Tracked in `public/models`? false ⇒ procedural greybox renders. */
  tracked: false,
} as const;

/**
 * Lab character candidates, ordered. Only the first (`active: true`) entry may
 * be used by the landing loader — the rollback synthetic GLB. The Tripo
 * candidate is tracked but untextured and unsigned-off, so it stays
 * `active: false` until visual, rig, clip and facial review plus licensing
 * clear.
 */
export const LAB_CHARACTER_ASSETS = [
  {
    id: "feex-sovereign-synthetic",
    src: "/models/feex-sovereign-synthetic.glb",
    kind: "rollback-synthetic",
    active: true,
  },
  {
    id: "feex-character-tripo",
    src: "/models/feex-sorl/character/feex-character-tripo.glb",
    kind: "tripo-candidate",
    active: false,
  },
] as const;

export const LAB_ASSETS: Record<string, LabAssetEntry> = {
  lab_shell: {
    id: "lab_shell",
    // No tracked shell GLB ⇒ procedural fallback is authoritative.
    src: LAB_SHELL_MODEL.tracked ? LAB_SHELL_MODEL.src : null,
    sha256: LAB_ASSET_SHA256.lab_shell,
  },
  humanoid: {
    id: "humanoid",
    // No validated MetaHuman/SORL web export has landed ⇒ null, so evidence
    // stays honest (SIMULATED rollback in lab-world-model).
    src: null,
    sha256: LAB_ASSET_SHA256.humanoid,
  },
};

/**
 * Zone → asset binding. `null` assetId = procedural zone furniture.
 * The manifestation values live in `LAB_ZONE_PROPS` below.
 */
export const LAB_ZONE_ASSETS: Record<LabZoneId, string | null> = {
  "command-centre": "sorl-cmd-console",
  "humanoid-bay": "sorl-humanoid-platform",
  "robotics-sim": "sorl-sim-platform",
  "ai-research": "sorl-server-rack",
  "bio-research": "sorl-lab-bench",
  "engineering-workshop": "sorl-fab-bench",
  "observation-gallery": "sorl-observation-deck",
};

/** Public path prefix for all SORL chunks. */
export const LAB_ASSET_BASE = "/models/feex-sorl";

// ---------------------------------------------------------------------------
// Gate 7 — Tripo/Blender GLB props (geometry-only phase, noir materials).
// Tripo GLBs are unit-normalized (max bbox dim = 1 m): `scale` is the real
// world size in metres. Offsets are scene coords relative to zone centre
// ([dx, height, dz]); +z faces the atrium for north zones.
// ---------------------------------------------------------------------------

export interface LabAssetFile {
  src: string;
  /** Real-world target size (m) for the unit-normalized GLB. */
  targetSize: number;
}

export const LAB_ASSET_FILES: Record<string, LabAssetFile> = {
  "sorl-cmd-console":        { src: "/models/feex-sorl/command-centre/sorl-cmd-console.glb",        targetSize: 2.2 },
  "sorl-evidence-wall":      { src: "/models/feex-sorl/command-centre/sorl-evidence-wall.glb",      targetSize: 4.5 },
  "sorl-workstation":        { src: "/models/feex-sorl/command-centre/sorl-workstation.glb",        targetSize: 1.6 },
  "sorl-humanoid-platform":  { src: "/models/feex-sorl/humanoid-bay/sorl-humanoid-platform.glb",    targetSize: 2.6 },
  "sorl-calibration-rig":    { src: "/models/feex-sorl/humanoid-bay/sorl-calibration-rig.glb",      targetSize: 2.4 },
  "sorl-robotic-arm":        { src: "/models/feex-sorl/robotics-sim/sorl-robotic-arm.glb",          targetSize: 1.6 },
  "sorl-sim-platform":       { src: "/models/feex-sorl/robotics-sim/sorl-sim-platform.glb",         targetSize: 3.2 },
  "sorl-server-rack":        { src: "/models/feex-sorl/ai-research/sorl-server-rack.glb",          targetSize: 2.2 },
  "sorl-lab-bench":          { src: "/models/feex-sorl/bio-research/sorl-lab-bench.glb",            targetSize: 2.4 },
  "sorl-lab-instrument":     { src: "/models/feex-sorl/bio-research/sorl-lab-instrument.glb",       targetSize: 0.8 },
  "sorl-sample-storage":     { src: "/models/feex-sorl/bio-research/sorl-sample-storage.glb",       targetSize: 2.0 },
  "sorl-fab-bench":          { src: "/models/feex-sorl/engineering-workshop/sorl-fab-bench.glb",    targetSize: 2.4 },
  // Real-scale procedural build — already metres, scale = 1.
  "sorl-observation-deck":   { src: "/models/feex-sorl/observation-gallery/sorl-observation-deck.glb", targetSize: 24.0 },
};

/** Noir tint ramp — subtle per-asset variation inside the palette. */
const FEEX_NOIR_TINT = {
  graphite: "#8a8a86",
  panel: "#5c5c58",
  steel: "#b8b8b4",
  silver: "#e8e8e6",
} as const;

export interface LabPropSpec {
  asset: keyof typeof LAB_ASSET_FILES;
  /** Scene-coord offset from zone centre [dx, y, dz]. */
  offset: readonly [number, number, number];
  /** Yaw in radians. */
  rotY?: number;
  /** Explicit scale override (real-scale assets like the deck). */
  scale?: number;
  /** Per-asset noir tint — multiplies the injected M_SORL_Prop material. */
  tint?: string;
}

export const LAB_ZONE_PROPS: Record<LabZoneId, readonly LabPropSpec[]> = {
  "command-centre": [
    { asset: "sorl-cmd-console",       offset: [0, 0, 2.6],  tint: FEEX_NOIR_TINT.steel },
    { asset: "sorl-evidence-wall",     offset: [0, 0, -3.4], tint: FEEX_NOIR_TINT.panel },
    { asset: "sorl-workstation",       offset: [-2.4, 0, 1.4], tint: FEEX_NOIR_TINT.graphite },
  ],
  "humanoid-bay": [
    { asset: "sorl-humanoid-platform", offset: [0, 0, 0],    tint: FEEX_NOIR_TINT.steel },
    { asset: "sorl-calibration-rig",   offset: [0, 0, -2.2], tint: FEEX_NOIR_TINT.graphite },
  ],
  "robotics-sim": [
    // SIMULATED assets — no physical actuation. Badge handled by zone label.
    { asset: "sorl-robotic-arm",       offset: [-1.8, 0, -1.2], tint: FEEX_NOIR_TINT.graphite },
    { asset: "sorl-sim-platform",      offset: [1.8, 0, 0.6],  tint: FEEX_NOIR_TINT.panel },
  ],
  "ai-research": [
    { asset: "sorl-server-rack",       offset: [-2.4, 0, -3.0], tint: FEEX_NOIR_TINT.graphite },
    { asset: "sorl-server-rack",       offset: [0, 0, -3.0],    tint: FEEX_NOIR_TINT.graphite },
    { asset: "sorl-server-rack",       offset: [2.4, 0, -3.0],  tint: FEEX_NOIR_TINT.graphite },
  ],
  "bio-research": [
    { asset: "sorl-lab-bench",         offset: [0, 0, 0.6],   tint: FEEX_NOIR_TINT.panel },
    { asset: "sorl-lab-instrument",    offset: [0, 0.75, 0.6], tint: FEEX_NOIR_TINT.silver },
    { asset: "sorl-sample-storage",    offset: [0, 0, 2.3],   tint: FEEX_NOIR_TINT.graphite },
  ],
  "engineering-workshop": [
    { asset: "sorl-fab-bench",         offset: [0, 0, 0],     tint: FEEX_NOIR_TINT.steel },
  ],
  "observation-gallery": [
    { asset: "sorl-observation-deck",  offset: [0, 0, 1.2],   scale: 1, tint: undefined }, // own materials, real-scale
  ],
};
