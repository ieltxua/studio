import { db } from './database';
import { AgentType, AgentStatus, TaskType, Priority } from '@prisma/client';

export interface AgentConfiguration {
  agentType: AgentType;
  capabilities: string[];
  skillKeywords: string[];
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  maxConcurrentTasks: number;
  workspaceConfig: {
    preferredLanguages: string[];
    toolPreferences: string[];
    codeStyleGuide: string;
  };
}

export interface CreateAgentRequest {
  name: string;
  organizationId: string;
  projectId?: string;
  type: AgentType;
  configuration?: Partial<AgentConfiguration>;
}

export interface AgentAssignmentRule {
  issueKeywords: string[];
  filePatterns: string[];
  agentType: AgentType;
  priority: number;
}

export class AgentService {
  /**
   * Default agent configurations for each type
   */
  private static readonly DEFAULT_AGENT_CONFIGS: Record<AgentType, AgentConfiguration> = {
    [AgentType.GENERAL]: {
      agentType: AgentType.GENERAL,
      capabilities: ['general programming', 'debugging', 'code review'],
      skillKeywords: ['general', 'misc', 'help', 'question'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 4000,
      temperature: 0.7,
      maxConcurrentTasks: 2,
      workspaceConfig: {
        preferredLanguages: ['typescript', 'javascript', 'python'],
        toolPreferences: ['claude-code', 'git'],
        codeStyleGuide: 'standard'
      }
    },
    [AgentType.BACKEND]: {
      agentType: AgentType.BACKEND,
      capabilities: ['API development', 'database design', 'server architecture', 'authentication', 'middleware'],
      skillKeywords: ['api', 'backend', 'server', 'database', 'auth', 'endpoint', 'middleware', 'service'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 6000,
      temperature: 0.3,
      maxConcurrentTasks: 3,
      workspaceConfig: {
        preferredLanguages: ['typescript', 'javascript', 'python', 'go', 'java'],
        toolPreferences: ['claude-code', 'prisma', 'express', 'fastapi'],
        codeStyleGuide: 'backend-strict'
      }
    },
    [AgentType.FRONTEND]: {
      agentType: AgentType.FRONTEND,
      capabilities: ['React development', 'UI components', 'responsive design', 'state management', 'styling'],
      skillKeywords: ['frontend', 'ui', 'react', 'component', 'css', 'styling', 'responsive', 'interface'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 5000,
      temperature: 0.5,
      maxConcurrentTasks: 2,
      workspaceConfig: {
        preferredLanguages: ['typescript', 'javascript', 'tsx', 'jsx', 'css', 'scss'],
        toolPreferences: ['claude-code', 'react', 'vite', 'tailwind'],
        codeStyleGuide: 'prettier-react'
      }
    },
    [AgentType.DEVOPS]: {
      agentType: AgentType.DEVOPS,
      capabilities: ['CI/CD pipelines', 'Docker', 'deployment', 'infrastructure', 'monitoring'],
      skillKeywords: ['devops', 'deploy', 'ci', 'cd', 'docker', 'kubernetes', 'infrastructure', 'pipeline'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 5000,
      temperature: 0.2,
      maxConcurrentTasks: 1,
      workspaceConfig: {
        preferredLanguages: ['yaml', 'bash', 'dockerfile', 'terraform'],
        toolPreferences: ['claude-code', 'docker', 'kubernetes', 'github-actions'],
        codeStyleGuide: 'devops-standard'
      }
    },
    [AgentType.TESTING]: {
      agentType: AgentType.TESTING,
      capabilities: ['unit testing', 'integration testing', 'test automation', 'quality assurance'],
      skillKeywords: ['test', 'testing', 'qa', 'quality', 'coverage', 'spec', 'e2e', 'integration'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 4000,
      temperature: 0.3,
      maxConcurrentTasks: 2,
      workspaceConfig: {
        preferredLanguages: ['typescript', 'javascript', 'python'],
        toolPreferences: ['claude-code', 'jest', 'playwright', 'cypress'],
        codeStyleGuide: 'test-focused'
      }
    },
    [AgentType.REVIEW]: {
      agentType: AgentType.REVIEW,
      capabilities: ['code review', 'security analysis', 'performance optimization', 'best practices'],
      skillKeywords: ['review', 'security', 'performance', 'optimization', 'refactor', 'quality'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 6000,
      temperature: 0.2,
      maxConcurrentTasks: 3,
      workspaceConfig: {
        preferredLanguages: ['typescript', 'javascript', 'python', 'go', 'rust'],
        toolPreferences: ['claude-code', 'eslint', 'sonarjs'],
        codeStyleGuide: 'strict-review'
      }
    },
    [AgentType.DOCUMENTATION]: {
      agentType: AgentType.DOCUMENTATION,
      capabilities: ['documentation writing', 'API docs', 'README creation', 'technical writing'],
      skillKeywords: ['docs', 'documentation', 'readme', 'guide', 'tutorial', 'manual', 'help'],
      defaultModel: 'claude-3-sonnet',
      maxTokens: 8000,
      temperature: 0.6,
      maxConcurrentTasks: 2,
      workspaceConfig: {
        preferredLanguages: ['markdown', 'mdx', 'rst'],
        toolPreferences: ['claude-code', 'markdown', 'docusaurus'],
        codeStyleGuide: 'documentation-friendly'
      }
    }
  };

  /**
   * Agent assignment rules for automatic routing
   */
  private static readonly ASSIGNMENT_RULES: AgentAssignmentRule[] = [
    {
      issueKeywords: ['api', 'endpoint', 'server', 'backend', 'database', 'auth'],
      filePatterns: ['src/api/**', 'src/server/**', 'src/services/**', '**/*.service.ts', '**/api/**'],
      agentType: AgentType.BACKEND,
      priority: 10
    },
    {
      issueKeywords: ['component', 'ui', 'frontend', 'react', 'styling', 'css'],
      filePatterns: ['src/components/**', 'src/pages/**', '**/*.tsx', '**/*.jsx', '**/*.css', '**/*.scss'],
      agentType: AgentType.FRONTEND,
      priority: 10
    },
    {
      issueKeywords: ['deploy', 'ci', 'cd', 'docker', 'infrastructure', 'pipeline'],
      filePatterns: ['.github/**', 'Dockerfile', 'docker-compose*', 'k8s/**', '.ci/**'],
      agentType: AgentType.DEVOPS,
      priority: 10
    },
    {
      issueKeywords: ['test', 'testing', 'spec', 'coverage'],
      filePatterns: ['**/*.test.*', '**/*.spec.*', 'tests/**', '__tests__/**'],
      agentType: AgentType.TESTING,
      priority: 10
    },
    {
      issueKeywords: ['docs', 'documentation', 'readme', 'guide'],
      filePatterns: ['README*', 'docs/**', '**/*.md', '**/*.mdx'],
      agentType: AgentType.DOCUMENTATION,
      priority: 10
    },
    {
      issueKeywords: ['review', 'refactor', 'optimize', 'security'],
      filePatterns: [],
      agentType: AgentType.REVIEW,
      priority: 5
    }
  ];

  /**
   * Create a new agent
   */
  async createAgent(request: CreateAgentRequest) {
    const config = {
      ...AgentService.DEFAULT_AGENT_CONFIGS[request.type],
      ...request.configuration
    };

    return await db.prisma.agent.create({
      data: {
        name: request.name,
        type: request.type,
        status: AgentStatus.IDLE,
        organizationId: request.organizationId,
        projectId: request.projectId || null,
        capabilities: JSON.stringify(config.capabilities),
        configuration: JSON.stringify(config),
        model: config.defaultModel,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      }
    });
  }

  /**
   * Get all agents for an organization
   */
  async getAgentsByOrganization(organizationId: string) {
    return await db.prisma.agent.findMany({
      where: { organizationId },
      include: {
        tasks: {
          where: {
            status: {
              in: ['PENDING', 'IN_PROGRESS']
            }
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true
          }
        }
      }
    });
  }

  /**
   * Get available agents for assignment (not at max capacity)
   */
  async getAvailableAgents(organizationId: string, agentType?: AgentType) {
    const agents = await db.prisma.agent.findMany({
      where: {
        organizationId,
        status: {
          in: [AgentStatus.IDLE, AgentStatus.BUSY]
        },
        ...(agentType && { type: agentType })
      },
      include: {
        tasks: {
          where: {
            status: {
              in: ['PENDING', 'IN_PROGRESS']
            }
          }
        }
      }
    });

    // Filter agents that aren't at max capacity
    return agents.filter(agent => {
      const config = JSON.parse(agent.configuration as string) as AgentConfiguration;
      const activeTasks = agent.tasks.length;
      return activeTasks < config.maxConcurrentTasks;
    });
  }

  /**
   * Determine the best agent type for an issue/task
   */
  determineAgentType(issueTitle: string, issueBody: string, filePatterns: string[] = []): AgentType {
    const text = `${issueTitle} ${issueBody}`.toLowerCase();
    let bestMatch: { agentType: AgentType; score: number } = {
      agentType: AgentType.GENERAL,
      score: 0
    };

    for (const rule of AgentService.ASSIGNMENT_RULES) {
      let score = 0;

      // Check keyword matches
      for (const keyword of rule.issueKeywords) {
        if (text.includes(keyword)) {
          score += rule.priority;
        }
      }

      // Check file pattern matches
      for (const pattern of rule.filePatterns) {
        for (const filePath of filePatterns) {
          if (this.matchesPattern(filePath, pattern)) {
            score += rule.priority;
            break;
          }
        }
      }

      if (score > bestMatch.score) {
        bestMatch = { agentType: rule.agentType, score };
      }
    }

    return bestMatch.agentType;
  }

  /**
   * Assign the best available agent to a task
   */
  async assignBestAgent(
    organizationId: string, 
    taskId: string, 
    preferredAgentType?: AgentType
  ) {
    const availableAgents = await this.getAvailableAgents(organizationId, preferredAgentType);
    
    if (availableAgents.length === 0) {
      throw new Error(`No available agents of type ${preferredAgentType || 'any'}`);
    }

    // Sort by least busy, then by type preference
    const sortedAgents = availableAgents.sort((a, b) => {
      if (preferredAgentType) {
        if (a.type === preferredAgentType && b.type !== preferredAgentType) return -1;
        if (b.type === preferredAgentType && a.type !== preferredAgentType) return 1;
      }
      return a.tasks.length - b.tasks.length;
    });

    const selectedAgent = sortedAgents[0];

    // Assign the agent to the task
    await db.prisma.task.update({
      where: { id: taskId },
      data: { agentId: selectedAgent.id }
    });

    // Update agent status
    await db.prisma.agent.update({
      where: { id: selectedAgent.id },
      data: { 
        status: AgentStatus.BUSY,
        lastActive: new Date()
      }
    });

    return selectedAgent;
  }

  /**
   * Get agent performance statistics
   */
  async getAgentStats(agentId: string) {
    const agent = await db.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
            completedAt: true,
            startedAt: true
          }
        }
      }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const completedTasks = agent.tasks.filter(task => task.status === 'COMPLETED');
    const totalTasks = agent.tasks.length;
    const successRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

    const avgDuration = completedTasks.length > 0 
      ? completedTasks.reduce((sum, task) => {
          if (task.startedAt && task.completedAt) {
            return sum + (task.completedAt.getTime() - task.startedAt.getTime());
          }
          return sum;
        }, 0) / completedTasks.length
      : 0;

    return {
      agentId,
      totalTasks,
      completedTasks: completedTasks.length,
      successRate,
      avgDurationMinutes: Math.round(avgDuration / (1000 * 60)),
      currentTasks: agent.tasks.filter(task => 
        task.status === 'PENDING' || task.status === 'IN_PROGRESS'
      ).length
    };
  }

  /**
   * Update agent configuration
   */
  async updateAgentConfiguration(agentId: string, configuration: Partial<AgentConfiguration>) {
    const agent = await db.prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const currentConfig = JSON.parse(agent.configuration as string) as AgentConfiguration;
    const updatedConfig = { ...currentConfig, ...configuration };

    return await db.prisma.agent.update({
      where: { id: agentId },
      data: {
        configuration: JSON.stringify(updatedConfig),
        capabilities: JSON.stringify(updatedConfig.capabilities),
        model: updatedConfig.defaultModel,
        maxTokens: updatedConfig.maxTokens,
        temperature: updatedConfig.temperature,
      }
    });
  }

  /**
   * Simple pattern matching for file paths
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob-like pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }
}

export const agentService = new AgentService();