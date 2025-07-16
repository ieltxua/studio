// User and Authentication
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  organizations: OrganizationUser[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Organization
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  planType: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  maxProjects: number;
  maxAgents: number;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUser {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  organization: Organization;
  joinedAt: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  visibility: 'PRIVATE' | 'INTERNAL' | 'PUBLIC';
  budgetLimit?: number;
  tokenLimit?: number;
  currentSpent: number;
  currentTokens: number;
  createdAt: string;
  updatedAt: string;
  organization: Organization;
  _count?: {
    tasks: number;
    agents: number;
    users: number;
  };
}

// Agent
export interface Agent {
  id: string;
  name: string;
  type: 'GENERAL' | 'BACKEND' | 'FRONTEND' | 'DEVOPS' | 'TESTING' | 'REVIEW' | 'DOCUMENTATION';
  status: 'IDLE' | 'BUSY' | 'ERROR' | 'OFFLINE' | 'MAINTENANCE';
  capabilities: string[];
  model: string;
  maxTokens: number;
  temperature: number;
  tasksCompleted: number;
  successRate: number;
  avgDuration: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  project?: Project;
}

// Task
export interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'FEATURE' | 'BUG' | 'ENHANCEMENT' | 'REFACTOR' | 'DOCUMENTATION' | 'TESTING' | 'DEPLOYMENT' | 'RESEARCH';
  status: 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedDuration?: number;
  actualDuration?: number;
  progress: number;
  tokenUsage: number;
  cost: number;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  project: Project;
  assignee?: User;
  agent?: Agent;
}

// Dashboard Metrics
export interface DashboardMetrics {
  projects: {
    total: number;
    active: number;
    completed: number;
    paused: number;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  agents: {
    total: number;
    idle: number;
    busy: number;
    offline: number;
  };
  costs: {
    totalSpent: number;
    monthlySpent: number;
    dailyAverage: number;
    projectedMonthly: number;
  };
  tokens: {
    totalUsed: number;
    monthlyUsed: number;
    dailyAverage: number;
  };
  productivity: {
    tasksCompletedToday: number;
    tasksCompletedWeek: number;
    avgCompletionTime: number;
    automationRate: number;
  };
}

// Time Series Data
export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export interface CostBreakdown {
  date: string;
  projects: { [key: string]: number };
  total: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  tasksCompleted: number;
  successRate: number;
  avgDuration: number;
  totalCost: number;
}

// WebSocket Events
export interface WebSocketEvent {
  type: 'task_update' | 'agent_update' | 'project_update' | 'metric_update';
  data: any;
}