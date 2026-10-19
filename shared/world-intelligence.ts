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
