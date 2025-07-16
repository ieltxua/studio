import type { 
  DashboardMetrics, 
  TimeSeriesData, 
  CostBreakdown, 
  AgentPerformance,
  Project,
  Agent
} from '@/types';

// Generate time series data for the last N days
export const generateTimeSeriesData = (days: number, baseValue: number, variance: number): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const value = baseValue + (Math.random() - 0.5) * variance;
    data.push({
      timestamp: date.toISOString(),
      value: Math.max(0, value),
    });
  }
  
  return data;
};

export const mockDashboardMetrics: DashboardMetrics = {
  projects: {
    total: 12,
    active: 8,
    completed: 3,
    paused: 1,
  },
  tasks: {
    total: 156,
    pending: 42,
    inProgress: 28,
    completed: 81,
    blocked: 5,
  },
  agents: {
    total: 15,
    idle: 7,
    busy: 6,
    offline: 2,
  },
  costs: {
    totalSpent: 12847.65,
    monthlySpent: 3421.18,
    dailyAverage: 114.04,
    projectedMonthly: 3421.18,
  },
  tokens: {
    totalUsed: 8547239,
    monthlyUsed: 2156789,
    dailyAverage: 71893,
  },
  productivity: {
    tasksCompletedToday: 12,
    tasksCompletedWeek: 67,
    avgCompletionTime: 45,
    automationRate: 0.73,
  },
};

export const mockCostTrend = generateTimeSeriesData(30, 115, 30);
export const mockTokenUsage = generateTimeSeriesData(30, 72000, 15000);

export const mockCostBreakdown: CostBreakdown[] = [
  {
    date: new Date().toISOString(),
    projects: {
      'E-commerce Platform': 1234.56,
      'Mobile App': 876.43,
      'Analytics Dashboard': 654.32,
      'API Gateway': 432.10,
      'ML Pipeline': 223.77,
    },
    total: 3421.18,
  },
];

export const mockAgentPerformance: AgentPerformance[] = [
  {
    agentId: '1',
    agentName: 'Backend Developer AI',
    tasksCompleted: 45,
    successRate: 0.92,
    avgDuration: 38,
    totalCost: 567.89,
  },
  {
    agentId: '2',
    agentName: 'Frontend Developer AI',
    tasksCompleted: 38,
    successRate: 0.89,
    avgDuration: 42,
    totalCost: 432.10,
  },
  {
    agentId: '3',
    agentName: 'DevOps Engineer AI',
    tasksCompleted: 28,
    successRate: 0.95,
    avgDuration: 55,
    totalCost: 345.67,
  },
  {
    agentId: '4',
    agentName: 'QA Tester AI',
    tasksCompleted: 52,
    successRate: 0.87,
    avgDuration: 25,
    totalCost: 289.45,
  },
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'E-commerce Platform',
    description: 'Next-gen shopping experience with AI recommendations',
    status: 'ACTIVE',
    visibility: 'PRIVATE',
    budgetLimit: 5000,
    tokenLimit: 1000000,
    currentSpent: 1234.56,
    currentTokens: 234567,
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
    organization: {
      id: '1',
      name: 'Demo Organization',
      slug: 'demo-org',
      planType: 'ENTERPRISE',
      maxProjects: 50,
      maxAgents: 100,
      maxUsers: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    _count: {
      tasks: 42,
      agents: 5,
      users: 8,
    },
  },
  {
    id: '2',
    name: 'Mobile App',
    description: 'React Native app for iOS and Android',
    status: 'ACTIVE',
    visibility: 'INTERNAL',
    budgetLimit: 3000,
    tokenLimit: 750000,
    currentSpent: 876.43,
    currentTokens: 156789,
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString(),
    organization: {
      id: '1',
      name: 'Demo Organization',
      slug: 'demo-org',
      planType: 'ENTERPRISE',
      maxProjects: 50,
      maxAgents: 100,
      maxUsers: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    _count: {
      tasks: 28,
      agents: 3,
      users: 5,
    },
  },
  {
    id: '3',
    name: 'Analytics Dashboard',
    description: 'Real-time business intelligence platform',
    status: 'ACTIVE',
    visibility: 'PRIVATE',
    budgetLimit: 2500,
    tokenLimit: 500000,
    currentSpent: 654.32,
    currentTokens: 98765,
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date().toISOString(),
    organization: {
      id: '1',
      name: 'Demo Organization',
      slug: 'demo-org',
      planType: 'ENTERPRISE',
      maxProjects: 50,
      maxAgents: 100,
      maxUsers: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    _count: {
      tasks: 35,
      agents: 4,
      users: 6,
    },
  },
];

export const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Backend Developer AI',
    type: 'BACKEND',
    status: 'BUSY',
    capabilities: ['API Development', 'Database Design', 'Authentication'],
    model: 'claude-3-sonnet',
    maxTokens: 4000,
    temperature: 0.7,
    tasksCompleted: 45,
    successRate: 0.92,
    avgDuration: 38,
    totalCost: 567.89,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Frontend Developer AI',
    type: 'FRONTEND',
    status: 'IDLE',
    capabilities: ['React', 'UI/UX', 'CSS', 'TypeScript'],
    model: 'claude-3-sonnet',
    maxTokens: 4000,
    temperature: 0.7,
    tasksCompleted: 38,
    successRate: 0.89,
    avgDuration: 42,
    totalCost: 432.10,
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'DevOps Engineer AI',
    type: 'DEVOPS',
    status: 'BUSY',
    capabilities: ['CI/CD', 'Docker', 'Kubernetes', 'AWS'],
    model: 'claude-3-opus',
    maxTokens: 8000,
    temperature: 0.5,
    tasksCompleted: 28,
    successRate: 0.95,
    avgDuration: 55,
    totalCost: 345.67,
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'QA Tester AI',
    type: 'TESTING',
    status: 'IDLE',
    capabilities: ['Unit Testing', 'Integration Testing', 'E2E Testing'],
    model: 'claude-3-haiku',
    maxTokens: 2000,
    temperature: 0.3,
    tasksCompleted: 52,
    successRate: 0.87,
    avgDuration: 25,
    totalCost: 289.45,
    createdAt: new Date('2024-01-20').toISOString(),
    updatedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Documentation AI',
    type: 'DOCUMENTATION',
    status: 'OFFLINE',
    capabilities: ['Technical Writing', 'API Docs', 'User Guides'],
    model: 'claude-3-sonnet',
    maxTokens: 4000,
    temperature: 0.8,
    tasksCompleted: 23,
    successRate: 0.91,
    avgDuration: 30,
    totalCost: 187.23,
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString(),
  },
];