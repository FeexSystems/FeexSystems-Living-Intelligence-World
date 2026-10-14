import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWorldProjects, fetchWorldMetrics, fetchWorldEvidence } from '../worldModelClient';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('worldModelClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchWorldProjects returns parsed projects from apiClient', async () => {
    const mockProjects = [
      {
        id: 'feex-core',
        name: 'FeexSystems Core',
        repository: 'FeexSystems/core',
        description: 'Core engine',
        url: 'https://github.com/FeexSystems/core',
        isPinned: true,
        domain: 'Core Engine',
        language: 'TypeScript',
        artifactCount: 15,
        lastObservedAt: '2026-10-04T12:00:00Z',
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      source: 'canonical',
      projects: mockProjects,
      count: 1,
    });

    const result = await fetchWorldProjects();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('FeexSystems Core');
  });

  it('fetchWorldMetrics calculates metrics correctly from graph topology', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      source: 'canonical',
      data: {
        nodes: [
          { id: 'p1', name: 'Proj 1', domain: 'Cloud', artifactCount: 10 },
          { id: 'p2', name: 'Proj 2', domain: 'AI', artifactCount: 5 },
        ],
        links: [
          { source: 'p1', target: 'p2' },
        ],
      },
    });

    const metrics = await fetchWorldMetrics();
    expect(metrics.nodeCount).toBe(2);
    expect(metrics.edgeCount).toBe(1);
    expect(metrics.domainCount).toBe(2);
    expect(metrics.evidenceAnchorCount).toBe(15);
  });

  it('fetchWorldMetrics falls back to resilient defaults when request fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

    const metrics = await fetchWorldMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.nodeCount).toBe(8);
    expect(metrics.edgeCount).toBe(14);
    expect(metrics.evidenceAnchorCount).toBe(42);
  });

  it('fetchWorldEvidence returns normalized evidence from the REST detail API', async () => {
    // Vitest disables SQL Connect, so this exercises the REST fallback path.
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        evidence: [
          {
            id: 'ev_1',
            evidenceType: 'commit',
            sourceRef: 'abc1234',
            observedAt: '2026-10-04T12:00:00Z',
          },
          {
            id: 'ev_2',
            evidenceType: 'file',
            sourceRef: null,
            observedAt: '2026-10-03T09:30:00Z',
          },
        ],
      },
    });

    const result = await fetchWorldEvidence('feex-core');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'ev_1',
      commitSha: 'abc1234',
      observationType: 'commit',
      observedAt: '2026-10-04T12:00:00Z',
    });
    // Null sourceRef normalizes to an empty commitSha, not undefined.
    expect(result[1].commitSha).toBe('');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/world-model/evidence/detail?projectId=feex-core'
    );
  });

  it('fetchWorldEvidence falls back to an empty set when the request fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchWorldEvidence('feex-core');
    expect(result).toEqual([]);
  });
});
