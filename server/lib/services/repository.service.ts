import { PrismaClient } from '@prisma/client';
import { Repository, RepositoryInfo, WebhookPayload } from '../types/devops';
import { GitProviderFactory } from './git-providers/index';
import { encryptionService } from '../utils/encryption';

const prisma = new PrismaClient();

export class RepositoryService {
  /**
   * Get OAuth authorization URL for a git provider
   */
  async getAuthUrl(provider: string, userId: string): Promise<string> {
    if (!GitProviderFactory.isProviderAvailable(provider)) {
      throw new Error(`Git provider '${provider}' is not available`);
    }

    const gitProvider = GitProviderFactory.getProvider(provider);
    const state = this.generateState(userId, provider);
    
    return gitProvider.getAuthUrl(state);
  }

  /**
   * Handle OAuth callback and store repository access
   */
  async handleOAuthCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{ userId: string; repositories: RepositoryInfo[] }> {
    const { userId } = this.validateState(state, provider);
    
    const gitProvider = GitProviderFactory.getProvider(provider);
    const tokens = await gitProvider.exchangeCodeForTokens(code);
    
    // Get user repositories
    const repositories = await gitProvider.getUserRepositories(tokens.accessToken);
    
    // Store encrypted access token for future use
    const encryptedToken = encryptionService.encrypt(tokens.accessToken);
    
    // Store repository access in database
    for (const repo of repositories) {
      // Check if repository already exists
      const existingRepo = await prisma.repository.findFirst({
        where: {
          userId,
          provider: provider.toUpperCase() as any,
          repoUrl: repo.url,
        },
      });

      if (existingRepo) {
        // Update existing repository
        await prisma.repository.update({
          where: { id: existingRepo.id },
          data: {
            accessTokenEncrypted: encryptedToken,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new repository
        await prisma.repository.create({
          data: {
            userId,
            provider: provider.toUpperCase() as any,
            repoUrl: repo.url,
            branch: repo.defaultBranch,
            accessTokenEncrypted: encryptedToken,
          },
        });
      }
    }

    return { userId, repositories };
  }

  /**
   * Get user repositories from database
   */
  async getUserRepositories(userId: string): Promise<Repository[]> {
    const repositories = await prisma.repository.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return repositories.map(repo => ({
      id: repo.id,
      userId: repo.userId,
      provider: repo.provider.toLowerCase() as any,
      repoUrl: repo.repoUrl,
      branch: repo.branch,
      accessTokenEncrypted: repo.accessTokenEncrypted || undefined,
      webhookUrl: repo.webhookUrl || undefined,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    }));
  }

  /**
   * Get repository details from git provider
   */
  async getRepositoryDetails(repositoryId: string): Promise<RepositoryInfo> {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new Error('Repository not found');
    }

    if (!repository.accessTokenEncrypted) {
      throw new Error('Repository access token not available');
    }

    const gitProvider = GitProviderFactory.getProvider(repository.provider.toLowerCase());
    const accessToken = encryptionService.decrypt(repository.accessTokenEncrypted);
    
    // Extract repo ID from URL for API calls
    const repoId = this.extractRepoIdFromUrl(repository.repoUrl, repository.provider.toLowerCase());
    
    return await gitProvider.getRepository(accessToken, repoId);
  }

  /**
   * Create webhook for repository
   */
  async createWebhook(repositoryId: string): Promise<void> {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository) {
      throw new Error('Repository not found');
    }

    if (!repository.accessTokenEncrypted) {
      throw new Error('Repository access token not available');
    }

    const gitProvider = GitProviderFactory.getProvider(repository.provider.toLowerCase());
    const accessToken = encryptionService.decrypt(repository.accessTokenEncrypted);
    
    const repoId = this.extractRepoIdFromUrl(repository.repoUrl, repository.provider.toLowerCase());
    const webhookUrl = `${process.env.BASE_URL}/api/devops/webhooks/${repository.provider.toLowerCase()}`;
    
    const webhookId = await gitProvider.createWebhook(accessToken, repoId, webhookUrl);
    
    // Update repository with webhook URL
    await prisma.repository.update({
      where: { id: repositoryId },
      data: { webhookUrl: `${webhookUrl}/${webhookId}` },
    });
  }

  /**
   * Delete webhook for repository
   */
  async deleteWebhook(repositoryId: string): Promise<void> {
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
    });

