import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { RepositoryService } from '../../lib/services/repository.service';
import { GitProviderFactory } from '../../lib/services/git-providers/index';
import { encryptionService } from '../../lib/utils/encryption';
import { createTestUser, cleanupDatabase } from '../helpers/database';

// Mock the git providers
vi.mock('../../lib/services/git-providers/index.js');
vi.mock('../../lib/utils/encryption.js');

const prisma = new PrismaClient();

describe.skip('RepositoryService', () => {
  let repositoryService: RepositoryService;
  let testUser: any;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createTestUser();
    repositoryService = new RepositoryService();

    // Mock GitProviderFactory
    vi.mocked(GitProviderFactory.isProviderAvailable).mockReturnValue(true);
    vi.mocked(GitProviderFactory.getProvider).mockReturnValue({
      name: 'github',
      getAuthUrl: vi.fn().mockReturnValue('https://github.com/login/oauth/authorize?client_id=test'),
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        accessToken: 'test-token',
        tokenType: 'bearer',
      }),
      getUserRepositories: vi.fn().mockResolvedValue([
        {
          id: 'test/repo',
          name: 'repo',
          fullName: 'test/repo',
          url: 'https://github.com/test/repo',
          defaultBranch: 'main',
          isPrivate: false,
          updatedAt: new Date(),
        },
      ]),
      getRepository: vi.fn().mockResolvedValue({
        id: 'test/repo',
        name: 'repo',
        fullName: 'test/repo',
        url: 'https://github.com/test/repo',
        defaultBranch: 'main',
        isPrivate: false,
        updatedAt: new Date(),
      }),
      createWebhook: vi.fn().mockResolvedValue('webhook-123'),
      deleteWebhook: vi.fn().mockResolvedValue(undefined),
      validateWebhookSignature: vi.fn().mockReturnValue(true),
    } as any);

    // Mock encryption service
    vi.mocked(encryptionService.encrypt).mockReturnValue('encrypted-token');
    vi.mocked(encryptionService.decrypt).mockReturnValue('test-token');
  });

  afterEach(async () => {
    await cleanupDatabase();
    vi.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth authorization URL', async () => {
      const authUrl = await repositoryService.getAuthUrl('github', testUser.id);
      
      expect(authUrl).toBe('https://github.com/login/oauth/authorize?client_id=test');
      expect(GitProviderFactory.isProviderAvailable).toHaveBeenCalledWith('github');
      expect(GitProviderFactory.getProvider).toHaveBeenCalledWith('github');
    });

    it('should throw error for unavailable provider', async () => {
      vi.mocked(GitProviderFactory.isProviderAvailable).mockReturnValue(false);
      
      await expect(repositoryService.getAuthUrl('invalid', testUser.id))
        .rejects.toThrow('Git provider \'invalid\' is not available');
    });
  });

  describe('handleOAuthCallback', () => {
    it('should handle OAuth callback and store repositories', async () => {
      const state = Buffer.from(JSON.stringify({
        userId: testUser.id,
        provider: 'github',
        timestamp: Date.now(),
      })).toString('base64');

      const result = await repositoryService.handleOAuthCallback('github', 'auth-code', state);
      
      expect(result.userId).toBe(testUser.id);
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0].fullName).toBe('test/repo');

      // Verify repository was stored in database
      const storedRepo = await prisma.repository.findFirst({
        where: { userId: testUser.id },
      });
      
      expect(storedRepo).toBeTruthy();
      expect(storedRepo!.provider).toBe('GITHUB');
      expect(storedRepo!.repoUrl).toBe('https://github.com/test/repo');
      expect(storedRepo!.accessTokenEncrypted).toBe('encrypted-token');
    });

    it('should throw error for invalid state', async () => {
      const invalidState = 'invalid-state';
      
      await expect(repositoryService.handleOAuthCallback('github', 'auth-code', invalidState))
        .rejects.toThrow('Invalid state parameter');
    });

    it('should throw error for expired state', async () => {
      const expiredState = Buffer.from(JSON.stringify({
        userId: testUser.id,
        provider: 'github',
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      })).toString('base64');
      
      await expect(repositoryService.handleOAuthCallback('github', 'auth-code', expiredState))
        .rejects.toThrow('State expired');
    });
  });

  describe('getUserRepositories', () => {
    it('should return user repositories', async () => {
      // Create test repository
      await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      const repositories = await repositoryService.getUserRepositories(testUser.id);
      
      expect(repositories).toHaveLength(1);
      expect(repositories[0].provider).toBe('github');
      expect(repositories[0].repoUrl).toBe('https://github.com/test/repo');
    });

    it('should return empty array for user with no repositories', async () => {
      const repositories = await repositoryService.getUserRepositories(testUser.id);
      
      expect(repositories).toHaveLength(0);
    });
  });

  describe('getRepositoryDetails', () => {
    it('should get repository details from git provider', async () => {
      // Create test repository
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      const details = await repositoryService.getRepositoryDetails(repo.id);
      
      expect(details.fullName).toBe('test/repo');
      expect(GitProviderFactory.getProvider).toHaveBeenCalledWith('github');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-token');
    });

    it('should throw error for non-existent repository', async () => {
      await expect(repositoryService.getRepositoryDetails('non-existent'))
        .rejects.toThrow('Repository not found');
    });

    it('should throw error for repository without access token', async () => {
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: null,
        },
      });

      await expect(repositoryService.getRepositoryDetails(repo.id))
        .rejects.toThrow('Repository access token not available');
    });
  });

  describe('createWebhook', () => {
    it('should create webhook for repository', async () => {
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      await repositoryService.createWebhook(repo.id);
      
      // Verify webhook URL was updated
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: repo.id },
      });
      
      expect(updatedRepo!.webhookUrl).toContain('/api/devops/webhooks/github/webhook-123');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook for repository', async () => {
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
          webhookUrl: 'https://api.example.com/webhooks/github/webhook-123',
        },
      });

      await repositoryService.deleteWebhook(repo.id);
      
      // Verify webhook URL was cleared
      const updatedRepo = await prisma.repository.findUnique({
        where: { id: repo.id },
      });
      
      expect(updatedRepo!.webhookUrl).toBeNull();
    });

    it('should handle repository without webhook', async () => {
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      // Should not throw error
      await expect(repositoryService.deleteWebhook(repo.id)).resolves.toBeUndefined();
    });
  });

  describe('removeRepository', () => {
    it('should remove repository and its webhook', async () => {
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
          webhookUrl: 'https://api.example.com/webhooks/github/webhook-123',
        },
      });

      await repositoryService.removeRepository(repo.id);
      
      // Verify repository was deleted
      const deletedRepo = await prisma.repository.findUnique({
        where: { id: repo.id },
      });
      
      expect(deletedRepo).toBeNull();
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook payload', async () => {
      const repo = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      const payload = {
        event: 'push',
        repository: {
          id: 'test/repo',
          name: 'repo',
          fullName: 'test/repo',
          url: 'https://github.com/test/repo',
        },
        commit: {
          id: 'abc123',
          message: 'Test commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
          },
          timestamp: new Date(),
        },
        branch: 'main',
      };

      // Should not throw error
      await expect(repositoryService.handleWebhook('github', payload, 'signature', JSON.stringify(payload)))
        .resolves.toBeUndefined();
    });

    it('should throw error for repository not found', async () => {
      const payload = {
        event: 'push',
        repository: {
          id: 'nonexistent/repo',
          name: 'repo',
          fullName: 'nonexistent/repo',
          url: 'https://github.com/nonexistent/repo',
        },
      };

      await expect(repositoryService.handleWebhook('github', payload, 'signature', JSON.stringify(payload)))
        .rejects.toThrow('Repository not found for webhook');
    });
  });
});