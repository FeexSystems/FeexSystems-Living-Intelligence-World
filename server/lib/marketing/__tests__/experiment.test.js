import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../database';
import { experimentService } from '../experiment.service';

vi.mock('../../database', () => ({
  prisma: {
    marketingExperiment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    marketingObservation: {
      create: vi.fn(),
    }
  }
}));

describe('Marketing Experiment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an experiment with variants', async () => {
    (prisma.marketingExperiment.create ).mockResolvedValue({
      id: 'exp-1',
      campaignId: 'camp-1',
      hypothesis: 'Variant B gets more clicks',
      status: 'ACTIVE',
      variants: [
        { id: 'v-1', name: 'Variant A' },
        { id: 'v-2', name: 'Variant B' }
      ]
    });

    const result = await experimentService.createExperiment('camp-1', 'Variant B gets more clicks', [
      { name: 'Variant A', configuration: { color: 'blue' } },
      { name: 'Variant B', configuration: { color: 'red' } }
    ]);

    expect(result.id).toBe('exp-1');
    expect(result.variants.length).toBe(2);
    expect(prisma.marketingExperiment.create).toHaveBeenCalled();
  });

  it('should record observations for variants', async () => {
    (prisma.marketingObservation.create ).mockResolvedValue({
      id: 'obs-1',
      variantId: 'v-1',
      metric: 'QIE',
      value: 1
    });

    const result = await experimentService.recordObservation('v-1', 'QIE', 1, { source: 'web' });

    expect(result.id).toBe('obs-1');
    expect(prisma.marketingObservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          variantId: 'v-1',
          metric: 'QIE',
          value: 1,
          metadata: { source: 'web' }
        }
      })
    );
  });

  it('should evaluate an experiment and select the highest QIE winner', async () => {
    (prisma.marketingExperiment.findUnique ).mockResolvedValue({
      id: 'exp-1',
      hypothesis: 'Test',
      variants: [
        {
          id: 'v-1',
          name: 'Variant A',
          observations: [
            { metric: 'QIE', value: 10 },
            { metric: 'CLICK', value: 50 }
          ]
        },
        {
          id: 'v-2',
          name: 'Variant B',
          observations: [
            { metric: 'QIE', value: 15 },
            { metric: 'CLICK', value: 40 }
          ]
        }
      ]
    });

    (prisma.marketingExperiment.update ).mockResolvedValue({});

    const evaluation = await experimentService.evaluateExperiment('exp-1');

    expect(evaluation.experimentId).toBe('exp-1');
    expect(evaluation.decision).toContain("Variant 'Variant B' is winning");
    expect(evaluation.results[0].name).toBe('Variant B');
    expect(evaluation.results[0].qieTotal).toBe(15);
    expect(evaluation.results[1].name).toBe('Variant A');
    expect(evaluation.results[1].qieTotal).toBe(10);
    
    expect(prisma.marketingExperiment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'exp-1' },
        data: { decision: expect.stringContaining('Variant B') }
      })
    );
  });
});