    if (!repository || !repository.webhookUrl) {
      return; // Nothing to delete
    }

    if (!repository.accessTokenEncrypted) {
      throw new Error('Repository access token not available');
    }

    const gitProvider = GitProviderFactory.getProvider(repository.provider.toLowerCase());
    const accessToken = encryptionService.decrypt(repository.accessTokenEncrypted);
    
    const repoId = this.extractRepoIdFromUrl(repository.repoUrl, repository.provider.toLowerCase());
    const webhookId = this.extractWebhookIdFromUrl(repository.webhookUrl);
    
    await gitProvider.deleteWebhook(accessToken, repoId, webhookId);
    
    // Clear webhook URL from repository
    await prisma.repository.update({
      where: { id: repositoryId },
      data: { webhookUrl: null },
    });
  }

  /**
   * Handle incoming webhook payload
   */
  async handleWebhook(
    provider: string,
    payload: WebhookPayload,
    signature: string,
    rawPayload: string
  ): Promise<void> {
    // Find repository by URL
    const repository = await prisma.repository.findFirst({
      where: {
        provider: provider.toUpperCase() as any,
        repoUrl: payload.repository.url,
      },
    });

    if (!repository) {
      throw new Error('Repository not found for webhook');
    }

    // Validate webhook signature if available
    if (repository.webhookUrl) {
      const gitProvider = GitProviderFactory.getProvider(provider);
      const webhookSecret = this.extractWebhookSecret(repository.webhookUrl);
      
      if (webhookSecret && !gitProvider.validateWebhookSignature(rawPayload, signature, webhookSecret)) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Process webhook based on event type
    await this.processWebhookEvent(repository.id, payload);
  }

  /**
   * Remove repository access
   */
  async removeRepository(repositoryId: string): Promise<void> {
    // Delete webhook first
    await this.deleteWebhook(repositoryId);
    
    // Delete repository record
    await prisma.repository.delete({
      where: { id: repositoryId },
    });
  }

  private generateState(userId: string, provider: string): string {
    const data = JSON.stringify({ userId, provider, timestamp: Date.now() });
    return Buffer.from(data).toString('base64');
  }

  private validateState(state: string, provider: string): { userId: string } {
    try {
      const data = JSON.parse(Buffer.from(state, 'base64').toString());
      
      if (data.provider !== provider) {
        throw new Error('Invalid state provider');
      }
      
      // Check if state is not too old (5 minutes)
      if (Date.now() - data.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }
      
      return { userId: data.userId };
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
  }

  private extractRepoIdFromUrl(repoUrl: string, provider: string): string {
    try {
      const url = new URL(repoUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      switch (provider) {
        case 'github':
          // GitHub: https://github.com/owner/repo
          return `${pathParts[0]}/${pathParts[1]}`;
        case 'gitlab':
          // GitLab: https://gitlab.com/owner/repo or https://gitlab.com/group/subgroup/repo
          return pathParts.join('/');
        case 'bitbucket':
          // Bitbucket: https://bitbucket.org/owner/repo
          return `${pathParts[0]}/${pathParts[1]}`;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      throw new Error(`Invalid repository URL: ${repoUrl}`);
    }
  }

  private extractWebhookIdFromUrl(webhookUrl: string): string {
    const parts = webhookUrl.split('/');
    return parts[parts.length - 1];
  }

  private extractWebhookSecret(webhookUrl: string): string | null {
    // This would need to be implemented based on how webhook secrets are stored
    // For now, return null as not all providers use secrets
    return null;
  }

  private async processWebhookEvent(repositoryId: string, payload: WebhookPayload): Promise<void> {
    // Log the webhook event
    console.log(`Webhook event received for repository ${repositoryId}:`, {
      event: payload.event,
      repository: payload.repository.fullName,
      commit: payload.commit?.id,
      branch: payload.branch,
    });

    // Here you would implement logic to:
    // 1. Trigger pipeline builds
    // 2. Update deployment status
    // 3. Send notifications
    // 4. Log activity
    
    // For now, we'll just log the event
    // This will be expanded in the pipeline management task
  }
}

export const repositoryService = new RepositoryService();