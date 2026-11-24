/**
 * Phase 5 — Navigator evidence-reference extraction (pure).
 *
 * Harvests REAL evidence identifiers from an actual Navigator response
 * payload for the EIL agent-state projection. Only fields the backend
 * genuinely returned are used: project repository slugs ("owner/repo")
 * and artifact commit SHAs. Nothing is synthesized — when the response
 * carries no stable identifiers the result is empty and the planner
 * has no honest path to RESPONDING.
 *
 * `groundedEvidenceCount` is deliberately NOT used: it is an aggregate
 * count, not a stable evidence ID (see normalizeNavigatorResponse).
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const DEFAULT_MAX_REFS = 8;

export function extractNavigatorEvidenceRefs(
  data: unknown,
  max: number = DEFAULT_MAX_REFS,
): string[] {
  if (!isRecord(data) || max <= 0) return [];
  const refs = new Set<string>();

  const projects = Array.isArray(data.projects) ? data.projects : [];
  for (const project of projects) {
    if (!isRecord(project)) continue;
    const repository = project.repository;
    if (typeof repository === "string" && repository.trim()) {
      refs.add(repository.trim());
    }
  }

  const artifacts = Array.isArray(data.artifacts) ? data.artifacts : [];
  for (const artifact of artifacts) {
    if (!isRecord(artifact)) continue;
    const sha = artifact.sha;
    if (typeof sha === "string" && sha.trim()) {
      refs.add(sha.trim());
    }
  }

  return [...refs].slice(0, max);
}
