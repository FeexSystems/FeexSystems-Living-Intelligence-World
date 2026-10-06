 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


export class BitbucketProvider  {
  __init() {this.name = 'bitbucket'}
  
   __init2() {this.baseUrl = 'https://api.bitbucket.org/2.0'}
   __init3() {this.authUrl = 'https://bitbucket.org/site/oauth2'}

  constructor(config) {;BitbucketProvider.prototype.__init.call(this);BitbucketProvider.prototype.__init2.call(this);BitbucketProvider.prototype.__init3.call(this);
    this.config = config;
  }

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code) {
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

  async refreshTokens(refreshToken) {
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

  async getUserRepositories(accessToken) {
    const repositories = [];
    let nextUrl = '/repositories?role=member&sort=-updated_on&pagelen=100';

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

  async getRepository(accessToken, repoId) {
    const response = await this.makeApiRequest(`/repositories/${repoId}`, accessToken);
    const repo = await response.json();
    
    return this.mapBitbucketRepoToRepositoryInfo(repo);
  }

  async createWebhook(accessToken, repoId, webhookUrl) {
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
      throw new Error(`Failed to create webhook: ${_optionalChain([error, 'access', _ => _.error, 'optionalAccess', _2 => _2.message]) || response.statusText}`);
    }

    const webhook = await response.json();
    return webhook.uuid;
  }

  async deleteWebhook(accessToken, repoId, webhookId) {
    const response = await this.makeApiRequest(
      `/repositories/${repoId}/hooks/${webhookId}`,
      accessToken,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete webhook: ${_optionalChain([error, 'access', _3 => _3.error, 'optionalAccess', _4 => _4.message]) || response.statusText}`);
    }
  }

  validateWebhookSignature(payload, signature, secret) {
    // Bitbucket doesn't use HMAC signatures by default
    // This would need to be implemented if using custom webhook secrets
    return true;
  }

   async makeApiRequest(
    endpoint,
    accessToken,
    options = {}
  ) {
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
      throw new Error(`Bitbucket API error: ${_optionalChain([error, 'access', _5 => _5.error, 'optionalAccess', _6 => _6.message]) || error.message || response.statusText}`);
    }

    return response;
  }

   mapBitbucketRepoToRepositoryInfo(repo) {
    return {
      id: repo.full_name,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.links.html.href,
      defaultBranch: _optionalChain([repo, 'access', _7 => _7.mainbranch, 'optionalAccess', _8 => _8.name]) || 'main',
      isPrivate: repo.is_private,
      language: repo.language,
      updatedAt: new Date(repo.updated_on),
    };
  }
}