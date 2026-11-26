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

 





 // Explicitly non-factual; MUST be labeled in UI

export const EPISTEMIC_STATUSES = [
  "ESTABLISHED",
  "SCHOLARLY_DEBATE",
  "TRADITION",
  "ESOTERIC",
  "SPECULATIVE",
  "FICTIONAL",
] ;























































/** Ordering from strongest to weakest for lowest-status computation. */
export const EPISTEMIC_RANK = {
  ESTABLISHED: 5,
  SCHOLARLY_DEBATE: 4,
  TRADITION: 3,
  ESOTERIC: 2,
  SPECULATIVE: 1,
  FICTIONAL: 0,
};

export function lowestStatus(refs) {
  if (refs.length === 0) return "SPECULATIVE";
  return refs.reduce((min, ref) =>
    EPISTEMIC_RANK[ref.epistemicStatus] < EPISTEMIC_RANK[min.epistemicStatus]
      ? ref
      : min,
  ).epistemicStatus;
}

export function buildEvidenceBundle(
  correlationId,
  references,
) {
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
  bundle,
) {
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
