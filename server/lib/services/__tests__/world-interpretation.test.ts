import { describe, it, expect } from 'vitest';
import {
  buildDeterministicInterpretation,
  parseModelInterpretation,
  validateClaims,
  CanonicalContext,
} from '../world-interpretation';

const context: CanonicalContext = {
  project: {
    id: 'proj-1',
    name: 'Feex World',
    repository: 'FeexSystems/Feex',
    description: 'A canonical project.',
    url: 'https://github.com/FeexSystems/Feex',
    lastObservedAt: '2026-10-17T00:00:00.000Z',
  },
  evidence: [
    {
      id: 'ev-1',
      evidenceType: 'commit',
      sourceUrl: 'https://github.com/FeexSystems/Feex/commit/abc',
      sourceRef: 'abc123',
      observedAt: '2026-10-16T00:00:00.000Z',
    },
  ],
  artifactCount: 3,
  relationshipCount: 2,
};

describe('validateClaims', () => {
  it('keeps citations that exist in the retrieved evidence', () => {
    const result = validateClaims([{ text: 'Has commits', evidenceIds: ['ev-1'] }], ['ev-1']);

    expect(result.claims).toEqual([{ text: 'Has commits', evidenceIds: ['ev-1'], supported: true }]);
    expect(result.fabricatedCitationCount).toBe(0);
    expect(result.unsupportedCount).toBe(0);
  });

  it('drops fabricated citations and marks the claim unsupported', () => {
    const result = validateClaims(
      [{ text: 'Invented fact', evidenceIds: ['ev-does-not-exist', 'also-fake'] }],
      ['ev-1']
    );

    expect(result.claims[0].evidenceIds).toEqual([]);
    expect(result.claims[0].supported).toBe(false);
    expect(result.fabricatedCitationCount).toBe(2);
    expect(result.unsupportedCount).toBe(1);
  });

  it('keeps valid citations while dropping fabricated ones', () => {
    const result = validateClaims(
      [{ text: 'Mixed', evidenceIds: ['ev-1', 'fake'] }],
      ['ev-1']
    );

    expect(result.claims[0].evidenceIds).toEqual(['ev-1']);
    expect(result.claims[0].supported).toBe(true);
    expect(result.fabricatedCitationCount).toBe(1);
  });

  it('marks a claim with no citations as unsupported', () => {
    const result = validateClaims([{ text: 'Assertion', evidenceIds: [] }], ['ev-1']);
    expect(result.claims[0].supported).toBe(false);
    expect(result.unsupportedCount).toBe(1);
  });
});

describe('parseModelInterpretation', () => {
  it('accepts a valid payload', () => {
    const parsed = parseModelInterpretation({
      answer: 'ok',
      claims: [{ text: 'c', evidenceIds: ['ev-1'] }],
      limitations: [],
      confidence: 0.5,
    });
    expect(parsed?.answer).toBe('ok');
  });

  it('rejects a payload with an out-of-range confidence', () => {
    expect(
      parseModelInterpretation({ answer: 'ok', claims: [], limitations: [], confidence: 9 })
    ).toBeNull();
  });

  it('rejects non-object payloads', () => {
    expect(parseModelInterpretation(null)).toBeNull();
    expect(parseModelInterpretation('nope')).toBeNull();
  });
});

describe('buildDeterministicInterpretation', () => {
  it('uses only canonical fields and emits no interpretive claims', () => {
    const result = buildDeterministicInterpretation(context);

    expect(result.claims).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.answer).toContain('FeexSystems/Feex');
    expect(result.answer).toContain('Stored evidence records: 1');
    expect(result.limitations.join(' ')).toMatch(/No AI provider is configured/i);
  });

  it('states the missing-evidence limitation when no evidence exists', () => {
    const result = buildDeterministicInterpretation({ ...context, evidence: [] });
    expect(result.limitations.join(' ')).toMatch(/No evidence records are stored/i);
    expect(result.answer).toContain('Stored evidence records: 0');
  });
});
