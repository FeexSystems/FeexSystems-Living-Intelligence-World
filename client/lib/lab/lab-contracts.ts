/**
 * lab-contracts.ts — FEEX-SORL lab runtime contracts.
 *
 * Types and constants shared by the lab hooks, R3F components, and DOM
 * overlay. The browser scene is a READ PROJECTION of the World Model —
 * nothing here creates canonical state, calls agents, or actuates
 * hardware.
 */

import type { LabZoneId } from "./lab-zones";

/** Camera framing modes for the single landing Canvas. */
export type LabCameraMode = "overview" | "zone" | "humanoid";

/** Deterministic navigation lifecycle — no randomness, no inferred state. */
export type LabNavPhase =
  | "idle"          // parked at current viewpoint
  | "traveling"     // interpolating along waypoint path
  | "arrived"       // settled at target; brief settle window
  | "disabled";     // reduced-motion / capability fallback

export interface LabNavigationState {
  phase: LabNavPhase;
  /** Zone the camera is travelling to / parked at. */
  targetZone: LabZoneId | "overview" | "humanoid" | null;
  /** Monotonic transition counter — increments per request. */
  transitionId: number;
}

/** Hotspot interaction kinds — all resolve to local UI intents only. */
export type LabHotspotKind =
  | "inspect"     // open zone inspector
  | "navigate"    // travel to zone
  | "focus"       // camera focus on equipment
  | "info";       // static label only

export interface LabHotspot {
  id: string;
  zoneId: LabZoneId;
  kind: LabHotspotKind;
  /** Scene-space anchor [x, y, z] (three.js coords, y-up). */
  position: readonly [number, number, number];
  label: string;
}

/** Per-zone presentation status — honest, locally derived only. */
export type LabZoneStatus = "unvisited" | "active" | "inspected";

export interface LabZoneRuntime {
  zoneId: LabZoneId;
  status: LabZoneStatus;
  /** True once the visitor has navigated to this zone. */
  visited: boolean;
}

/** Asset manifest entry — GLB chunk or procedural fallback descriptor. */
export interface LabAssetEntry {
  id: string;
  /** Public URL of the GLB chunk; null → procedural greybox used. */
  src: string | null;
  /** Content hash from the Phase 4 provenance manifest. */
  sha256?: string;
  bytes?: number;
}

/** DOM inspector payload — pure read projection, no agent claims. */
export interface LabInspectorModel {
  zoneId: LabZoneId;
  zoneName: string;
  status: LabZoneStatus;
  /** Evidence references resolved in Phase 7; empty until then. */
  evidenceRefs: readonly string[];
  /** Always false until Phase 8 gates pass — OpenJarvis NOT CONNECTED. */
  agentConnected: false;
}

export const LAB_STATUS_LABELS: Record<LabZoneStatus, string> = {
  unvisited: "UNVISITED",
  active: "ACTIVE",
  inspected: "INSPECTED",
};
