/**
 * Feex World Intelligence — interpretation contracts (Mission 003).
 *
 * Canonical World Model records (projects, evidence, artifacts, relationships)
 * are authoritative. The types here describe AI *interpretations* of those
 * records and are explicitly separate from canonical state.
 */

export interface WorldEvidenceRef {
  id: string;
  evidenceType: string;
  sourceUrl: string;
  sourceRef: string | null;
  observedAt: string;
}

/** A single claim produced by a model, linked to retrieved evidence ids. */
export interface InterpretedClaim {
  text: string;
  /** Evidence ids that actually exist in the retrieved context. */
  evidenceIds: string[];
  /** False when no supporting evidence id survived validation. */
  supported: boolean;
}

export interface WorldInterpretationDTO {
  id: string;
  projectId: string;
  question: string;
  answer: string;
  claims: InterpretedClaim[];
  limitations: string[];
  confidence: number | null;
  provider: string;
  model: string | null;
  correlationId: string | null;
  supportedClaimCount: number;
  unsupportedClaimCount: number;
  createdAt: string;
}

export interface InterpretWorldRequest {
  projectId: string;
  question: string;
}

/** ============================================================================
 * Robotics / Holokai Extension Types
 * ============================================================================
 * Robotics capability taxonomy for the World Model graph. Robotics worlds are
 * modeled as first-class WorldModelProject entries with faceted metadata
 * (worldCategory="ROBOTICS", worldModality="CONTROL" or "SIMULATION") plus
 * robot-specific attributes exposed through shared types.
 */

/** A robot/machine entry in the FeexSystems robotics catalog. */
export interface RobotCatalogEntry {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  /** e.g. "articulated_arm", "mobile_base", "gripper", "drone", "humanoid" */
  robotClass: string | null;
  /** e.g. "industrial", "research", "education", "consumer" */
  domain: string | null;
  /** e.g. "PROPOSED", "ACTIVE", "INACTIVE", "ARCHIVED", "EOL" */
  lifecycle: string | null;
  capabilities: string[];
  degreesOfFreedom: number | null;
  payloadKg: number | null;
  reachMm: number | null;
  maxSpeedMs: number | null;
  powerRatingW: number | null;
  communicationProtocols: string[];
  holokaiIntegrated: boolean;
  worldModelProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A robotics task / execution request. */
export interface RoboticsTask {
  id: string;
  robotId: string;
  name: string;
  description: string | null;
  /** e.g. "PICK_AND_PLACE", "WELD", "NAVIGATE", "SCAN", "ASSEMBLE" */
  taskType: string;
  /** e.g. "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED" */
  status: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown> | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Holokai voice command sent to a robot. */
export interface HolokaiCommand {
  id: string;
  robotId: string | null;
  utterance: string;
  intent: string | null;
  entities: Record<string, unknown>;
  /** e.g. "RECOGNIZED", "EXECUTING", "COMPLETED", "FAILED", "REJECTED" */
  status: string;
  response: string | null;
  confidence: number | null;
  createdAt: Date;
}

/** Holokai voice modal context — which ecosystem/world is active. */
export interface HolokaiContext {
  activeEcosystem: string | null;
  robotId: string | null;
  taskId: string | null;
}

/** Faceted robotics filter options for the WorldFacetedFilter component. */
export interface RoboticsFacetOptions {
  robotClasses: Array<{ value: string; label: string; count: number }>;
  domains: Array<{ value: string; label: string; count: number }>;
  lifecycles: Array<{ value: string; label: string; count: number }>;
  protocols: Array<{ value: string; label: string; count: number }>;
}
