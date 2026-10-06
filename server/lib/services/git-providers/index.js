
import { GitHubProvider } from './github.provider';
import { GitLabProvider } from './gitlab.provider';
import { BitbucketProvider } from './bitbucket.provider';

export class GitProviderFactory {
   static __initStatic() {this.providers = new Map()}

  static initialize() {
    // Initialize GitHub provider
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      const githubConfig = {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: `${process.env.BASE_URL}/api/devops/auth/github/callback`,
        scopes: ['repo', 'read:user', 'user:email'],
      };
      this.providers.set('github', new GitHubProvider(githubConfig));
    }

    // Initialize GitLab provider
    if (process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET) {
      const gitlabConfig = {
        clientId: process.env.GITLAB_CLIENT_ID,
        clientSecret: process.env.GITLAB_CLIENT_SECRET,
        redirectUri: `${process.env.BASE_URL}/api/devops/auth/gitlab/callback`,
        scopes: ['api', 'read_user', 'read_repository'],
      };
      this.providers.set('gitlab', new GitLabProvider(gitlabConfig));
    }

    // Initialize Bitbucket provider
    if (process.env.BITBUCKET_CLIENT_ID && process.env.BITBUCKET_CLIENT_SECRET) {
      const bitbucketConfig = {
        clientId: process.env.BITBUCKET_CLIENT_ID,
        clientSecret: process.env.BITBUCKET_CLIENT_SECRET,
        redirectUri: `${process.env.BASE_URL}/api/devops/auth/bitbucket/callback`,
        scopes: ['repositories', 'account'],
      };
      this.providers.set('bitbucket', new BitbucketProvider(bitbucketConfig));
    }
  }

  static getProvider(name) {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Git provider '${name}' is not configured or supported`);
    }
    return provider;
  }

  static getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  static isProviderAvailable(name) {
    return this.providers.has(name);
  }
} GitProviderFactory.__initStatic();

export * from './github.provider';
export * from './gitlab.provider';
export * from './bitbucket.provider';