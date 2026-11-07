import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enrichNavigatorResult, NavigatorResult } from './navigator-enrichment.service.js';
import { geminiService } from './gemini.service.js';
import { generateGroundedAnswer } from './llm-grounded.service.js';

vi.mock('./gemini.service.js', () => ({
  geminiService: { generateInteractiveResponse: vi.fn() },
}));
vi.mock('./llm-grounded.service.js', () => ({
  generateGroundedAnswer: vi.fn(),
}));

function baseResult(): NavigatorResult {
  return {
    query: 'feex',
    explanation: 'base explanation',
    projects: [{ name: 'FeexSystems', description: 'd', repository: 'feex/repo' }],
    technologies: [{ name: 'React', projectCount: 2 }],
    artifacts: [],
    groundedEvidenceCount: 3,
  };
}

describe('enrichNavigatorResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches Gemini interactive metadata and grounded llm block on success', async () => {
    vi.mocked(geminiService.generateInteractiveResponse).mockResolvedValue({
      explanation: 'ai explanation',
      suggestions: ['s1'],
      confidence: 0.9,
      groundedEvidenceCount: 3,
      mode: 'interactions-api',
      model: 'gemini-3.7-flash',
    } as any);
    vi.mocked(generateGroundedAnswer).mockResolvedValue({
      text: 'grounded text',
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      usedFallback: false,
      suggestions: ['s2'],
    });

    const result = await enrichNavigatorResult(baseResult());

    expect(result.explanation).toBe('grounded text');
    expect(result.aiModel).toBe('gemini-3.7-flash');
    expect(result.aiMode).toBe('interactions-api');
    expect(result.suggestions).toEqual(['s1']);
    expect(result.llm).toEqual({
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      usedFallback: false,
      suggestions: ['s2'],
    });
  });

  it('falls back to grounded suggestions when the interactions layer returns none', async () => {
    vi.mocked(geminiService.generateInteractiveResponse).mockResolvedValue({
      explanation: '',
      suggestions: [],
      confidence: 0,
      groundedEvidenceCount: 0,
      mode: 'heuristic',
      model: 'none',
    } as any);
    vi.mocked(generateGroundedAnswer).mockResolvedValue({
      text: 'grounded text',
      provider: 'openai',
      usedFallback: false,
      suggestions: ['g1', 'g2'],
    });

    const result = await enrichNavigatorResult(baseResult());
    expect(result.suggestions).toEqual(['g1', 'g2']);
  });

  it('survives both AI layers throwing and labels the fallback', async () => {
    vi.mocked(geminiService.generateInteractiveResponse).mockRejectedValue(new Error('down'));
    vi.mocked(generateGroundedAnswer).mockRejectedValue(new Error('down'));

    const result = await enrichNavigatorResult(baseResult());

    expect(result.explanation).toBe('base explanation');
    expect(result.aiModel).toBeUndefined();
    expect(result.llm).toEqual({ provider: 'none', usedFallback: true, suggestions: [] });
  });

  it('passes multi-turn history through to the Gemini interactions layer', async () => {
    vi.mocked(geminiService.generateInteractiveResponse).mockRejectedValue(new Error('down'));
    vi.mocked(generateGroundedAnswer).mockRejectedValue(new Error('down'));

    const history = [{ role: 'user' as const, text: 'hi' }];
    await enrichNavigatorResult(baseResult(), { history });

    expect(vi.mocked(geminiService.generateInteractiveResponse)).toHaveBeenCalledWith(
      expect.objectContaining({ history })
    );
  });

  it('maps grounded entities from projects with type "project"', async () => {
    vi.mocked(geminiService.generateInteractiveResponse).mockRejectedValue(new Error('down'));
    vi.mocked(generateGroundedAnswer).mockRejectedValue(new Error('down'));

    await enrichNavigatorResult(baseResult());

    const call = vi.mocked(geminiService.generateInteractiveResponse).mock.calls[0][0];
    expect(call.groundedEntities![0]).toMatchObject({
      name: 'FeexSystems',
      type: 'project',
      repository: 'feex/repo',
    });
  });
});
