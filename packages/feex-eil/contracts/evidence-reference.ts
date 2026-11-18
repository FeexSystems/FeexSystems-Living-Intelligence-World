/**
 * FEEX Embodied Intelligence Layer — Evidence Reference Contract
 *
 * Preserves HoloKai epistemic vocabulary. Lowest status in a bundle governs
 * disclosure requirements. Fictional content always requires disclosure.
 */

export const EPISTEMIC_STATUSES = [
  "ESTABLISHED",
  "SCHOLARLY_DEBATE",
  "TRADITION",
  "ESOTERIC",
  "SPECULATIVE",
  "FICTIONAL",
] as const;

export type EpistemicStatus = (typeof EPISTEMIC_STATUSES)[number];

/** Ordering from strongest to weakest for lowest-status computation. */
const EPISTEMIC_RANK: Record<EpistemicStatus, number> = {
  ESTABLISHED: 5,
  SCHOLARLY_DEBATE: 4,
  TRADITION: 3,
  ESOTERIC: 2,
  SPECULATIVE: 1,
  FICTIONAL: 0,
};

export interface EvidenceReference {
  evidenceId: string;
  entityId: string;
  source: string;
  epistemicStatus: EpistemicStatus;
  /** Optional. Must only be populated by a defined evidence-evaluation process. */
  confidence?: number;
  verifiedAt?: string; // ISO 8601 UTC
  url?: string;
  commitSha?: string;
  filePath?: string;
}

export interface EvidenceBundle {
  bundleId: string;
  references: EvidenceReference[];
  /** Computed: weakest epistemic status present. */
  lowestEpistemicStatus: EpistemicStatus;
  /** Computed: true if any reference is FICTIONAL. */
  containsFictional: boolean;
  /** Computed: true if disclosure is required by policy. */
  requiresDisclosure: boolean;
  createdAt: string; // ISO 8601 UTC
}

export const DISCLOSURE_REQUIREMENTS = [
  "NONE",
  "SUBTLE",
  "PROMINENT",
  "REQUIRED",
] as const;
export type DisclosureRequirement = (typeof DISCLOSURE_REQUIREMENTS)[number];

export function lowestStatus(refs: EvidenceReference[]): EpistemicStatus {
  if (refs.length === 0) return "SPECULATIVE";
  return refs.reduce((min, ref) =>
    EPISTEMIC_RANK[ref.epistemicStatus] < EPISTEMIC_RANK[min.epistemicStatus]
      ? ref
      : min,
  ).epistemicStatus;
}

export function buildEvidenceBundle(
  bundleId: string,
  references: EvidenceReference[],
): EvidenceBundle {
  const lowest = lowestStatus(references);
  const containsFictional = references.some(
    (r) => r.epistemicStatus === "FICTIONAL",
  );
  return {
    bundleId,
    references,
    lowestEpistemicStatus: lowest,
    containsFictional,
    requiresDisclosure: containsFictional || lowest === "SPECULATIVE",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Returns the disclosure level the renderer must apply.
 * Never returns a level weaker than the bundle requires.
 */
export function disclosureForBundle(
  bundle: EvidenceBundle,
): DisclosureRequirement {
  if (bundle.containsFictional) return "REQUIRED";
  switch (bundle.lowestEpistemicStatus) {
    case "ESTABLISHED":
      return "NONE";
    case "SCHOLARLY_DEBATE":
    case "TRADITION":
      return "SUBTLE";
    case "ESOTERIC":
      return "PROMINENT";
    case "SPECULATIVE":
    case "FICTIONAL":
      return "REQUIRED";
    default:
      return "REQUIRED";
  }
}
