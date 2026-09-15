 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Router } from 'express';
import { authMiddleware } from '../lib/middleware/auth.middleware';
import { repositoryService } from '../lib/services/repository.service';
import { pipelineService } from '../lib/services/pipeline.service';
import { deploymentTrackingService } from '../lib/services/deployment-tracking.service';
import { GitProviderFactory } from '../lib/services/git-providers/index';
import {
  gitProviderSchema,
  oauthCallbackSchema,
  repositoryQuerySchema,
  webhookPayloadSchema,
  pipelineCreateSchema,
  pipelineUpdateSchema,
  pipelineQuerySchema,

  deploymentQuerySchema,
} from '../lib/validations/devops';

const router = Router();

// Initialize git providers
GitProviderFactory.initialize();

/**
 * GET /api/devops/providers
 * Get available git providers
 */
router.get('/providers', authMiddleware, async (req, res) => {
  try {
    const providers = GitProviderFactory.getAvailableProviders();
    
    res.json({
      success: true,
      data: {
        providers: providers.map(name => ({
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          available: true,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get available providers',
      },
    });
  }
});

/**
 * GET /api/devops/auth/:provider
 * Get OAuth authorization URL for git provider
 */
router.get('/auth/:provider', authMiddleware, async (req, res) => {
  try {
    const provider = gitProviderSchema.parse(req.params.provider);
    const userId = req.user.id;
    
    const authUrl = await repositoryService.getAuthUrl(provider, userId);
    
    res.json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error('Error getting auth URL:', error);
    
    if (error instanceof Error && error.message.includes('not available')) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get authorization URL',
        },
      });
    }
  }
});

/**
 * GET /api/devops/auth/:provider/callback
 * Handle OAuth callback from git provider
 */
router.get('/auth/:provider/callback', async (req, res) => {
  try {
    const provider = gitProviderSchema.parse(req.params.provider);
    const { code, state } = oauthCallbackSchema.parse(req.query);
    
    const result = await repositoryService.handleOAuthCallback(provider, code, state);
    
    // Redirect to frontend with success
    const redirectUrl = new URL('/dashboard/devops', process.env.FRONTEND_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('connected', provider);
    redirectUrl.searchParams.set('repositories', result.repositories.length.toString());
    
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    
    // Redirect to frontend with error
    const redirectUrl = new URL('/dashboard/devops', process.env.FRONTEND_URL || 'http://localhost:3000');
    redirectUrl.searchParams.set('error', 'connection_failed');
    redirectUrl.searchParams.set('provider', req.params.provider);
    
    res.redirect(redirectUrl.toString());
  }
});

/**
 * GET /api/devops/repositories
 * Get user repositories
 */
router.get('/repositories', authMiddleware, async (req, res) => {
  try {
    const query = repositoryQuerySchema.parse(req.query);
    const userId = req.user.id;
    
    let repositories = await repositoryService.getUserRepositories(userId);
    
    // Filter by provider if specified
    if (query.provider) {
      repositories = repositories.filter(repo => repo.provider === query.provider);
    }
    
    // Filter by search term if specified
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      repositories = repositories.filter(repo =>
        repo.repoUrl.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply pagination
    const total = repositories.length;
    const paginatedRepos = repositories.slice(query.offset, query.offset + query.limit);
    
    res.json({
      success: true,
      data: {
        repositories: paginatedRepos,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error getting repositories:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get repositories',
      },
    });
  }
});

/**
 * GET /api/devops/repositories/:id
 * Get repository details
 */
router.get('/repositories/:id', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.id;
    
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(req.user.id);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
    }
    
    const details = await repositoryService.getRepositoryDetails(repositoryId);
    
    res.json({
      success: true,
      data: {
        repository: {
          ...repository,
          details,
        },
      },
    });
  } catch (error) {
    console.error('Error getting repository details:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get repository details',
      },
    });
  }
});

/**
 * POST /api/devops/repositories/:id/webhook
 * Create webhook for repository
 */
router.post('/repositories/:id/webhook', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.id;
    
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(req.user.id);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
    }
    
    await repositoryService.createWebhook(repositoryId);
    
    res.json({
      success: true,
      data: {
        message: 'Webhook created successfully',
      },
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create webhook',
      },
    });
  }
});

/**
 * DELETE /api/devops/repositories/:id/webhook
 * Delete webhook for repository
 */
router.delete('/repositories/:id/webhook', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.id;
    
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(req.user.id);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
    }
    
    await repositoryService.deleteWebhook(repositoryId);
    
    res.json({
      success: true,
      data: {
        message: 'Webhook deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete webhook',
      },
    });
  }
});

/**
 * DELETE /api/devops/repositories/:id
 * Remove repository access
 */
