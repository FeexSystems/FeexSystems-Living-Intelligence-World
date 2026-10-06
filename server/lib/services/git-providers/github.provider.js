
import { encryptionService } from '../../utils/encryption';

export class GitHubProvider  {
  __init() {this.name = 'github'}
  
   __init2() {this.baseUrl = 'https://api.github.com'}
   __init3() {this.authUrl = 'https://github.com/login/oauth'}

  constructor(config) {;GitHubProvider.prototype.__init.call(this);GitHubProvider.prototype.__init2.call(this);GitHubProvider.prototype.__init3.call(this);
    this.config = config;
  }

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      response_type: 'code'
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
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

  async refreshTokens(refreshToken) {
    // GitHub doesn't support refresh tokens in the traditional sense
    // Access tokens don't expire unless revoked
    throw new Error('GitHub access tokens do not expire and cannot be refreshed');
  }

  async getUserRepositories(accessToken) {
    const repositories = [];
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

  async getRepository(accessToken, repoId) {
    const response = await this.makeApiRequest(`/repos/${repoId}`, accessToken);
    const repo = await response.json();
    
    return this.mapGitHubRepoToRepositoryInfo(repo);
  }

  async createWebhook(accessToken, repoId, webhookUrl) {
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

  async deleteWebhook(accessToken, repoId, webhookId) {
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

  validateWebhookSignature(payload, signature, secret) {
    // GitHub sends signature as 'sha256=<hash>'
    const expectedSignature = 'sha256=' + encryptionService.createHmacSignature(payload, secret);
    return encryptionService.verifyHmacSignature(payload, signature.replace('sha256=', ''), secret);
  }

   async makeApiRequest(
    endpoint,
    accessToken,
    options = {}
  ) {
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

   mapGitHubRepoToRepositoryInfo(repo) {
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