import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../database';
import { detectContentDecay } from '../decay-engine.service';
import { detectContentGaps } from '../gap-engine.service';
import { detectOpportunities, createRecyclingStub } from '../opportunity-engine.service';

vi.mock('../../database', () => ({
  prisma: {
    marketingContentAsset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    marketingProduct: {
      findMany: vi.fn(),
    },
    worldModelEvent: {
      findMany: vi.fn(),
    }
  }
}));

describe('Marketing Intelligence Engines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Decay Engine', () => {
    it('should flag assets with old events as decayed', async () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days old
      
      (prisma.marketingContentAsset.findMany ).mockResolvedValue([
        {
          id: 'asset-1',
          title: 'Old Asset',
          events: [{ occurredAt: oldDate }]
        },
        {
          id: 'asset-2',
          title: 'Fresh Asset',
          events: [{ occurredAt: new Date() }] // today
        }
      ]);

      const results = await detectContentDecay(30);
      
      expect(results.length).toBe(1);
      expect(results[0].assetId).toBe('asset-1');
      expect(results[0].daysSinceLastEvent).toBeGreaterThanOrEqual(40);
      expect(results[0].decayScore).toBeGreaterThan(0);
    });
  });

  describe('Gap Engine', () => {
    it('should identify products with features but no assets as gaps', async () => {
      (prisma.marketingProduct.findMany ).mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Has Features No Assets',
          worldModelProjectId: 'proj-1',
          features: [{}, {}], // 2 features
          events: [] // 0 assets
        },
        {
          id: 'prod-2',
          name: 'Has Features And Assets',
          worldModelProjectId: 'proj-1',
          features: [{}], // 1 feature
          events: [{ assetId: 'asset-1' }] // 1 asset
        }
      ]);

      const results = await detectContentGaps();
      
      expect(results.length).toBe(1);
      expect(results[0].productId).toBe('prod-1');
      expect(results[0].featuresCount).toBe(2);
      expect(results[0].gapScore).toBe(0.4); // 2/5 = 0.4
    });
  });

  describe('Opportunity Engine', () => {
    it('should detect opportunities from recent releases on products with gaps', async () => {
      (prisma.worldModelEvent.findMany ).mockResolvedValue([
        {
          projectId: 'proj-1',
          eventType: 'release',
          project: {
            url: 'https://github.com/feex/test',
            marketingProducts: [
              {
                id: 'prod-1',
                name: 'Product Without Assets',
                events: [] // Gap
              }
            ]
          }
        }
      ]);

      const results = await detectOpportunities();
      
      expect(results.length).toBe(1);
      expect(results[0].projectId).toBe('proj-1');
      expect(results[0].eventName).toBe('release');
      expect(results[0].priorityScore).toBe(0.9);
    });

    it('should create a recycling stub preserving lineage', async () => {
      (prisma.marketingContentAsset.findUnique ).mockResolvedValue({
        id: 'parent-asset',
        title: 'Original Title',
        type: 'ARTICLE'
      });

      (prisma.marketingContentAsset.create ).mockResolvedValue({
        id: 'new-stub'
      });

      const stubId = await createRecyclingStub('parent-asset');
      
      expect(stubId).toBe('new-stub');
      expect(prisma.marketingContentAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: 'parent-asset',
          type: 'ARTICLE',
          state: 'DRAFT',
          title: '[Recycled Draft] Original Title'
        })
      });
    });
  });
});