router.delete('/repositories/:id', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.id;
    
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(req.user.id);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Repository not found',
        },
      });
    }
    
    await repositoryService.removeRepository(repositoryId);
    
    res.json({
      success: true,
      data: {
        message: 'Repository access removed successfully',
      },
    });
  } catch (error) {
    console.error('Error removing repository:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove repository access',
      },
    });
  }
});

/**
 * GET /api/devops/pipelines/templates
 * Get available pipeline templates
 */
router.get('/pipelines/templates', authMiddleware, async (req, res) => {
  try {
    const templates = pipelineService.getPipelineTemplates();
    
    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error('Error getting pipeline templates:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get pipeline templates',
      },
    });
  }
});

/**
 * POST /api/devops/pipelines
 * Create a new pipeline
 */
router.post('/pipelines', authMiddleware, async (req, res) => {
  try {
    const pipelineData = pipelineCreateSchema.parse(req.body);
    const userId = req.user.id;
    
    const pipeline = await pipelineService.createPipeline(
      pipelineData.repositoryId,
      userId,
      {
        name: pipelineData.name,
        stages: pipelineData.stages ,
        triggers: pipelineData.triggers ,
        environment: pipelineData.environment,
      }
    );
    
    res.status(201).json({
      success: true,
      data: { pipeline },
    });
  } catch (error) {
    console.error('Error creating pipeline:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create pipeline',
        },
      });
    }
  }
});

/**
 * GET /api/devops/repositories/:repositoryId/pipelines
 * Get pipelines for a repository
 */
router.get('/repositories/:repositoryId/pipelines', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.repositoryId;
    const query = pipelineQuerySchema.parse(req.query);
    const userId = req.user.id;
    
    let pipelines = await pipelineService.getRepositoryPipelines(repositoryId, userId);
    
    // Filter by status if specified
    if (query.status) {
      pipelines = pipelines.filter(pipeline => pipeline.status === query.status);
    }
    
    // Apply pagination
    const total = pipelines.length;
    const paginatedPipelines = pipelines.slice(query.offset, query.offset + query.limit);
    
    res.json({
      success: true,
      data: {
        pipelines: paginatedPipelines,
        pagination: {
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + query.limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error getting repository pipelines:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get repository pipelines',
        },
      });
    }
  }
});

/**
 * GET /api/devops/pipelines/:id
 * Get pipeline by ID
 */
router.get('/pipelines/:id', authMiddleware, async (req, res) => {
  try {
    const pipelineId = req.params.id;
    const userId = req.user.id;
    
    const pipeline = await pipelineService.getPipeline(pipelineId, userId);
    
    res.json({
      success: true,
      data: { pipeline },
    });
  } catch (error) {
    console.error('Error getting pipeline:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get pipeline',
        },
      });
    }
  }
});

/**
 * PUT /api/devops/pipelines/:id
 * Update pipeline
 */
router.put('/pipelines/:id', authMiddleware, async (req, res) => {
  try {
    const pipelineId = req.params.id;
    const updates = pipelineUpdateSchema.parse(req.body);
    const userId = req.user.id;
    
    const pipeline = await pipelineService.updatePipeline(pipelineId, userId, updates );
    
    res.json({
      success: true,
      data: { pipeline },
    });
  } catch (error) {
    console.error('Error updating pipeline:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update pipeline',
        },
      });
    }
  }
});

/**
 * DELETE /api/devops/pipelines/:id
 * Delete pipeline
 */
router.delete('/pipelines/:id', authMiddleware, async (req, res) => {
  try {
    const pipelineId = req.params.id;
    const userId = req.user.id;
    
    await pipelineService.deletePipeline(pipelineId, userId);
    
    res.json({
      success: true,
      data: {
        message: 'Pipeline deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete pipeline',
        },
      });
    }
  }
});

/**
 * POST /api/devops/pipelines/:id/execute
 * Execute pipeline manually
 */
router.post('/pipelines/:id/execute', authMiddleware, async (req, res) => {
  try {
    const pipelineId = req.params.id;
    const { commit } = req.body;
    const userId = req.user.id;
    
    const deployment = await pipelineService.executePipeline(pipelineId, userId, commit);
    
    res.status(201).json({
      success: true,
      data: { deployment },
    });
  } catch (error) {
    console.error('Error executing pipeline:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error instanceof Error && error.message.includes('not active')) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to execute pipeline',
        },
      });
    }
  }
});

/**
 * GET /api/devops/deployments/:id
 * Get deployment details
 */
router.get('/deployments/:id', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    
    const deployment = await deploymentTrackingService.getDeployment(deploymentId, userId);
    
    res.json({
      success: true,
      data: { deployment },
    });
  } catch (error) {
    console.error('Error getting deployment:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error instanceof Error && error.message.includes('Access denied')) {
      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get deployment',
        },
      });
    }
  }
});

