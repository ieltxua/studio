/**
 * Database Models Export
 * 
 * Re-exports Prisma client and types for easy importing throughout the application
 */

export { PrismaClient } from '@prisma/client';
export type {
  User,
  Organization,
  OrganizationUser,
  Project,
  ProjectUser,
  Agent,
  Task,
  Milestone,
  AuditLog,
  Role,
  ProjectRole,
  ProjectStatus,
  AgentType,
  AgentStatus,
  TaskType,
  TaskStatus,
  Priority,
  MilestoneStatus,
  PlanType,
  Visibility,
} from '@prisma/client';

// Custom types for API responses
export interface UserWithOrganizations extends User {
  organizations: (OrganizationUser & {
    organization: Organization;
  })[];
}

export interface ProjectWithDetails extends Project {
  organization: Organization;
  users: (ProjectUser & {
    user: User;
  })[];
  agents: Agent[];
  tasks: Task[];
  milestones: Milestone[];
  _count: {
    tasks: number;
    agents: number;
    users: number;
  };
}

export interface TaskWithDetails extends Task {
  project: Project;
  assignee: User | null;
  agent: Agent | null;
  milestone: Milestone | null;
}

export interface AgentWithStats extends Agent {
  project: Project | null;
  organization: Organization;
  _count: {
    tasks: number;
  };
}

// API Request/Response types
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  visibility?: Visibility;
  githubRepoName?: string;
  githubOwner?: string;
  slackChannelId?: string;
  budgetLimit?: number;
  tokenLimit?: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: Priority;
  estimatedDuration?: number;
  assigneeId?: string;
  agentId?: string;
  milestoneId?: string;
  acceptanceCriteria?: string[];
  dependencies?: string[];
  dueDate?: Date;
}

export interface CreateAgentRequest {
  name: string;
  type: AgentType;
  capabilities: string[];
  configuration: Record<string, any>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  projectId?: string;
}

// Database query options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  status?: string[];
  type?: string[];
  priority?: string[];
  assigneeId?: string;
  agentId?: string;
  milestoneId?: string;
  search?: string;
}

// Statistics and analytics types
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  totalAgents: number;
  activeAgents: number;
  totalSpent: number;
  budgetUtilization: number;
  tokenUsage: number;
  tokenUtilization: number;
  averageTaskDuration: number;
  completionRate: number;
}

export interface AgentStats {
  tasksCompleted: number;
  successRate: number;
  averageDuration: number;
  totalCost: number;
  efficiency: number;
  lastActive: Date | null;
}

export interface OrganizationStats {
  totalProjects: number;
  activeProjects: number;
  totalUsers: number;
  totalAgents: number;
  totalTasks: number;
  monthlySpent: number;
  planUtilization: {
    projects: number;
    users: number;
    agents: number;
  };
}