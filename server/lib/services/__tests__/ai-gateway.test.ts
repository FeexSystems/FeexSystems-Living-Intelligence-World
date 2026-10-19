import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { aiGateway } from '../ai-gateway.service';

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('AIGatewayService', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    process.env.DEFAULT_AI_PROVIDER = 'gemini';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns null (explicit unavailable state) when no provider credential exists', async () => {
    const result = await aiGateway.generateText('system', 'user');
    expect(result).toBeNull();
  });

  it('does not call fetch without a credential', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await aiGateway.generateText('system', 'user');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retries transient provider failures then succeeds', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [{ content: { parts: [{ text: 'ok after retry' }] } }],
          usageMetadata: { totalTokenCount: 42, promptTokenCount: 20, candidatesTokenCount: 22 },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const result = await aiGateway.generateText('system', 'user', {
      retries: 2,
      correlationId: 'corr-1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result?.text).toBe('ok after retry');
    expect(result?.provider).toBe('gemini');
    expect(result?.correlationId).toBe('corr-1');
    expect(result?.usage).toEqual({
      measured: true,
      totalTokens: 42,
      promptTokens: 20,
      completionTokens: 22,
    });
  });

  it('marks usage unmeasured when the provider reports none', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] })
      )
    );

    const result = await aiGateway.generateText('system', 'user');

    expect(result?.text).toBe('hello');
    expect(result?.usage).toEqual({ measured: false });
  });

  it('returns null for an invalid structured-output payload', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })
      )
    );

    const result = await aiGateway.generateObject<{ ok: boolean }>('system', 'user');

    expect(result).toBeNull();
  });

  it('returns a parsed object for valid structured output', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })
      )
    );

    const result = await aiGateway.generateObject<{ ok: boolean }>('system', 'user');

    expect(result?.object).toEqual({ ok: true });
  });
});
