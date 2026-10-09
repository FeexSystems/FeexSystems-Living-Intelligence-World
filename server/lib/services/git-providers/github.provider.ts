import { GitProvider, GitProviderConfig, OAuthTokens, RepositoryInfo } from '../../types/devops';
import { encryptionService } from '../../utils/encryption';

export class GitHubProvider implements GitProvider {
  name = 'github';
  private config: GitProviderConfig;
  private baseUrl = 'https://api.github.com';
  private authUrl = 'https://github.com/login/oauth';

  constructor(config: GitProviderConfig) {
    this.config = config;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      response_type: 'code'
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(`${this.authUrl}/access_token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async refreshTokens(_refreshToken: string): Promise<OAuthTokens> {
    // GitHub doesn't support refresh tokens in the traditional sense
    // Access tokens don't expire unless revoked
    throw new Error('GitHub access tokens do not expire and cannot be refreshed');
  }

  async getUserRepositories(accessToken: string): Promise<RepositoryInfo[]> {
    const repositories: RepositoryInfo[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.makeApiRequest(
        `/user/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`,
        accessToken
      );

      const repos = await response.json();
      
      if (!Array.isArray(repos) || repos.length === 0) {
        break;
      }

      repositories.push(...repos.map(this.mapGitHubRepoToRepositoryInfo));
      
      if (repos.length < perPage) {
        break;
      }
      
      page++;
    }

    return repositories;
  }

  async getRepository(accessToken: string, repoId: string): Promise<RepositoryInfo> {
    const response = await this.makeApiRequest(`/repos/${repoId}`, accessToken);
    const repo = await response.json();
    
    return this.mapGitHubRepoToRepositoryInfo(repo);
  }

  async createWebhook(accessToken: string, repoId: string, webhookUrl: string): Promise<string> {
    const secret = encryptionService.generateSecret();
    
    const response = await this.makeApiRequest(`/repos/${repoId}/hooks`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'release'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create webhook: ${error.message || response.statusText}`);
    }

    const webhook = await response.json();
    return webhook.id.toString();
  }

  async deleteWebhook(accessToken: string, repoId: string, webhookId: string): Promise<void> {
    const response = await this.makeApiRequest(
      `/repos/${repoId}/hooks/${webhookId}`,
      accessToken,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete webhook: ${error.message || response.statusText}`);
    }
  }

  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // GitHub sends signature as 'sha256=<hash>'
'sha256=' + encryptionService.createHmacSignature(payload, secret);
    return encryptionService.verifyHmacSignature(payload, signature.replace('sha256=', ''), secret);
  }

  private async makeApiRequest(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'FeexSystems-DevOps/1.0',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }

    return response;
  }

  private mapGitHubRepoToRepositoryInfo(repo: any): RepositoryInfo {
    return {
      id: repo.full_name,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      language: repo.language,
      updatedAt: new Date(repo.updated_at),
    };
  }
}