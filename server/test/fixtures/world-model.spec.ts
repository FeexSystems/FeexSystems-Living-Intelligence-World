import { describe, it, expect, vi, afterEach } from 'vitest';

// `verifyRepositoryCommit` sources the commit SHA from GitHub via a private
// `fetch` wrapper. Stub global fetch so the test asserts the server-side
// "Evidence, Not Claims" gate without any network access.
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('verifyRepositoryCommit', () => {
  it('echoes the canonical full SHA returned by GitHub (never the client guess)', async () => {
    const { verifyRepositoryCommit } = await import('../../../server/lib/services/github-pinned.service');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sha: 'abcdef1234567890abcdef1234567890abcdef12',
        commit: { message: 'feat: canonical world model', author: { name: 'Feex', date: '2026-10-13T00:00:00Z' } },
        html_url: 'https://github.com/FeexSystems/core/commit/abcdef1234567890abcdef1234567890abcdef12',
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await verifyRepositoryCommit('FeexSystems/core', 'abcdef1');

    expect(result.verified).toBe(true);
    // Abbreviated input is resolved to the canonical full SHA.
    expect(result.commitSha).toBe('abcdef1234567890abcdef1234567890abcdef12');
    expect(result.repository).toBe('FeexSystems/core');
    expect(result.message).toBe('feat: canonical world model');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The repo path is URL-encoded by the client (slash -> %2F), which GitHub
    // accepts; assert on the encoded canonical form.
    expect(String(fetchMock.mock.calls[0][0])).toContain('/repos/FeexSystems%2Fcore/commits/abcdef1');
  });

  it('throws when GitHub cannot resolve the commit (so callers refuse to anchor)', async () => {
    const { verifyRepositoryCommit } = await import('../../../server/lib/services/github-pinned.service');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(verifyRepositoryCommit('FeexSystems/core', 'deadbeef')).rejects.toThrow(/GitHub 404/);
  });
});

import { createProjectFixture, createRepositoryFixture } from './world-model';

describe('world-model fixtures', () => {
  describe('createProjectFixture', () => {
    it('should create a project with default values', () => {
      const project = createProjectFixture();
      
      expect(project.id).toBe('proj-001');
      expect(project.name).toBe('FeexSystems Core');
      expect(project.description).toBe('Core platform');
      expect(project.gitHubUrl).toBe('https://github.com/feexsystems/core');
      expect(project.createdAt).toEqual(new Date('2024-01-01'));
      expect(project.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should merge overrides correctly', () => {
      const project = createProjectFixture({
        id: 'proj-custom',
        name: 'Custom Project',
      });
      
      expect(project.id).toBe('proj-custom');
      expect(project.name).toBe('Custom Project');
      expect(project.description).toBe('Core platform');
      expect(project.gitHubUrl).toBe('https://github.com/feexsystems/core');
    });

    it('should return a properly typed Project object', () => {
      const project = createProjectFixture();
      
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('gitHubUrl');
      expect(project).toHaveProperty('createdAt');
      expect(project).toHaveProperty('updatedAt');
    });
  });

  describe('createRepositoryFixture', () => {
    it('should create a repository with default values', () => {
      const repo = createRepositoryFixture('proj-001');
      
      expect(repo.id).toBe('repo-001');
      expect(repo.projectId).toBe('proj-001');
      expect(repo.name).toBe('core');
      expect(repo.gitHubUrl).toBe('https://github.com/feexsystems/core');
      expect(repo.createdAt).toEqual(new Date('2024-01-01'));
      expect(repo.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should use the provided projectId', () => {
      const repo = createRepositoryFixture('proj-custom');
      
      expect(repo.projectId).toBe('proj-custom');
    });

    it('should merge overrides correctly', () => {
      const repo = createRepositoryFixture('proj-001', {
        id: 'repo-custom',
        name: 'custom-repo',
      });
      
      expect(repo.id).toBe('repo-custom');
      expect(repo.projectId).toBe('proj-001');
      expect(repo.name).toBe('custom-repo');
      expect(repo.gitHubUrl).toBe('https://github.com/feexsystems/core');
    });

    it('should return a properly typed Repository object', () => {
      const repo = createRepositoryFixture('proj-001');
      
      expect(repo).toHaveProperty('id');
      expect(repo).toHaveProperty('projectId');
      expect(repo).toHaveProperty('name');
      expect(repo).toHaveProperty('gitHubUrl');
      expect(repo).toHaveProperty('createdAt');
      expect(repo).toHaveProperty('updatedAt');
    });
  });
});
