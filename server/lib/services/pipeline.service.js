import { PrismaClient } from '@prisma/client';

import { repositoryService } from './repository.service';
import Docker from 'dockerode';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();
const docker = new Docker();

export class PipelineService extends EventEmitter {constructor(...args) { super(...args); PipelineService.prototype.__init.call(this); }
   __init() {this.runningPipelines = new Map()}

  /**
   * Create a new pipeline
   */
  async createPipeline(
    repositoryId,
    userId,
    pipelineData





  ) {
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(userId);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      throw new Error('Repository not found or access denied');
    }

    // Validate pipeline configuration
    this.validatePipelineConfig(pipelineData);

    // Create pipeline in database
    const pipeline = await prisma.pipeline.create({
      data: {
        repositoryId,
        name: pipelineData.name,
        stages: pipelineData.stages ,
        triggers: pipelineData.triggers ,
        environment: pipelineData.environment || {},
        status: 'ACTIVE',
      },
    });

    return this.mapPipelineFromDb(pipeline);
  }

  /**
   * Get pipelines for a repository
   */
  async getRepositoryPipelines(repositoryId, userId) {
    // Verify repository belongs to user
    const repositories = await repositoryService.getUserRepositories(userId);
    const repository = repositories.find(repo => repo.id === repositoryId);
    
    if (!repository) {
      throw new Error('Repository not found or access denied');
    }

    const pipelines = await prisma.pipeline.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
    });

    return pipelines.map(this.mapPipelineFromDb);
  }

  /**
   * Get pipeline by ID
   */
  async getPipeline(pipelineId, userId) {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id: pipelineId },
      include: { repository: true },
    });

    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    // Verify repository belongs to user
    if (pipeline.repository.userId !== userId) {
      throw new Error('Access denied');
    }

    return this.mapPipelineFromDb(pipeline);
  }

  /**
   * Update pipeline
   */
  async updatePipeline(
    pipelineId,
    userId,
    updates






  ) {
    const pipeline = await this.getPipeline(pipelineId, userId);

    // Validate updates if provided
    if (updates.stages || updates.triggers) {
      this.validatePipelineConfig({
        name: updates.name || pipeline.name,
        stages: updates.stages || pipeline.stages,
        triggers: updates.triggers || pipeline.triggers,
        environment: updates.environment || pipeline.environment,
      });
    }

    const updatedPipeline = await prisma.pipeline.update({
      where: { id: pipelineId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.stages && { stages: updates.stages  }),
        ...(updates.triggers && { triggers: updates.triggers  }),
        ...(updates.environment && { environment: updates.environment }),
        ...(updates.status && { status: updates.status.toUpperCase()  }),
      },
    });

    return this.mapPipelineFromDb(updatedPipeline);
  }

  /**
   * Delete pipeline
   */
  async deletePipeline(pipelineId, userId) {
    await this.getPipeline(pipelineId, userId); // Verify access

    // Stop pipeline if running
    if (this.runningPipelines.has(pipelineId)) {
      await this.stopPipelineExecution(pipelineId);
    }

    await prisma.pipeline.delete({
      where: { id: pipelineId },
    });
  }

  /**
   * Execute pipeline manually
   */
  async executePipeline(
    pipelineId,
    userId,
    commit
  ) {
    const pipeline = await this.getPipeline(pipelineId, userId);

    if (pipeline.status !== 'active') {
      throw new Error('Pipeline is not active');
    }

    // Get repository details
    const repository = await repositoryService.getRepositoryDetails(pipeline.repositoryId);
    const actualCommit = commit || 'HEAD';

    // Create deployment record
    const deployment = await prisma.deployment.create({
      data: {
        repositoryId: pipeline.repositoryId,
        pipelineId: pipeline.id,
        commit: actualCommit,
        status: 'PENDING',
        logs: [],
      },
    });

    // Start pipeline execution asynchronously
    this.startPipelineExecution(deployment.id, pipeline, repository, actualCommit);

    return {
      id: deployment.id,
      repositoryId: deployment.repositoryId,
      pipelineId: deployment.pipelineId || undefined,
      commit: deployment.commit,
      status: deployment.status.toLowerCase() ,
      logs: deployment.logs ,
      startedAt: deployment.startedAt || undefined,
      completedAt: deployment.completedAt || undefined,
    };
  }

  /**
   * Get pipeline templates
   */
  getPipelineTemplates()




 {
    return [
      {
        name: 'Node.js CI/CD',
        description: 'Standard Node.js build, test, and deploy pipeline',
        stages: [
          {
            id: 'install',
            name: 'Install Dependencies',
            type: 'build',
            commands: ['npm ci'],
            timeout: 300,
          },
          {
            id: 'test',
            name: 'Run Tests',
            type: 'test',
            commands: ['npm test'],
            dependsOn: ['install'],
            timeout: 600,
          },
          {
            id: 'build',
            name: 'Build Application',
            type: 'build',
            commands: ['npm run build'],
            dependsOn: ['test'],
            timeout: 300,
          },
          {
            id: 'deploy',
            name: 'Deploy to Production',
            type: 'deploy',
            commands: ['npm run deploy'],
            dependsOn: ['build'],
            timeout: 900,
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push',
            branches: ['main', 'master'],
          },
        ],
      },
      {
        name: 'Docker Build & Deploy',
        description: 'Build Docker image and deploy to container registry',
        stages: [
          {
            id: 'build-image',
            name: 'Build Docker Image',
            type: 'build',
            commands: [
              'docker build -t $IMAGE_NAME:$COMMIT_SHA .',
              'docker tag $IMAGE_NAME:$COMMIT_SHA $IMAGE_NAME:latest',
            ],
            timeout: 600,
          },
          {
            id: 'test-image',
            name: 'Test Docker Image',
            type: 'test',
            commands: [
              'docker run --rm $IMAGE_NAME:$COMMIT_SHA npm test',
            ],
            dependsOn: ['build-image'],
            timeout: 300,
          },
          {
            id: 'push-image',
            name: 'Push to Registry',
            type: 'deploy',
            commands: [
              'docker push $IMAGE_NAME:$COMMIT_SHA',
              'docker push $IMAGE_NAME:latest',
            ],
            dependsOn: ['test-image'],
            timeout: 300,
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push',
            branches: ['main'],
          },
        ],
      },
      {
        name: 'Python CI/CD',
        description: 'Python application with pytest and deployment',
        stages: [
          {
            id: 'setup',
            name: 'Setup Python Environment',
            type: 'build',
            commands: [
              'python -m pip install --upgrade pip',
              'pip install -r requirements.txt',
            ],
            timeout: 300,
          },
          {
            id: 'lint',
            name: 'Code Linting',
            type: 'test',
            commands: [
              'flake8 .',
              'black --check .',
            ],
            dependsOn: ['setup'],
            timeout: 120,
          },
          {
            id: 'test',
            name: 'Run Tests',
            type: 'test',
            commands: [
              'pytest --cov=. --cov-report=xml',
            ],
            dependsOn: ['setup'],
            timeout: 600,
          },
          {
            id: 'deploy',
            name: 'Deploy Application',
            type: 'deploy',
            commands: [
              'python setup.py sdist bdist_wheel',
              'twine upload dist/*',
            ],
            dependsOn: ['lint', 'test'],
            timeout: 300,
          },
        ],
        triggers: [
          {
            id: 'push-main',
            type: 'push',
            branches: ['main'],
          },
          {
            id: 'pr',
            type: 'pull_request',
            branches: ['main'],
          },
        ],
      },
    ];
  }

  /**
   * Validate pipeline configuration
   */
   validatePipelineConfig(config




) {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Pipeline name is required');
    }

    if (!config.stages || config.stages.length === 0) {
      throw new Error('Pipeline must have at least one stage');
    }

    if (!config.triggers || config.triggers.length === 0) {
      throw new Error('Pipeline must have at least one trigger');
    }

    // Validate stages
    const stageIds = new Set();
    for (const stage of config.stages) {
      if (!stage.id || !stage.name || !stage.type) {
        throw new Error('Stage must have id, name, and type');
      }

      if (stageIds.has(stage.id)) {
        throw new Error(`Duplicate stage ID: ${stage.id}`);
      }
      stageIds.add(stage.id);

      if (!stage.commands || stage.commands.length === 0) {
        throw new Error(`Stage ${stage.id} must have at least one command`);
      }

      // Validate dependencies
      if (stage.dependsOn) {
        for (const depId of stage.dependsOn) {
          if (!stageIds.has(depId)) {
            throw new Error(`Stage ${stage.id} depends on non-existent stage: ${depId}`);
          }
        }
      }
    }

    // Validate triggers
    for (const trigger of config.triggers) {
      if (!trigger.id || !trigger.type) {
        throw new Error('Trigger must have id and type');
      }

      if (trigger.type === 'schedule' && !trigger.schedule) {
        throw new Error('Schedule trigger must have schedule (cron expression)');
      }
    }
  }

  /**
   * Start pipeline execution
   */
   async startPipelineExecution(
    deploymentId,
    pipeline,
    repository,
    commit
  ) {
    try {
      // Update deployment status
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'RUNNING' },
      });

      // Create execution context
      const executionContext = {
        deploymentId,
        pipeline,
        repository,
        commit,
        environment: {
          ...pipeline.environment,
          COMMIT_SHA: commit,
          REPOSITORY_URL: repository.url,
          BRANCH: repository.defaultBranch,
        },
        logs: [],
      };

      this.runningPipelines.set(deploymentId, executionContext);

      // Execute stages in order
      await this.executeStages(executionContext);

      // Mark as successful
      await this.completePipelineExecution(deploymentId, 'SUCCESS');
    } catch (error) {
      console.error(`Pipeline execution failed for deployment ${deploymentId}:`, error);
      await this.completePipelineExecution(deploymentId, 'FAILED', error.message);
    } finally {
      this.runningPipelines.delete(deploymentId);
    }
  }

  /**
   * Execute pipeline stages
   */
   async executeStages(context) {
    const { pipeline, deploymentId } = context;
    const completedStages = new Set();
    const stageQueue = [...pipeline.stages];

    while (stageQueue.length > 0) {
      // Find stages that can be executed (dependencies satisfied)
      const readyStages = stageQueue.filter(stage => 
        !stage.dependsOn || stage.dependsOn.every((dep) => completedStages.has(dep))
      );

      if (readyStages.length === 0) {
        throw new Error('Circular dependency detected in pipeline stages');
      }

      // Execute ready stages in parallel
      await Promise.all(
        readyStages.map(async (stage) => {
          await this.executeStage(context, stage);
          completedStages.add(stage.id);
          
          // Remove from queue
          const index = stageQueue.findIndex(s => s.id === stage.id);
          if (index > -1) {
            stageQueue.splice(index, 1);
          }
        })
      );
    }
  }

  /**
   * Execute a single stage
   */
   async executeStage(context, stage) {
    const { deploymentId, environment } = context;
    
    this.addLog(context, 'info', `Starting stage: ${stage.name}`, stage.id);

    try {
      // Create Docker container for stage execution
      const container = await docker.createContainer({
        Image: 'node:18-alpine', // Default image, should be configurable
        Cmd: ['/bin/sh', '-c', stage.commands.join(' && ')],
        Env: Object.entries(environment).map(([key, value]) => `${key}=${value}`),
        WorkingDir: '/workspace',
        AttachStdout: true,
        AttachStderr: true,
      });

      // Start container
      await container.start();

      // Get logs
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
      });

      // Process logs
      stream.on('data', (chunk) => {
        const message = chunk.toString().trim();
        if (message) {
          this.addLog(context, 'info', message, stage.id);
        }
      });

      // Wait for container to finish
      const result = await container.wait();

      // Clean up container
      await container.remove();

      if (result.StatusCode !== 0) {
        throw new Error(`Stage failed with exit code ${result.StatusCode}`);
      }

      this.addLog(context, 'info', `Stage completed successfully: ${stage.name}`, stage.id);
    } catch (error) {
      this.addLog(context, 'error', `Stage failed: ${error.message}`, stage.id);
      throw error;
    }
  }

  /**
   * Add log entry
   */
   addLog(context, level, message, stage) {
    const logEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
      stage,
    };

    context.logs.push(logEntry);

    // Emit real-time log event
    this.emit('log', {
      deploymentId: context.deploymentId,
      log: logEntry,
    });

    // Update database periodically (every 10 logs or on error)
    if (context.logs.length % 10 === 0 || level === 'error') {
      this.updateDeploymentLogs(context.deploymentId, context.logs);
    }
  }

  /**
   * Update deployment logs in database
   */
   async updateDeploymentLogs(deploymentId, logs) {
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { logs },
      });
    } catch (error) {
      console.error('Failed to update deployment logs:', error);
    }
  }

  /**
   * Complete pipeline execution
   */
   async completePipelineExecution(
    deploymentId,
    status,
    errorMessage
  ) {
    const context = this.runningPipelines.get(deploymentId);
    
    if (context) {
      // Add final log
      this.addLog(
        context,
        status === 'SUCCESS' ? 'info' : 'error',
        status === 'SUCCESS' ? 'Pipeline completed successfully' : `Pipeline failed: ${errorMessage}`
      );

      // Update database
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status,
          logs: context.logs,
          completedAt: new Date(),
        },
      });
    }

    // Emit completion event
    this.emit('complete', {
      deploymentId,
      status,
      errorMessage,
    });
  }

  /**
   * Stop pipeline execution
   */
   async stopPipelineExecution(deploymentId) {
    const context = this.runningPipelines.get(deploymentId);
    
    if (context) {
      // Mark as canceled
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'CANCELED',
          completedAt: new Date(),
        },
      });

      this.runningPipelines.delete(deploymentId);
    }
  }

  /**
   * Map database pipeline to domain model
   */
   mapPipelineFromDb(pipeline) {
    return {
      id: pipeline.id,
      repositoryId: pipeline.repositoryId,
      name: pipeline.name,
      stages: pipeline.stages,
      triggers: pipeline.triggers,
      environment: pipeline.environment,
      status: pipeline.status.toLowerCase(),
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }
}

export const pipelineService = new PipelineService();