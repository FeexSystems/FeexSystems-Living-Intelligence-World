import { GitProvider, GitProviderConfig, OAuthTokens, RepositoryInfo } from '../../types/devops';
import { encryptionService } from '../../utils/encryption';

export class GitLabProvider implements GitProvider {
  name = 'gitlab';
  private config: GitProviderConfig;
  private baseUrl = 'https://gitlab.com/api/v4';
  private authUrl = 'https://gitlab.com/oauth';

  constructor(config: GitProviderConfig) {
    this.config = config;
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const response = await fetch(`${this.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitLab OAuth error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`GitLab OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'bearer',
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(`${this.authUrl}/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`GitLab token refresh error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`GitLab token refresh error: ${data.error_description || data.error}`);
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
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.makeApiRequest(
        `/projects?membership=true&page=${page}&per_page=${perPage}&order_by=last_activity_at&sort=desc`,
        accessToken
      );

      const projects = await response.json();
      
      if (!Array.isArray(projects) || projects.length === 0) {
        break;
      }

      repositories.push(...projects.map(this.mapGitLabProjectToRepositoryInfo));
      
      if (projects.length < perPage) {
        break;
      }
      
      page++;
    }

    return repositories;
  }

  async getRepository(accessToken: string, repoId: string): Promise<RepositoryInfo> {
    // GitLab uses project ID or path with namespace
    const encodedRepoId = encodeURIComponent(repoId);
    const response = await this.makeApiRequest(`/projects/${encodedRepoId}`, accessToken);
    const project = await response.json();
    
    return this.mapGitLabProjectToRepositoryInfo(project);
  }

  async createWebhook(accessToken: string, repoId: string, webhookUrl: string): Promise<string> {
    const secret = encryptionService.generateSecret();
    const encodedRepoId = encodeURIComponent(repoId);
    
    const response = await this.makeApiRequest(`/projects/${encodedRepoId}/hooks`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        push_events: true,
        merge_requests_events: true,
        releases_events: true,
        token: secret,
        enable_ssl_verification: true,
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
    const encodedRepoId = encodeURIComponent(repoId);
    const response = await this.makeApiRequest(
      `/projects/${encodedRepoId}/hooks/${webhookId}`,
      accessToken,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete webhook: ${error.message || response.statusText}`);
    }
  }

  validateWebhookSignature(_payload: string, signature: string, secret: string): boolean {
    // GitLab sends the token in the X-Gitlab-Token header
    return signature === secret;
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
        'Accept': 'application/json',
        'User-Agent': 'FeexSystems-DevOps/1.0',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`GitLab API error: ${error.message || response.statusText}`);
    }

    return response;
  }

  private mapGitLabProjectToRepositoryInfo(project: any): RepositoryInfo {
    return {
      id: project.path_with_namespace,
      name: project.name,
      fullName: project.path_with_namespace,
      description: project.description,
      url: project.web_url,
      defaultBranch: project.default_branch,
      isPrivate: project.visibility === 'private',
      language: project.languages ? Object.keys(project.languages)[0] : undefined,
      updatedAt: new Date(project.last_activity_at),
    };
  }
}