/**
 * GET /api/devops/repositories/:repositoryId/deployments
 * Get deployments for a repository
 */
router.get('/repositories/:repositoryId/deployments', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.repositoryId;
    const userId = req.user.id;
    const query = deploymentQuerySchema.parse(req.query);
    
    const result = await deploymentTrackingService.getRepositoryDeployments(
      repositoryId,
      userId,
      {
        status: query.status,
        limit: query.limit,
        offset: query.offset,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      }
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting repository deployments:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get repository deployments',
        },
      });
    }
  }
});

/**
 * GET /api/devops/deployments/:id/logs
 * Get deployment logs
 */
router.get('/deployments/:id/logs', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    const { level, stage, limit, offset } = req.query;
    
    const result = await deploymentTrackingService.getDeploymentLogs(
      deploymentId,
      userId,
      {
        level: level ,
        stage: stage ,
        limit: limit ? parseInt(limit ) : undefined,
        offset: offset ? parseInt(offset ) : undefined,
      }
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting deployment logs:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get deployment logs',
        },
      });
    }
  }
});

/**
 * POST /api/devops/deployments/:id/cancel
 * Cancel a running deployment
 */
router.post('/deployments/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    
    await deploymentTrackingService.cancelDeployment(deploymentId, userId, reason);
    
    res.json({
      success: true,
      data: {
        message: 'Deployment canceled successfully',
      },
    });
  } catch (error) {
    console.error('Error canceling deployment:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error instanceof Error && error.message.includes('Can only cancel')) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel deployment',
        },
      });
    }
  }
});

/**
 * POST /api/devops/deployments/:id/rollback
 * Rollback a deployment
 */
router.post('/deployments/:id/rollback', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    const { targetCommit, targetDeploymentId, reason, skipValidation } = req.body;
    
    const rollbackDeployment = await deploymentTrackingService.rollbackDeployment(
      deploymentId,
      userId,
      { targetCommit, targetDeploymentId, reason, skipValidation }
    );
    
    res.status(201).json({
      success: true,
      data: {
        deployment: rollbackDeployment,
        message: 'Rollback deployment created successfully',
      },
    });
  } catch (error) {
    console.error('Error rolling back deployment:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else if (error instanceof Error && error.message.includes('Can only rollback')) {
      res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to rollback deployment',
        },
      });
    }
  }
});

/**
 * GET /api/devops/deployments/:id/recovery
 * Get deployment recovery options
 */
router.get('/deployments/:id/recovery', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    
    const recoveryOptions = await deploymentTrackingService.getRecoveryOptions(deploymentId, userId);
    
    res.json({
      success: true,
      data: recoveryOptions,
    });
  } catch (error) {
    console.error('Error getting recovery options:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recovery options',
        },
      });
    }
  }
});

/**
 * GET /api/devops/repositories/:repositoryId/analytics
 * Get deployment analytics for a repository
 */
router.get('/repositories/:repositoryId/analytics', authMiddleware, async (req, res) => {
  try {
    const repositoryId = req.params.repositoryId;
    const userId = req.user.id;
    const { period } = req.query;
    
    const analytics = await deploymentTrackingService.getDeploymentAnalytics(
      repositoryId,
      userId,
      period 
    );
    
    res.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    console.error('Error getting deployment analytics:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get deployment analytics',
        },
      });
    }
  }
});

/**
 * GET /api/devops/deployments/:id/status
 * Get real-time deployment status
 */
router.get('/deployments/:id/status', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    
    // Verify user has access to this deployment
    await deploymentTrackingService.getDeployment(deploymentId, userId);
    
    const cachedStatus = deploymentTrackingService.getDeploymentStatusFromCache(deploymentId);
    
    res.json({
      success: true,
      data: {
        deploymentId,
        status: _optionalChain([cachedStatus, 'optionalAccess', _ => _.status]) || 'unknown',
        lastUpdated: _optionalChain([cachedStatus, 'optionalAccess', _2 => _2.updatedAt]) || null,
        logs: _optionalChain([cachedStatus, 'optionalAccess', _3 => _3.logs]) || [],
      },
    });
  } catch (error) {
    console.error('Error getting deployment status:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get deployment status',
        },
      });
    }
  }
});

/**
 * POST /api/devops/deployments/:id/retry
 * Retry a failed deployment
 */
