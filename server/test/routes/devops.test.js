import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../../index';
import { createTestUser, cleanupTestDatabase } from '../helpers/database';
import { GitProviderFactory } from '../../lib/services/git-providers/index';

// Mock Docker
vi.mock('dockerode', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      createContainer: vi.fn().mockResolvedValue({
        start: vi.fn().mockResolvedValue(undefined),
        logs: vi.fn().mockResolvedValue({
          on: vi.fn(),
        }),
        wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
        remove: vi.fn().mockResolvedValue(undefined),
      }),
    })),
  };
});

// Mock the git providers
vi.mock('../../lib/services/git-providers/index.js');

const prisma = new PrismaClient();

describe('DevOps Routes', () => {
  let app;
  let testUser;
  let authToken;

  beforeEach(async () => {
    await cleanupTestDatabase();
    app = createServer();
    testUser = await createTestUser();
    
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });
    
    authToken = loginResponse.body.tokens.accessToken;

    // Mock GitProviderFactory
    vi.mocked(GitProviderFactory.getAvailableProviders).mockReturnValue(['github', 'gitlab']);
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
    } );
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('GET /api/devops/providers', () => {
    it('should return available git providers', async () => {
      const response = await request(app)
        .get('/api/devops/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toHaveLength(2);
      expect(response.body.data.providers[0]).toEqual({
        name: 'github',
        displayName: 'Github',
        available: true,
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/devops/providers')
        .expect(401);
    });
  });

  describe('GET /api/devops/auth/:provider', () => {
    it('should return OAuth authorization URL', async () => {
      const response = await request(app)
        .get('/api/devops/auth/github')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBe('https://github.com/login/oauth/authorize?client_id=test');
    });

    it('should return error for invalid provider', async () => {
      vi.mocked(GitProviderFactory.isProviderAvailable).mockReturnValue(false);

      const response = await request(app)
        .get('/api/devops/auth/invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/devops/auth/github')
        .expect(401);
    });
  });

  describe('GET /api/devops/repositories', () => {
    beforeEach(async () => {
      // Create test repositories
      await prisma.repository.createMany({
        data: [
          {
            userId: testUser.id,
            provider: 'GITHUB',
            repoUrl: 'https://github.com/test/repo1',
            branch: 'main',
            accessTokenEncrypted: 'encrypted-token',
          },
          {
            userId: testUser.id,
            provider: 'GITLAB',
            repoUrl: 'https://gitlab.com/test/repo2',
            branch: 'main',
            accessTokenEncrypted: 'encrypted-token',
          },
        ],
      });
    });

    it('should return user repositories', async () => {
      const response = await request(app)
        .get('/api/devops/repositories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter repositories by provider', async () => {
      const response = await request(app)
        .get('/api/devops/repositories?provider=github')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].provider).toBe('github');
    });

    it('should filter repositories by search term', async () => {
      const response = await request(app)
        .get('/api/devops/repositories?search=repo1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.repositories[0].repoUrl).toContain('repo1');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/devops/repositories?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repositories).toHaveLength(1);
      expect(response.body.data.pagination.hasMore).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/devops/repositories')
        .expect(401);
    });
  });

  describe('GET /api/devops/repositories/:id', () => {
    let testRepository;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });
    });

    it('should return repository details', async () => {
      const response = await request(app)
        .get(`/api/devops/repositories/${testRepository.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.repository.id).toBe(testRepository.id);
      expect(response.body.data.repository.details.fullName).toBe('test/repo');
    });

    it('should return 404 for non-existent repository', async () => {
      const response = await request(app)
        .get('/api/devops/repositories/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/devops/repositories/${testRepository.id}`)
        .expect(401);
    });
  });

  describe('POST /api/devops/repositories/:id/webhook', () => {
    let testRepository;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });
    });

    it('should create webhook for repository', async () => {
      const response = await request(app)
        .post(`/api/devops/repositories/${testRepository.id}/webhook`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Webhook created successfully');
    });

    it('should return 404 for non-existent repository', async () => {
      const response = await request(app)
        .post('/api/devops/repositories/non-existent/webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/devops/repositories/${testRepository.id}/webhook`)
        .expect(401);
    });
  });

  describe('DELETE /api/devops/repositories/:id/webhook', () => {
    let testRepository;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
          webhookUrl: 'https://api.example.com/webhooks/github/webhook-123',
        },
      });
    });

    it('should delete webhook for repository', async () => {
      const response = await request(app)
        .delete(`/api/devops/repositories/${testRepository.id}/webhook`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Webhook deleted successfully');
    });

    it('should return 404 for non-existent repository', async () => {
      const response = await request(app)
        .delete('/api/devops/repositories/non-existent/webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/devops/repositories/${testRepository.id}/webhook`)
        .expect(401);
    });
  });

  describe('DELETE /api/devops/repositories/:id', () => {
    let testRepository;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });
    });

    it('should remove repository access', async () => {
      const response = await request(app)
        .delete(`/api/devops/repositories/${testRepository.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Repository access removed successfully');

      // Verify repository was deleted
      const deletedRepo = await prisma.repository.findUnique({
        where: { id: testRepository.id },
      });
      expect(deletedRepo).toBeNull();
    });

    it('should return 404 for non-existent repository', async () => {
      const response = await request(app)
        .delete('/api/devops/repositories/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/devops/repositories/${testRepository.id}`)
        .expect(401);
    });
  });

  describe('GET /api/devops/pipelines/templates', () => {
    it('should return pipeline templates', async () => {
      const response = await request(app)
        .get('/api/devops/pipelines/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(3);
      expect(response.body.data.templates[0].name).toBe('Node.js CI/CD');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/devops/pipelines/templates')
        .expect(401);
    });
  });

  describe('POST /api/devops/pipelines', () => {
    let testRepository;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });
    });

    it('should create a new pipeline', async () => {
      const pipelineData = {
        repositoryId: testRepository.id,
        name: 'Test Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build',
            commands: ['npm install', 'npm run build'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push',
            branches: ['main'],
          },
        ],
        environment: {
          NODE_ENV: 'production',
        },
      };

      const response = await request(app)
        .post('/api/devops/pipelines')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pipelineData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipeline.name).toBe('Test Pipeline');
      expect(response.body.data.pipeline.stages).toHaveLength(1);
    });

    it('should return error for invalid repository', async () => {
      const pipelineData = {
        repositoryId: 'non-existent',
        name: 'Test Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build',
            commands: ['npm install'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push',
            branches: ['main'],
          },
        ],
      };

      const response = await request(app)
        .post('/api/devops/pipelines')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pipelineData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/devops/pipelines')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/devops/repositories/:repositoryId/pipelines', () => {
    let testRepository;
    let testPipeline;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      testPipeline = await prisma.pipeline.create({
        data: {
          repositoryId: testRepository.id,
          name: 'Test Pipeline',
          stages: [
            {
              id: 'build',
              name: 'Build',
              type: 'build',
              commands: ['npm install'],
            },
          ],
          triggers: [
            {
              id: 'push-main',
              type: 'push',
              branches: ['main'],
            },
          ],
          environment: {},
          status: 'ACTIVE',
        },
      });
    });

    it('should return repository pipelines', async () => {
      const response = await request(app)
        .get(`/api/devops/repositories/${testRepository.id}/pipelines`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipelines).toHaveLength(1);
      expect(response.body.data.pipelines[0].name).toBe('Test Pipeline');
    });

    it('should filter pipelines by status', async () => {
      const response = await request(app)
        .get(`/api/devops/repositories/${testRepository.id}/pipelines?status=active`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipelines).toHaveLength(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/devops/repositories/${testRepository.id}/pipelines`)
        .expect(401);
    });
  });

  describe('GET /api/devops/pipelines/:id', () => {
    let testRepository;
    let testPipeline;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      testPipeline = await prisma.pipeline.create({
        data: {
          repositoryId: testRepository.id,
          name: 'Test Pipeline',
          stages: [
            {
              id: 'build',
              name: 'Build',
              type: 'build',
              commands: ['npm install'],
            },
          ],
          triggers: [
            {
              id: 'push-main',
              type: 'push',
              branches: ['main'],
            },
          ],
          environment: {},
          status: 'ACTIVE',
        },
      });
    });

    it('should return pipeline by ID', async () => {
      const response = await request(app)
        .get(`/api/devops/pipelines/${testPipeline.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipeline.name).toBe('Test Pipeline');
    });

    it('should return 404 for non-existent pipeline', async () => {
      const response = await request(app)
        .get('/api/devops/pipelines/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/devops/pipelines/${testPipeline.id}`)
        .expect(401);
    });
  });

  describe('PUT /api/devops/pipelines/:id', () => {
    let testRepository;
    let testPipeline;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      testPipeline = await prisma.pipeline.create({
        data: {
          repositoryId: testRepository.id,
          name: 'Test Pipeline',
          stages: [
            {
              id: 'build',
              name: 'Build',
              type: 'build',
              commands: ['npm install'],
            },
          ],
          triggers: [
            {
              id: 'push-main',
              type: 'push',
              branches: ['main'],
            },
          ],
          environment: {},
          status: 'ACTIVE',
        },
      });
    });

    it('should update pipeline', async () => {
      const updates = {
        name: 'Updated Pipeline',
        status: 'paused',
      };

      const response = await request(app)
        .put(`/api/devops/pipelines/${testPipeline.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pipeline.name).toBe('Updated Pipeline');
      expect(response.body.data.pipeline.status).toBe('paused');
    });

    it('should return 404 for non-existent pipeline', async () => {
      const response = await request(app)
        .put('/api/devops/pipelines/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/devops/pipelines/${testPipeline.id}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/devops/pipelines/:id', () => {
    let testRepository;
    let testPipeline;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      testPipeline = await prisma.pipeline.create({
        data: {
          repositoryId: testRepository.id,
          name: 'Test Pipeline',
          stages: [
            {
              id: 'build',
              name: 'Build',
              type: 'build',
              commands: ['npm install'],
            },
          ],
          triggers: [
            {
              id: 'push-main',
              type: 'push',
              branches: ['main'],
            },
          ],
          environment: {},
          status: 'ACTIVE',
        },
      });
    });

    it('should delete pipeline', async () => {
      const response = await request(app)
        .delete(`/api/devops/pipelines/${testPipeline.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Pipeline deleted successfully');

      // Verify pipeline was deleted
      const deletedPipeline = await prisma.pipeline.findUnique({
        where: { id: testPipeline.id },
      });
      expect(deletedPipeline).toBeNull();
    });

    it('should return 404 for non-existent pipeline', async () => {
      const response = await request(app)
        .delete('/api/devops/pipelines/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/devops/pipelines/${testPipeline.id}`)
        .expect(401);
    });
  });

  describe('POST /api/devops/pipelines/:id/execute', () => {
    let testRepository;
    let testPipeline;

    beforeEach(async () => {
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      testPipeline = await prisma.pipeline.create({
        data: {
          repositoryId: testRepository.id,
          name: 'Test Pipeline',
          stages: [
            {
              id: 'build',
              name: 'Build',
              type: 'build',
              commands: ['echo "Building..."'],
              timeout: 60,
            },
          ],
          triggers: [
            {
              id: 'push-main',
              type: 'push',
              branches: ['main'],
            },
          ],
          environment: {},
          status: 'ACTIVE',
        },
      });
    });

    it('should execute pipeline', async () => {
      const response = await request(app)
        .post(`/api/devops/pipelines/${testPipeline.id}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ commit: 'abc123' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deployment.pipelineId).toBe(testPipeline.id);
      expect(response.body.data.deployment.commit).toBe('abc123');
    });

    it('should return error for inactive pipeline', async () => {
      // Update pipeline to paused
      await prisma.pipeline.update({
        where: { id: testPipeline.id },
        data: { status: 'PAUSED' },
      });

      const response = await request(app)
        .post(`/api/devops/pipelines/${testPipeline.id}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send()
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent pipeline', async () => {
      const response = await request(app)
        .post('/api/devops/pipelines/non-existent/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send()
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/devops/pipelines/${testPipeline.id}/execute`)
        .send()
        .expect(401);
    });
  });

  describe('POST /api/devops/webhooks/:provider', () => {
    beforeEach(async () => {
      // Create test repository for webhook
      await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });
    });

    it('should process webhook payload', async () => {
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
          timestamp: new Date().toISOString(),
        },
        branch: 'main',
      };

      const response = await request(app)
        .post('/api/devops/webhooks/github')
        .send(payload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Webhook processed successfully');
    });

    it('should return error for invalid payload', async () => {
      const invalidPayload = {
        invalid: 'payload',
      };

      const response = await request(app)
        .post('/api/devops/webhooks/github')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('WEBHOOK_ERROR');
    });
  });

  // Deployment tracking and monitoring tests
  describe('Deployment Tracking and Monitoring', () => {
    let testRepository;
    let testPipeline;
    let testDeployment;

    beforeEach(async () => {
      // Create test repository
      testRepository = await prisma.repository.create({
        data: {
          userId: testUser.id,
          provider: 'GITHUB',
          repoUrl: 'https://github.com/test/repo',
          branch: 'main',
          accessTokenEncrypted: 'encrypted-token',
        },
      });

      // Create test pipeline
      testPipeline = await prisma.pipeline.create({
        data: {
          repositoryId: testRepository.id,
          name: 'Test Pipeline',
          stages: [
            {
              id: 'build',
              name: 'Build',
              type: 'build',
              commands: ['npm install'],
            },
          ],
          triggers: [
            {
              id: 'push-main',
              type: 'push',
              branches: ['main'],
            },
          ],
          environment: {},
          status: 'ACTIVE',
        },
      });

      // Create test deployment
      testDeployment = await prisma.deployment.create({
        data: {
          repositoryId: testRepository.id,
          pipelineId: testPipeline.id,
          commit: 'abc123def456',
          status: 'PENDING',
          logs: [],
        },
      });
    });

    describe('GET /api/devops/deployments/:id/status', () => {
      it('should get real-time deployment status', async () => {
        const response = await request(app)
          .get(`/api/devops/deployments/${testDeployment.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deploymentId).toBe(testDeployment.id);
        expect(response.body.data.status).toBeDefined();
        expect(response.body.data.logs).toBeDefined();
      });

      it('should return 404 for non-existent deployment', async () => {
        const response = await request(app)
          .get('/api/devops/deployments/non-existent/status')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('NOT_FOUND');
      });

      it('should require authentication', async () => {
        await request(app)
          .get(`/api/devops/deployments/${testDeployment.id}/status`)
          .expect(401);
      });
    });

    describe('POST /api/devops/deployments/:id/retry', () => {
      beforeEach(async () => {
        // Update deployment to failed status for retry testing
        await prisma.deployment.update({
          where: { id: testDeployment.id },
          data: { status: 'FAILED', completedAt: new Date() },
        });
      });

      it('should retry failed deployment', async () => {
        const response = await request(app)
          .post(`/api/devops/deployments/${testDeployment.id}/retry`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deployment).toBeDefined();
        expect(response.body.data.message).toBe('Deployment retry initiated successfully');
      });

      it('should return 400 for non-failed deployment', async () => {
        // Update deployment to success status
        await prisma.deployment.update({
          where: { id: testDeployment.id },
          data: { status: 'SUCCESS' },
        });

        const response = await request(app)
          .post(`/api/devops/deployments/${testDeployment.id}/retry`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toBe('Can only retry failed deployments');
      });

      it('should return 400 for deployment without pipeline', async () => {
        // Update deployment to remove pipeline
        await prisma.deployment.update({
          where: { id: testDeployment.id },
          data: { pipelineId: null },
        });

        const response = await request(app)
          .post(`/api/devops/deployments/${testDeployment.id}/retry`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Cannot retry deployment without associated pipeline');
      });

      it('should require authentication', async () => {
        await request(app)
          .post(`/api/devops/deployments/${testDeployment.id}/retry`)
          .expect(401);
      });
    });

    describe('GET /api/devops/analytics/overview', () => {
      it('should get overall deployment analytics', async () => {
        const response = await request(app)
          .get('/api/devops/analytics/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ period: 'month' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overview).toBeDefined();
        expect(response.body.data.overview.totalRepositories).toBeGreaterThanOrEqual(1);
        expect(response.body.data.overview.totalDeployments).toBeGreaterThanOrEqual(0);
        expect(response.body.data.repositoryAnalytics).toBeDefined();
        expect(response.body.data.period).toBe('month');
      });

      it('should aggregate metrics across repositories', async () => {
        const response = await request(app)
          .get('/api/devops/analytics/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const overview = response.body.data.overview;
        expect(overview.successRate).toBeGreaterThanOrEqual(0);
        expect(overview.successRate).toBeLessThanOrEqual(100);
        expect(overview.deploymentsByStatus).toBeDefined();
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/devops/analytics/overview')
          .expect(401);
      });
    });

    describe('GET /api/devops/analytics/health', () => {
      it('should get deployment health metrics', async () => {
        const response = await request(app)
          .get('/api/devops/analytics/health')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.healthMetrics).toBeDefined();
        expect(response.body.data.healthMetrics.activeDeployments).toBeGreaterThanOrEqual(0);
        expect(response.body.data.healthMetrics.queuedDeployments).toBeGreaterThanOrEqual(0);
        expect(response.body.data.healthMetrics.failureRate).toBeGreaterThanOrEqual(0);
        expect(response.body.data.healthMetrics.averageDeploymentTime).toBeGreaterThanOrEqual(0);
        expect(response.body.data.healthMetrics.recentFailures).toBeDefined();
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/devops/analytics/health')
          .expect(401);
      });
    });

    describe('GET /api/devops/analytics/trends', () => {
      it('should get deployment performance trends', async () => {
        const response = await request(app)
          .get('/api/devops/analytics/trends')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ days: '7' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.trends).toBeDefined();
        expect(response.body.data.trends.deploymentFrequency).toBeDefined();
        expect(response.body.data.trends.performanceMetrics).toBeDefined();
        expect(response.body.data.trends.topFailureReasons).toBeDefined();
      });

      it('should accept custom days parameter', async () => {
        const response = await request(app)
          .get('/api/devops/analytics/trends')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ days: '14' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.trends).toBeDefined();
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/devops/analytics/trends')
          .expect(401);
      });
    });

    describe('GET /api/devops/repositories/:repositoryId/analytics', () => {
      it('should get deployment analytics for repository', async () => {
        const response = await request(app)
          .get(`/api/devops/repositories/${testRepository.id}/analytics`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ period: 'month' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.analytics).toBeDefined();
        expect(response.body.data.analytics.repositoryId).toBe(testRepository.id);
        expect(response.body.data.analytics.period).toBe('month');
        expect(response.body.data.analytics.metrics).toBeDefined();
        expect(response.body.data.analytics.trends).toBeDefined();
      });

      it('should return 404 for non-existent repository', async () => {
        const response = await request(app)
          .get('/api/devops/repositories/non-existent/analytics')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('NOT_FOUND');
      });

      it('should require authentication', async () => {
        await request(app)
          .get(`/api/devops/repositories/${testRepository.id}/analytics`)
          .expect(401);
      });
    });
  });
});