import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchWorldProjects,
  fetchWorldMetrics,
  fetchWorldEvidence,
  fetchWorldProject,
  fetchWorldTelemetryEvents,
} from '../worldModelClient';
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

  it('fetchWorldProject returns the canonical project from the REST evidence/detail payload', async () => {
    // Vitest disables SQL Connect, so this exercises the REST fallback path,
    // which reads the project record embedded in /evidence/detail.
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: {
        project: {
          id: 'feex-core',
          name: 'FeexSystems Core',
          repository: 'FeexSystems/core',
          url: 'https://github.com/FeexSystems/core',
          description: 'Core engine',
          isPinned: true,
          lastObservedAt: '2026-10-04T12:00:00Z',
        },
        evidence: [],
      },
    });

    const result = await fetchWorldProject('feex-core');
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 'feex-core',
      name: 'FeexSystems Core',
      repository: 'FeexSystems/core',
      url: 'https://github.com/FeexSystems/core',
      isPinned: true,
      lastObservedAt: '2026-10-04T12:00:00Z',
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/world-model/evidence/detail?projectId=feex-core'
    );
  });

  it('fetchWorldProject returns null when the project is absent from the payload', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      success: true,
      data: { project: null, evidence: [] },
    });

    const result = await fetchWorldProject('missing-project');
    expect(result).toBeNull();
  });

  it('fetchWorldProject returns null when the request fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchWorldProject('feex-core');
    expect(result).toBeNull();
  });

  it('fetchWorldTelemetryEvents returns an empty set (never fabricated) with no SQL/REST source', async () => {
    // The telemetry snapshot query is @auth USER and there is no REST snapshot
    // endpoint; Vitest disables SQL Connect, so the resilient fallback is empty.
    const result = await fetchWorldTelemetryEvents();
    expect(result).toEqual([]);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
