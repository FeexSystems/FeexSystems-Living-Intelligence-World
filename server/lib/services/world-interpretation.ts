/**
 * World interpretation primitives (Mission 003) — pure, DB-free, testable.
 *
 * Governing rule: the LLM interprets the World Model; it never becomes it.
 * Claims may only cite evidence ids that were actually retrieved. Fabricated
 * ids are dropped and the claim is marked unsupported.
 */

import {
  InterpretedClaim,
  WorldEvidenceRef,
} from '../../../shared/world-intelligence';
import { modelInterpretationSchema } from '../validations/world-intelligence';

export interface CanonicalContext {
  project: {
    id: string;
    name: string;
    repository: string;
    description: string | null;
    url: string;
    lastObservedAt: string;
  };
  evidence: WorldEvidenceRef[];
  artifactCount: number;
  relationshipCount: number;
}

export interface ParsedInterpretation {
  answer: string;
  claims: InterpretedClaim[];
  limitations: string[];
  confidence: number;
  fabricatedCitationCount: number;
}

/** Validate raw model output. Returns null when the contract is not satisfied. */
export function parseModelInterpretation(raw: unknown): {
  answer: string;
  claims: Array<{ text: string; evidenceIds: string[] }>;
  limitations: string[];
  confidence: number;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = modelInterpretationSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

/**
 * Keep only evidence ids that were actually retrieved. A claim with no
 * surviving id is explicitly unsupported.
 */
export function validateClaims(
  claims: Array<{ text: string; evidenceIds: string[] }>,
  allowedEvidenceIds: Iterable<string>
): { claims: InterpretedClaim[]; fabricatedCitationCount: number; unsupportedCount: number } {
  const allowed = new Set(allowedEvidenceIds);
  let fabricatedCitationCount = 0;
  let unsupportedCount = 0;

  const validated = claims.map((claim) => {
    const kept = claim.evidenceIds.filter((id) => allowed.has(id));
    fabricatedCitationCount += claim.evidenceIds.length - kept.length;
    const supported = kept.length > 0;
    if (!supported) unsupportedCount += 1;
    return { text: claim.text, evidenceIds: kept, supported };
  });

  return { claims: validated, fabricatedCitationCount, unsupportedCount };
}

/**
 * Deterministic interpretation used when no provider is configured or the model
 * output is invalid. It makes no claims beyond what canonical records contain.
 */
export function buildDeterministicInterpretation(context: CanonicalContext): ParsedInterpretation {
  const evidence = context.evidence;
  const limitations = [
    'No AI provider is configured or the model response was invalid; this is a deterministic summary of canonical records only.',
    'No hypotheses, recommendations or causal claims are included.',
  ];

  if (evidence.length === 0) {
    limitations.push('No evidence records are stored for this project, so no claim can be supported.');
  }

  const evidenceLines = evidence
    .slice(0, 5)
    .map((e) => `- ${e.evidenceType} (${e.sourceRef ?? e.sourceUrl}) observed ${e.observedAt}`);

  const answer = [
    `${context.project.name} (${context.project.repository}) is a canonical World Model record.`,
    context.project.description ? `Recorded description: ${context.project.description}` : 'No description is recorded.',
    `Stored evidence records: ${evidence.length}. Artifacts: ${context.artifactCount}. Relationships: ${context.relationshipCount}.`,
    evidenceLines.length ? `Most recent evidence:\n${evidenceLines.join('\n')}` : 'No evidence records available.',
  ].join('\n');

  return {
    answer,
    // Deterministic mode intentionally emits no interpretive claims.
    claims: [],
    limitations,
    confidence: 0,
    fabricatedCitationCount: 0,
  };
}

export const INTERPRETATION_SYSTEM_PROMPT = [
  'You interpret a canonical engineering World Model. You do NOT create facts.',
  'Use ONLY the canonical project fields and evidence records supplied.',
  'Every claim you make MUST cite one or more evidence ids from the provided list.',
  'Never invent evidence ids, file paths, commit SHAs or URLs.',
  'If the evidence does not support a statement, put it in "limitations" instead of "claims".',
  'Return ONLY JSON: { "answer": string, "claims": [{ "text": string, "evidenceIds": string[] }],',
  '  "limitations": string[], "confidence": number 0..1 }',
].join('\n');

export function buildInterpretationUserPrompt(context: CanonicalContext, question: string): string {
  return [
    `Question: ${question}`,
    '',
    'Canonical project:',
    JSON.stringify(context.project, null, 2),
    '',
    `Artifacts: ${context.artifactCount}; Relationships: ${context.relationshipCount}`,
    '',
    'Evidence records (id | type | source):',
    ...context.evidence.map((e) => `${e.id} | ${e.evidenceType} | ${e.sourceRef ?? e.sourceUrl}`),
    '',
    'Cite only the evidence ids listed above.',
  ].join('\n');
}
