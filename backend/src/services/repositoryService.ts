import { db } from './database';
import { Octokit } from '@octokit/rest';

export interface RepositoryInfo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description?: string | undefined;
  private: boolean;
  defaultBranch: string;
  language?: string | undefined;
  topics: string[];
  createdAt: Date;
  updatedAt: Date;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
}

export interface ConnectRepositoryRequest {
  projectId: string;
  repoOwner: string;
  repoName: string;
  setupWebhooks?: boolean;
}

export class RepositoryService {
  private github: Octokit;

  constructor(githubToken: string) {
    this.github = new Octokit({
      auth: githubToken,
    });
  }

  /**
   * Connect a GitHub repository to a Studio project
   */
  async connectRepository(request: ConnectRepositoryRequest): Promise<RepositoryInfo> {
    const { projectId, repoOwner, repoName, setupWebhooks = true } = request;

    try {
      // Get repository information from GitHub
      const { data: repo } = await this.github.rest.repos.get({
        owner: repoOwner,
        repo: repoName,
      });

      // Update project with GitHub repository information
      const updatedProject = await db.prisma.project.update({
        where: { id: projectId },
        data: {
          githubRepoId: repo.id.toString(),
          githubRepoName: repo.name,
          githubOwner: repo.owner.login,
          settings: {
            ...{}, // existing settings
            repository: {
              id: repo.id,
              fullName: repo.full_name,
              defaultBranch: repo.default_branch,
              private: repo.private,
              language: repo.language,
              topics: repo.topics || [],
              htmlUrl: repo.html_url,
              cloneUrl: repo.clone_url,
              sshUrl: repo.ssh_url,
            }
          }
        },
      });

      // Set up webhooks if requested
      if (setupWebhooks) {
        await this.setupWebhooks(repo.owner.login, repo.name);
      }

      return {
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description || undefined,
        private: repo.private,
        defaultBranch: repo.default_branch,
        language: repo.language || undefined,
        topics: repo.topics || [],
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at),
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
      };
    } catch (error) {
      console.error('Error connecting repository:', error);
      throw new Error(`Failed to connect repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all repositories connected to projects
   */
  async getConnectedRepositories(): Promise<RepositoryInfo[]> {
    try {
      const projects = await db.prisma.project.findMany({
        where: {
          githubRepoId: {
            not: null,
          },
        },
        select: {
          id: true,
          githubRepoId: true,
          githubRepoName: true,
          githubOwner: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const repositories: RepositoryInfo[] = [];

      for (const project of projects) {
        if (project.githubRepoId && project.githubRepoName && project.githubOwner) {
          try {
            // Get fresh data from GitHub
            const { data: repo } = await this.github.rest.repos.get({
              owner: project.githubOwner,
              repo: project.githubRepoName,
            });

            repositories.push({
              id: repo.id.toString(),
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              description: repo.description || undefined,
              private: repo.private,
              defaultBranch: repo.default_branch,
              language: repo.language || undefined,
              topics: repo.topics || [],
              createdAt: new Date(repo.created_at),
              updatedAt: new Date(repo.updated_at),
              htmlUrl: repo.html_url,
              cloneUrl: repo.clone_url,
              sshUrl: repo.ssh_url,
            });
          } catch (error) {
            console.warn(`Failed to fetch repository ${project.githubOwner}/${project.githubRepoName}:`, error);
          }
        }
      }

      return repositories;
    } catch (error) {
      console.error('Error getting connected repositories:', error);
      throw new Error(`Failed to get repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get repository information by project ID
   */
  async getRepositoryByProject(projectId: string): Promise<RepositoryInfo | null> {
    try {
      const project = await db.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          githubRepoId: true,
          githubRepoName: true,
          githubOwner: true,
          settings: true,
        },
      });

      if (!project?.githubRepoId || !project.githubRepoName || !project.githubOwner) {
        return null;
      }

      const { data: repo } = await this.github.rest.repos.get({
        owner: project.githubOwner,
        repo: project.githubRepoName,
      });

      return {
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description || undefined,
        private: repo.private,
        defaultBranch: repo.default_branch,
        language: repo.language || undefined,
        topics: repo.topics || [],
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at),
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
      };
    } catch (error) {
      console.error('Error getting repository by project:', error);
      return null;
    }
  }

  /**
   * Search repositories accessible to the user
   */
  async searchRepositories(query: string, limit: number = 10): Promise<RepositoryInfo[]> {
    try {
      const { data } = await this.github.rest.search.repos({
        q: `${query} user:@me`,
        sort: 'updated',
        order: 'desc',
        per_page: limit,
      });

      return data.items.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        description: repo.description || undefined,
        private: repo.private,
        defaultBranch: repo.default_branch,
        language: repo.language || undefined,
        topics: repo.topics || [],
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at),
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
      }));
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw new Error(`Failed to search repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect a repository from a project
   */
  async disconnectRepository(projectId: string): Promise<void> {
    try {
      await db.prisma.project.update({
        where: { id: projectId },
        data: {
          githubRepoId: null,
          githubRepoName: null,
          githubOwner: null,
          settings: {
            ...{}, // existing settings
            repository: null,
          }
        },
      });
    } catch (error) {
      console.error('Error disconnecting repository:', error);
      throw new Error(`Failed to disconnect repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up GitHub webhooks for a repository
   */
  private async setupWebhooks(owner: string, repo: string): Promise<void> {
    try {
      const webhookUrl = `${process.env['STUDIO_API_URL'] || 'http://localhost:9917'}/webhooks/github`;
      const webhookSecret = process.env['GITHUB_WEBHOOK_SECRET'];

      // Check if webhook already exists
      const { data: hooks } = await this.github.rest.repos.listWebhooks({
        owner,
        repo,
      });

      const existingHook = hooks.find((hook: any) => 
        hook.config?.url === webhookUrl
      );

      if (existingHook) {
        console.log(`Webhook already exists for ${owner}/${repo}`);
        return;
      }

      // Create new webhook
      const config: any = {
        url: webhookUrl,
        content_type: 'json',
        insecure_ssl: '0',
      };
      
      if (webhookSecret) {
        config.secret = webhookSecret;
      }

      await this.github.rest.repos.createWebhook({
        owner,
        repo,
        name: 'web',
        config,
        events: ['issues', 'pull_request', 'push', 'workflow_run'],
        active: true,
      });

      console.log(`✅ Webhook created for ${owner}/${repo}`);
    } catch (error) {
      console.error(`Failed to setup webhooks for ${owner}/${repo}:`, error);
      // Don't throw here - webhook setup failure shouldn't prevent repository connection
    }
  }
}