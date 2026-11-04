import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kfcAgentService } from '../kfcAgentService';
import { geminiService } from '../gemini.service';


vi.mock('../gemini.service', () => ({
  geminiService: {
    generateReasoning: vi.fn(),
  },
}));

describe('KFCAgentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute full 5-stage KFC pipeline and emit events', async () => {
    vi.mocked(geminiService.generateReasoning).mockResolvedValue({
      explanation: 'Simulated KFC AI Reasoning Output',
      confidence: 0.98,
      groundedEvidenceCount: 5,
    });

    const emittedEvents = [];
    const onEvent = (event) => {
      emittedEvents.push(event);
    };

    await kfcAgentService.executePipeline(
      {
        projectName: 'FeexSystems World Model Core',
        repository: 'FeexSystems/feex-world-os',
        prompt: 'Build high-throughput telemetry stream pipeline',
      },
      onEvent
    );

    // Verify stage complete events
    const stageCompleteEvents = emittedEvents.filter(e => e.type === 'stage_complete');
    expect(stageCompleteEvents.length).toBeGreaterThanOrEqual(5);

    // Check that artifacts were emitted
    const artifacts = stageCompleteEvents.map(e => e.artifact).filter(Boolean);
    expect(artifacts.length).toBe(5);

    // Check completion event
    const finalEvent = emittedEvents[emittedEvents.length - 1];
    expect(finalEvent.type).toBe('stage_complete');
    expect(finalEvent.stage).toBe('COMPLETE');
    expect(finalEvent.progressPercent).toBe(100);
  });

  it('should handle errors gracefully and emit error event', async () => {
    vi.mocked(geminiService.generateReasoning).mockRejectedValueOnce(
      new Error('API quota exceeded')
    );

    const emittedEvents = [];
    const onEvent = (event) => {
      emittedEvents.push(event);
    };

    await kfcAgentService.executePipeline(
      {
        projectName: 'Failing Task',
        repository: 'FeexSystems/test',
        prompt: 'Do something',
      },
      onEvent
    );

    const errorEvents = emittedEvents.filter(e => e.type === 'error');
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0].error).toContain('API quota exceeded');
  });
});
