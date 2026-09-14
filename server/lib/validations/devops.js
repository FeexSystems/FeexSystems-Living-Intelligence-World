import { z } from 'zod';

export const gitProviderSchema = z.enum(['github', 'gitlab', 'bitbucket']);

export const repositoryCreateSchema = z.object({
  provider: gitProviderSchema,
  repoUrl: z.string().url('Invalid repository URL'),
  branch: z.string().min(1, 'Branch name is required').default('main'),
});

export const repositoryUpdateSchema = z.object({
  branch: z.string().min(1, 'Branch name is required').optional(),
});

export const pipelineStageSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Stage name is required'),
  type: z.enum(['build', 'test', 'deploy', 'custom']),
  commands: z.array(z.string()).min(1, 'At least one command is required'),
  environment: z.record(z.string()).optional(),
  dependsOn: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
});

export const pipelineTriggerSchema = z.object({
  id: z.string(),
  type: z.enum(['push', 'pull_request', 'schedule', 'manual']),
  branches: z.array(z.string()).optional(),
  schedule: z.string().optional(), // cron expression
  conditions: z.record(z.any()).optional(),
});

export const pipelineCreateSchema = z.object({
  repositoryId: z.string().cuid('Invalid repository ID'),
  name: z.string().min(1, 'Pipeline name is required').max(100, 'Pipeline name too long'),
  stages: z.array(pipelineStageSchema).min(1, 'At least one stage is required'),
  triggers: z.array(pipelineTriggerSchema).min(1, 'At least one trigger is required'),
  environment: z.record(z.string()).optional().default({}),
});

export const pipelineUpdateSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(100, 'Pipeline name too long').optional(),
  stages: z.array(pipelineStageSchema).min(1, 'At least one stage is required').optional(),
  triggers: z.array(pipelineTriggerSchema).min(1, 'At least one trigger is required').optional(),
  environment: z.record(z.string()).optional(),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
});

export const deploymentCreateSchema = z.object({
  repositoryId: z.string().cuid('Invalid repository ID'),
  pipelineId: z.string().cuid('Invalid pipeline ID').optional(),
  commit: z.string().min(1, 'Commit hash is required'),
});

export const webhookPayloadSchema = z.object({
  event: z.string(),
  repository: z.object({
    id: z.string(),
    name: z.string(),
    fullName: z.string(),
    url: z.string().url(),
  }),
  commit: z.object({
    id: z.string(),
    message: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    timestamp: z.coerce.date(),
  }).optional(),
  branch: z.string().optional(),
  pullRequest: z.object({
    id: z.string(),
    title: z.string(),
    state: z.string(),
    sourceBranch: z.string(),
    targetBranch: z.string(),
  }).optional(),
});

export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

export const repositoryQuerySchema = z.object({
  provider: gitProviderSchema.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const pipelineQuerySchema = z.object({
  repositoryId: z.string().cuid().optional(),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const deploymentQuerySchema = z.object({
  repositoryId: z.string().cuid().optional(),
  pipelineId: z.string().cuid().optional(),
  status: z.enum(['pending', 'running', 'success', 'failed', 'canceled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Type exports
 











