/**
 * lab-world-model.ts — FEEX-SORL World Model read projection (Phase 7).
 *
 * Maps each laboratory zone to canonical World Model entities and
 * resolves their Evidence Fabric provenance. The browser scene remains
 * a READ PROJECTION: this module never mutates canonical state and
 * never fabricates evidence — every displayed reference traces to
 * PLANETARY_ECOSYSTEMS via getWorldEvidence, or is explicitly marked
 * SIMULATED / DESIGN_SPEC.
 */

import { getWorldEvidence, type WorldEvidenceView } from "../../landing/world/WorldModel";
import type { LabZoneId } from "./lab-zones";
import { LAB_ASSETS } from "./lab-manifest";
import type { EvidenceClass } from "../../world-model/registry/evidence";

export type LabEvidenceKind = "world" | "asset";

export interface LabEvidenceRef {
  kind: LabEvidenceKind;
  /** Canonical entity id (world id) or asset id. */
  id: string;
  label: string;
  /** Evidence class straight from the provenance record. */
  evidenceClass: EvidenceClass | "SIMULATED" | "UNAVAILABLE";
  source: string;
  verified: boolean;
  reference?: string;
  url?: string;
}

/** How a zone relates to a canonical world. */
export type LabZoneWorldRole = "primary-system" | "research-context";

export interface LabZoneWorldLink {
  worldId: string;
  role: LabZoneWorldRole;
}

/**
 * Zone → canonical world links. Honest mapping: the laboratory is a
 * projection of THIS platform, so zones primarily link to the worlds
 * whose systems they house; research wings additionally link the
 * domains they study.
 */
export const LAB_ZONE_WORLD_LINKS: Record<LabZoneId, readonly LabZoneWorldLink[]> = {
  "command-centre": [
    { worldId: "feexsystems", role: "primary-system" },
  ],
  "humanoid-bay": [
    { worldId: "feexsystems", role: "primary-system" },
  ],
  "robotics-sim": [
    { worldId: "feexsystems", role: "primary-system" },
  ],
  "ai-research": [
    { worldId: "feexsystems", role: "primary-system" },
  ],
  "bio-research": [
    { worldId: "feexsystems", role: "primary-system" },   // HoloKai knowledge record
    { worldId: "farmplug", role: "research-context" },    // botanical domain
    { worldId: "yurrheeler", role: "research-context" },  // life-science domain
  ],
  "engineering-workshop": [
    { worldId: "feexsystems", role: "primary-system" },
  ],
  "observation-gallery": [
    { worldId: "feexsystems", role: "primary-system" },
  ],
};

function worldRef(view: WorldEvidenceView, role: LabZoneWorldRole): LabEvidenceRef {
  return {
    kind: "world",
    id: view.worldId,
    label: `${view.worldName}${role === "research-context" ? " (RESEARCH CONTEXT)" : ""}`,
    evidenceClass: view.evidenceClass,
    source: view.source,
    verified: view.verified,
    reference: view.reference,
    url: view.repositoryUrl,
  };
}

function assetRef(zoneId: LabZoneId): LabEvidenceRef {
  // Zone GLB chunks do not exist yet — honest UNAVAILABLE until the
  // Phase 4 manifest lands with sha256 provenance.
  const assetId = `zone_${zoneId.replace(/-/g, "_")}`;
  const entry = LAB_ASSETS[assetId];
  if (entry?.src && entry.sha256) {
    return {
      kind: "asset",
      id: assetId,
      label: `ZONE ASSET ${assetId}`,
      evidenceClass: "CANONICAL",
      source: "world-model",
      verified: true,
      reference: entry.sha256,
    };
  }
  return {
    kind: "asset",
    id: assetId,
    label: `ZONE ASSET ${assetId}`,
    evidenceClass: "UNAVAILABLE",
    source: "static-registry",
    verified: false,
    reference: "PENDING_PHASE4_MANIFEST",
  };
}

/** All evidence references for a zone, world links first. */
export function getLabZoneEvidence(zoneId: LabZoneId): LabEvidenceRef[] {
  const links = LAB_ZONE_WORLD_LINKS[zoneId] ?? [];
  const refs: LabEvidenceRef[] = [];
  for (const link of links) {
    const view = getWorldEvidence(link.worldId);
    if (view) refs.push(worldRef(view, link.role));
  }
  refs.push(assetRef(zoneId));
  return refs;
}

/** Evidence refs for the humanoid character asset itself. */
export function getLabCharacterEvidence(): LabEvidenceRef {
  const entry = LAB_ASSETS.humanoid;
  if (entry?.src && entry.sha256) {
    return {
      kind: "asset",
      id: "humanoid",
      label: "SOVEREIGN HUMANOID GLB",
      evidenceClass: "CANONICAL",
      source: "world-model",
      verified: true,
      reference: entry.sha256,
    };
  }
  return {
    kind: "asset",
    id: "humanoid",
    label: "SOVEREIGN HUMANOID GLB",
    evidenceClass: "SIMULATED",
    source: "simulation",
    verified: false,
    reference: "/models/feex-sovereign-synthetic.glb (ROLLBACK)",
  };
}

// ---------------------------------------------------------------------------
// Revision-aware stale-data handling
// ---------------------------------------------------------------------------

/**
 * Fingerprint of the canonical registry projection this module consumed.
 * Computed once at module load; if the registry is ever swapped for a
 * server-synced revision, the fingerprint changes and stale detection
 * fires. Deterministic — same registry always yields the same value.
 */
export function getLabRegistryRevision(): string {
  // Cheap stable fingerprint over world ids + evidence classes.
  let h = 0;
  for (const link of Object.values(LAB_ZONE_WORLD_LINKS).flat()) {
    const view = getWorldEvidence(link.worldId);
    if (!view) continue;
    const s = `${view.worldId}:${view.evidenceClass}:${view.verified}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `wm-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

let baselineRevision: string | null = null;

/** Capture the baseline revision once (call on first projection). */
export function captureLabBaselineRevision(): string {
  if (baselineRevision === null) baselineRevision = getLabRegistryRevision();
  return baselineRevision;
}

/** True when the current registry revision differs from baseline. */
export function isLabProjectionStale(): boolean {
  return getLabRegistryRevision() !== captureLabBaselineRevision();
}
