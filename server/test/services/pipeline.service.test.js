import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PipelineService } from '../../lib/services/pipeline.service';
import { repositoryService } from '../../lib/services/repository.service';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../helpers/database';

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

// Mock repository service
vi.mock('../../lib/services/repository.service', () => ({
  repositoryService: {
    getUserRepositories: vi.fn(),
    getRepositoryDetails: vi.fn(),
  },
}));

const prisma = new PrismaClient();

describe('PipelineService', () => {
  let pipelineService;
  let testUser;
  let testRepository;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    pipelineService = new PipelineService();
    
    // Create test user
    testUser = await createTestUser({
      email: 'pipeline-test@example.com',
      firstName: 'Pipeline',
      lastName: 'Test',
    });

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

    // Mock repository service responses
    vi.mocked(repositoryService.getUserRepositories).mockResolvedValue([
      {
        id: testRepository.id,
        userId: testUser.id,
        provider: 'github',
        repoUrl: testRepository.repoUrl,
        branch: testRepository.branch,
        accessTokenEncrypted: testRepository.accessTokenEncrypted,
        webhookUrl: null,
        createdAt: testRepository.createdAt,
        updatedAt: testRepository.updatedAt,
      },
    ]);

    vi.mocked(repositoryService.getRepositoryDetails).mockResolvedValue({
      id: 'test-repo',
      name: 'test-repo',
      fullName: 'test/repo',
      description: 'Test repository',
      url: testRepository.repoUrl,
      defaultBranch: 'main',
      isPrivate: false,
      language: 'TypeScript',
      updatedAt: new Date(),
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.deployment.deleteMany();
    await prisma.pipeline.deleteMany();
    await prisma.repository.deleteMany();
    await prisma.user.deleteMany();
    
    vi.clearAllMocks();
  });

  describe('createPipeline', () => {
    it('should create a new pipeline successfully', async () => {
      const pipelineData = {
        name: 'Test Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build' ,
            commands: ['npm install', 'npm run build'],
            timeout: 300,
          },
          {
            id: 'test',
            name: 'Test',
            type: 'test' ,
            commands: ['npm test'],
            dependsOn: ['build'],
            timeout: 600,
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
        environment: {
          NODE_ENV: 'production',
        },
      };

      const pipeline = await pipelineService.createPipeline(
        testRepository.id,
        testUser.id,
        pipelineData
      );

      expect(pipeline).toBeDefined();
      expect(pipeline.name).toBe(pipelineData.name);
      expect(pipeline.stages).toEqual(pipelineData.stages);
      expect(pipeline.triggers).toEqual(pipelineData.triggers);
      expect(pipeline.environment).toEqual(pipelineData.environment);
      expect(pipeline.status).toBe('active');
    });

    it('should throw error for non-existent repository', async () => {
      const pipelineData = {
        name: 'Test Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build' ,
            commands: ['npm install'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
      };

      await expect(
        pipelineService.createPipeline('non-existent-repo', testUser.id, pipelineData)
      ).rejects.toThrow('Repository not found or access denied');
    });

    it('should validate pipeline configuration', async () => {
      const invalidPipelineData = {
        name: '',
        stages: [],
        triggers: [],
      };

      await expect(
        pipelineService.createPipeline(testRepository.id, testUser.id, invalidPipelineData)
      ).rejects.toThrow('Pipeline name is required');
    });

    it('should validate stage dependencies', async () => {
      const pipelineData = {
        name: 'Test Pipeline',
        stages: [
          {
            id: 'test',
            name: 'Test',
            type: 'test' ,
            commands: ['npm test'],
            dependsOn: ['non-existent-stage'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
      };

      await expect(
        pipelineService.createPipeline(testRepository.id, testUser.id, pipelineData)
      ).rejects.toThrow('depends on non-existent stage');
    });
  });

  describe('getRepositoryPipelines', () => {
    it('should return pipelines for a repository', async () => {
      // Create test pipeline
      const pipeline = await prisma.pipeline.create({
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

      const pipelines = await pipelineService.getRepositoryPipelines(
        testRepository.id,
        testUser.id
      );

      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].id).toBe(pipeline.id);
      expect(pipelines[0].name).toBe('Test Pipeline');
    });

    it('should throw error for unauthorized access', async () => {
      vi.mocked(repositoryService.getUserRepositories).mockResolvedValue([]);

      await expect(
        pipelineService.getRepositoryPipelines(testRepository.id, 'other-user-id')
      ).rejects.toThrow('Repository not found or access denied');
    });
  });

  describe('getPipeline', () => {
    it('should return pipeline by ID', async () => {
      const pipeline = await prisma.pipeline.create({
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

      const result = await pipelineService.getPipeline(pipeline.id, testUser.id);

      expect(result.id).toBe(pipeline.id);
      expect(result.name).toBe('Test Pipeline');
    });

    it('should throw error for non-existent pipeline', async () => {
      await expect(
        pipelineService.getPipeline('non-existent-pipeline', testUser.id)
      ).rejects.toThrow('Pipeline not found');
    });
  });

  describe('updatePipeline', () => {
    it('should update pipeline successfully', async () => {
      const pipeline = await prisma.pipeline.create({
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

      const updates = {
        name: 'Updated Pipeline',
        status: 'paused' ,
      };

      const updatedPipeline = await pipelineService.updatePipeline(
        pipeline.id,
        testUser.id,
        updates
      );

      expect(updatedPipeline.name).toBe('Updated Pipeline');
      expect(updatedPipeline.status).toBe('paused');
    });
  });

  describe('deletePipeline', () => {
    it('should delete pipeline successfully', async () => {
      const pipeline = await prisma.pipeline.create({
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

      await pipelineService.deletePipeline(pipeline.id, testUser.id);

      const deletedPipeline = await prisma.pipeline.findUnique({
        where: { id: pipeline.id },
      });

      expect(deletedPipeline).toBeNull();
    });
  });

  describe('executePipeline', () => {
    it('should execute pipeline and create deployment', async () => {
      const pipeline = await prisma.pipeline.create({
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

      const deployment = await pipelineService.executePipeline(
        pipeline.id,
        testUser.id,
        'abc123'
      );

      expect(deployment).toBeDefined();
      expect(deployment.pipelineId).toBe(pipeline.id);
      expect(deployment.commit).toBe('abc123');
      expect(deployment.status).toBe('pending');
    });

    it('should throw error for inactive pipeline', async () => {
      const pipeline = await prisma.pipeline.create({
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
          status: 'PAUSED',
        },
      });

      await expect(
        pipelineService.executePipeline(pipeline.id, testUser.id)
      ).rejects.toThrow('Pipeline is not active');
    });
  });

  describe('getPipelineTemplates', () => {
    it('should return available pipeline templates', () => {
      const templates = pipelineService.getPipelineTemplates();

      expect(templates).toHaveLength(3);
      expect(templates[0].name).toBe('Node.js CI/CD');
      expect(templates[1].name).toBe('Docker Build & Deploy');
      expect(templates[2].name).toBe('Python CI/CD');

      // Verify template structure
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('stages');
        expect(template).toHaveProperty('triggers');
        expect(Array.isArray(template.stages)).toBe(true);
        expect(Array.isArray(template.triggers)).toBe(true);
      });
    });
  });

  describe('validatePipelineConfig', () => {
    it('should validate valid pipeline configuration', () => {
      const validConfig = {
        name: 'Valid Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build' ,
            commands: ['npm install'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
      };

      // Should not throw
      expect(() => {
        (pipelineService ).validatePipelineConfig(validConfig);
      }).not.toThrow();
    });

    it('should reject empty pipeline name', () => {
      const invalidConfig = {
        name: '',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build' ,
            commands: ['npm install'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
      };

      expect(() => {
        (pipelineService ).validatePipelineConfig(invalidConfig);
      }).toThrow('Pipeline name is required');
    });

    it('should reject pipeline without stages', () => {
      const invalidConfig = {
        name: 'Invalid Pipeline',
        stages: [],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
      };

      expect(() => {
        (pipelineService ).validatePipelineConfig(invalidConfig);
      }).toThrow('Pipeline must have at least one stage');
    });

    it('should reject pipeline without triggers', () => {
      const invalidConfig = {
        name: 'Invalid Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build' ,
            commands: ['npm install'],
          },
        ],
        triggers: [],
      };

      expect(() => {
        (pipelineService ).validatePipelineConfig(invalidConfig);
      }).toThrow('Pipeline must have at least one trigger');
    });

    it('should reject duplicate stage IDs', () => {
      const invalidConfig = {
        name: 'Invalid Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build 1',
            type: 'build' ,
            commands: ['npm install'],
          },
          {
            id: 'build',
            name: 'Build 2',
            type: 'build' ,
            commands: ['npm run build'],
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push' ,
            branches: ['main'],
          },
        ],
      };

      expect(() => {
        (pipelineService ).validatePipelineConfig(invalidConfig);
      }).toThrow('Duplicate stage ID: build');
    });

    it('should validate schedule trigger has schedule', () => {
      const invalidConfig = {
        name: 'Invalid Pipeline',
        stages: [
          {
            id: 'build',
            name: 'Build',
            type: 'build' ,
            commands: ['npm install'],
          },
        ],
        triggers: [
          {
            id: 'schedule-trigger',
            type: 'schedule' ,
          },
        ],
      };

      expect(() => {
        (pipelineService ).validatePipelineConfig(invalidConfig);
      }).toThrow('Schedule trigger must have schedule');
    });
  });
});