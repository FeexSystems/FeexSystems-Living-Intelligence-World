/**
 * FEEX EIL — Embodied Intelligence Layer
 * Contract: Evidence Reference  v0.1.0
 *
 * Preserves HoloKai's existing epistemic vocabulary.
 * Every factual claim an agent makes must be traceable to an EvidenceReference.
 *
 * Rules:
 *   - `confidence` MUST be omitted when not supplied by a calibrated source.
 *   - `verifiedAt` is the timestamp of the most recent evidence check,
 *     not the timestamp of the original source.
 *   - FICTIONAL status must be visually labeled in every rendering context.
 *   - SPECULATIVE and ESOTERIC content must carry a UI disclosure.
 */

export type EpistemicStatus =
  | "ESTABLISHED" // Peer-reviewed or institutional consensus
  | "SCHOLARLY_DEBATE" // Active academic disagreement; majority position exists
  | "TRADITION" // Cultural or oral tradition; not independently verified
  | "ESOTERIC" // Specialist or initiatory knowledge; limited verification
  | "SPECULATIVE" // Reasoned inference; not empirically confirmed
  | "FICTIONAL"; // Explicitly non-factual; MUST be labeled in UI

export const EPISTEMIC_STATUSES = [
  "ESTABLISHED",
  "SCHOLARLY_DEBATE",
  "TRADITION",
  "ESOTERIC",
  "SPECULATIVE",
  "FICTIONAL",
] as const satisfies readonly EpistemicStatus[];

export interface EvidenceReference {
  /** UUID v4 */
  evidenceId: string;
  /** Entity in the World Model this evidence describes */
  entityId: string;
  /**
   * Source identifier — URI, DOI, commit SHA, or canonical registry path.
   * Must be non-empty; use "internal:world-model" for database-backed facts.
   */
  source: string;
  epistemicStatus: EpistemicStatus;
  /**
   * Calibrated confidence in [0, 1].
   * MUST be omitted when not supplied by a calibrated source.
   * Never infer or default.
   */
  confidence?: number;
  /**
   * ISO 8601 timestamp of the most recent verification check.
   * Omit for FICTIONAL and SPECULATIVE where no verification applies.
   */
  verifiedAt?: string;
  /** Git commit SHA when the evidence is code-backed. */
  commitSha?: string;
  /** Repository file path when the evidence is code-backed. */
  filePath?: string;
  /** Human-readable citation for rendering in evidence panels. */
  citation?: string;
  /** Language of the source document (BCP 47) */
  language?: string;
  url?: string;
}

export interface EvidenceBundle {
  /** Correlates back to the AgentStateEvent.correlationId */
  correlationId: string;
  references: EvidenceReference[];
  /** Computed: weakest epistemic status present. */
  lowestEpistemicStatus: EpistemicStatus;
  /** Computed: true if any reference is FICTIONAL. */
  containsFictional: boolean;
  /** Computed: true if disclosure is required by policy. */
  requiresDisclosure: boolean;
  createdAt?: string; // ISO 8601 UTC
}

/** @deprecated Use EvidenceBundle.correlationId. Kept for earlier drafts. */
export type EvidenceBundleId = string;

export type DisclosureRequirement = {
  level: "NONE" | "SUBTLE" | "PROMINENT" | "REQUIRED";
  message: string;
};

/** Ordering from strongest to weakest for lowest-status computation. */
export const EPISTEMIC_RANK: Readonly<Record<EpistemicStatus, number>> = {
  ESTABLISHED: 5,
  SCHOLARLY_DEBATE: 4,
  TRADITION: 3,
  ESOTERIC: 2,
  SPECULATIVE: 1,
  FICTIONAL: 0,
};

export function lowestStatus(refs: EvidenceReference[]): EpistemicStatus {
  if (refs.length === 0) return "SPECULATIVE";
  return refs.reduce((min, ref) =>
    EPISTEMIC_RANK[ref.epistemicStatus] < EPISTEMIC_RANK[min.epistemicStatus]
      ? ref
      : min,
  ).epistemicStatus;
}

export function buildEvidenceBundle(
  correlationId: string,
  references: EvidenceReference[],
): EvidenceBundle {
  const lowest = lowestStatus(references);
  const containsFictional = references.some(
    (r) => r.epistemicStatus === "FICTIONAL",
  );
  return {
    correlationId,
    references,
    lowestEpistemicStatus: lowest,
    containsFictional,
    // Any status weaker than ESTABLISHED requires some disclosure.
    requiresDisclosure: EPISTEMIC_RANK[lowest] < EPISTEMIC_RANK.ESTABLISHED,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Returns the disclosure level the renderer must apply.
 * Never returns a level weaker than the bundle requires.
 *
 * Derived fields are recomputed from `references` rather than trusted:
 * callers may hold an unvalidated or legacy bundle whose flags contradict
 * its contents, and disclosure is a safety property — it must fail closed.
 */
export function disclosureForBundle(
  bundle: EvidenceBundle,
): DisclosureRequirement {
  const containsFictional = bundle.references.some(
    (r) => r.epistemicStatus === "FICTIONAL",
  );
  const lowest = lowestStatus(bundle.references);
  if (containsFictional) {
    return {
      level: "REQUIRED",
      message: "This content is fictional and not presented as factual.",
    };
  }
  if (lowest === "SPECULATIVE") {
    return {
      level: "PROMINENT",
      message:
        "This response includes speculative inference not empirically confirmed.",
    };
  }
  if (lowest === "ESOTERIC") {
    return {
      level: "PROMINENT",
      message:
        "This response draws on specialist or initiatory knowledge sources.",
    };
  }
  if (EPISTEMIC_RANK[lowest] < EPISTEMIC_RANK.ESTABLISHED) {
    return {
      level: "SUBTLE",
      message: "Sources include tradition or scholarly debate.",
    };
  }
  return { level: "NONE", message: "" };
}
