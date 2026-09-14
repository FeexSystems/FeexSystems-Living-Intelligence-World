import { GitProvider, GitProviderConfig, OAuthTokens, RepositoryInfo } from '../../types/devops';
import { encryptionService } from '../../utils/encryption';

export class BitbucketProvider implements GitProvider {
  name = 'bitbucket';
  private config: GitProviderConfig;
  private baseUrl = 'https://api.bitbucket.org/2.0';
  private authUrl = 'https://bitbucket.org/site/oauth2';

  constructor(config: GitProviderConfig) {
    this.config = config;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.authUrl}/access_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bitbucket OAuth error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Bitbucket OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.authUrl}/access_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bitbucket token refresh error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Bitbucket token refresh error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async getUserRepositories(accessToken: string): Promise<RepositoryInfo[]> {
    const repositories: RepositoryInfo[] = [];
    let nextUrl: string | null = '/repositories?role=member&sort=-updated_on&pagelen=100';

    while (nextUrl) {
      const response = await this.makeApiRequest(nextUrl, accessToken);
      const data = await response.json();
      
      if (!data.values || !Array.isArray(data.values)) {
        break;
      }

      repositories.push(...data.values.map(this.mapBitbucketRepoToRepositoryInfo));
      
      nextUrl = data.next ? new URL(data.next).pathname + new URL(data.next).search : null;
    }

    return repositories;
  }

  async getRepository(accessToken: string, repoId: string): Promise<RepositoryInfo> {
    const response = await this.makeApiRequest(`/repositories/${repoId}`, accessToken);
    const repo = await response.json();
    
    return this.mapBitbucketRepoToRepositoryInfo(repo);
  }

  async createWebhook(accessToken: string, repoId: string, webhookUrl: string): Promise<string> {
    const response = await this.makeApiRequest(`/repositories/${repoId}/hooks`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        description: 'FeexSystems DevOps Webhook',
        url: webhookUrl,
        active: true,
        events: [
          'repo:push',
          'pullrequest:created',
          'pullrequest:updated',
          'pullrequest:approved',
          'pullrequest:merged',
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create webhook: ${error.error?.message || response.statusText}`);
    }

    const webhook = await response.json();
    return webhook.uuid;
  }

  async deleteWebhook(accessToken: string, repoId: string, webhookId: string): Promise<void> {
    const response = await this.makeApiRequest(
      `/repositories/${repoId}/hooks/${webhookId}`,
      accessToken,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete webhook: ${error.error?.message || response.statusText}`);
    }
  }

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Bitbucket doesn't use HMAC signatures by default
    // This would need to be implemented if using custom webhook secrets
    return true;
  }

  private async makeApiRequest(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'FeexSystems-DevOps/1.0',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Bitbucket API error: ${error.error?.message || error.message || response.statusText}`);
    }

    return response;
  }

  private mapBitbucketRepoToRepositoryInfo(repo: any): RepositoryInfo {
    return {
      id: repo.full_name,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.links.html.href,
      defaultBranch: repo.mainbranch?.name || 'main',
      isPrivate: repo.is_private,
      language: repo.language,
      updatedAt: new Date(repo.updated_on),
    };
  }
}