router.post('/deployments/:id/retry', authMiddleware, async (req, res) => {
  try {
    const deploymentId = req.params.id;
    const userId = req.user.id;
    
    const deployment = await deploymentTrackingService.getDeployment(deploymentId, userId);
    
    if (deployment.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Can only retry failed deployments',
        },
      });
    }
    
    if (!deployment.pipelineId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Cannot retry deployment without associated pipeline',
        },
      });
    }
    
    // Execute the pipeline again with the same commit
    const newDeployment = await pipelineService.executePipeline(
      deployment.pipelineId,
      userId,
      deployment.commit
    );
    
    res.status(201).json({
      success: true,
      data: {
        deployment: newDeployment,
        message: 'Deployment retry initiated successfully',
      },
    });
  } catch (error) {
    console.error('Error retrying deployment:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: error.message,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retry deployment',
        },
      });
    }
  }
});

/**
 * GET /api/devops/analytics/overview
 * Get overall deployment analytics across all repositories
 */
router.get('/analytics/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;
    
    const repositories = await repositoryService.getUserRepositories(userId);
    
    // Get analytics for all repositories
    const analyticsPromises = repositories.map(repo =>
      deploymentTrackingService.getDeploymentAnalytics(
        repo.id,
        userId,
        period 
      )
    );
    
    const allAnalytics = await Promise.all(analyticsPromises);
    
    // Aggregate metrics across all repositories
    const aggregatedMetrics = allAnalytics.reduce(
      (acc, analytics) => {
        acc.totalDeployments += analytics.metrics.totalDeployments;
        acc.successfulDeployments += analytics.metrics.successfulDeployments;
        acc.failedDeployments += analytics.metrics.failedDeployments;
        acc.totalDeploymentTime += analytics.metrics.averageDeploymentTime * analytics.metrics.totalDeployments;
        
        // Merge deployment status counts
        Object.entries(analytics.metrics.deploymentsByStatus).forEach(([status, count]) => {
          acc.deploymentsByStatus[status] = (acc.deploymentsByStatus[status] || 0) + count;
        });
        
        return acc;
      },
      {
        totalDeployments: 0,
        successfulDeployments: 0,
        failedDeployments: 0,
        totalDeploymentTime: 0,
        deploymentsByStatus: {} ,
      }
    );
    
    const averageDeploymentTime = aggregatedMetrics.totalDeployments > 0
      ? aggregatedMetrics.totalDeploymentTime / aggregatedMetrics.totalDeployments
      : 0;
    
    const successRate = aggregatedMetrics.totalDeployments > 0
      ? (aggregatedMetrics.successfulDeployments / aggregatedMetrics.totalDeployments) * 100
      : 0;
    
    res.json({
      success: true,
      data: {
        overview: {
          totalRepositories: repositories.length,
          totalDeployments: aggregatedMetrics.totalDeployments,
          successfulDeployments: aggregatedMetrics.successfulDeployments,
          failedDeployments: aggregatedMetrics.failedDeployments,
          averageDeploymentTime,
          successRate,
          deploymentsByStatus: aggregatedMetrics.deploymentsByStatus,
        },
        repositoryAnalytics: allAnalytics,
        period,
      },
    });
  } catch (error) {
    console.error('Error getting deployment overview:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get deployment overview',
      },
    });
  }
});

/**
 * GET /api/devops/analytics/health
 * Get deployment health metrics for monitoring
 */
router.get('/analytics/health', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const healthMetrics = await deploymentTrackingService.getDeploymentHealthMetrics(userId);
    
    res.json({
      success: true,
      data: { healthMetrics },
    });
  } catch (error) {
    console.error('Error getting deployment health metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get deployment health metrics',
      },
    });
  }
});

/**
 * GET /api/devops/analytics/trends
 * Get deployment performance trends
 */
router.get('/analytics/trends', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = '30' } = req.query;
    
    const trends = await deploymentTrackingService.getDeploymentTrends(
      userId,
      parseInt(days )
    );
    
    res.json({
      success: true,
      data: { trends },
    });
  } catch (error) {
    console.error('Error getting deployment trends:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get deployment trends',
      },
    });
  }
});

/**
 * POST /api/devops/webhooks/:provider
 * Handle incoming webhooks from git providers
 */
router.post('/webhooks/:provider', async (req, res) => {
  try {
    const provider = gitProviderSchema.parse(req.params.provider);
    const signature = req.headers['x-hub-signature-256'] || 
                     req.headers['x-gitlab-token'] || 
                     req.headers['x-event-key'] || '';
    
    const payload = webhookPayloadSchema.parse(req.body);
    const rawPayload = JSON.stringify(req.body);
    
    await repositoryService.handleWebhook(provider, payload , signature , rawPayload);
    
    res.json({
      success: true,
      data: {
        message: 'Webhook processed successfully',
      },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).json({
      success: false,
      error: {
        type: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook',
      },
    });
  }
});

export default router;