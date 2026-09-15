import { describe, it, expect } from 'vitest';
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
