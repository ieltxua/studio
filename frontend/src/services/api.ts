import axios from 'axios';
import type { 
  AuthResponse, 
  User, 
  Organization, 
  Project, 
  Agent, 
  Task, 
  DashboardMetrics,
  TimeSeriesData,
  CostBreakdown,
  AgentPerformance
} from '@/types';
import { 
  mockDashboardMetrics, 
  mockCostTrend, 
  mockTokenUsage, 
  mockCostBreakdown,
  generateTimeSeriesData,
  mockProjects,
  mockAgents
} from '@/utils/mockData';

const API_BASE_URL = '/api';
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  
  logout: () => api.post('/auth/logout'),
  
  me: () => api.get<User>('/auth/me'),
};

// Organizations API
export const organizationsApi = {
  list: () => api.get<Organization[]>('/organizations'),
  
  get: (id: string) => api.get<Organization>(`/organizations/${id}`),
  
  create: (data: Partial<Organization>) =>
    api.post<Organization>('/organizations', data),
  
  update: (id: string, data: Partial<Organization>) =>
    api.put<Organization>(`/organizations/${id}`, data),
};

// Projects API with mock data support
export const projectsApi = {
  list: async (organizationId?: string) => {
    if (USE_MOCK_DATA) {
      return { data: mockProjects };
    }
    return api.get<Project[]>('/projects', { params: { organizationId } });
  },
  
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  
  create: (data: Partial<Project>) =>
    api.post<Project>('/projects', data),
  
  update: (id: string, data: Partial<Project>) =>
    api.put<Project>(`/projects/${id}`, data),
  
  getMetrics: (id: string) =>
    api.get<DashboardMetrics>(`/projects/${id}/metrics`),
};

// Agents API with mock data support
export const agentsApi = {
  list: async (projectId?: string) => {
    if (USE_MOCK_DATA) {
      return { data: mockAgents };
    }
    return api.get<Agent[]>('/agents', { params: { projectId } });
  },
  
  get: (id: string) => api.get<Agent>(`/agents/${id}`),
  
  create: (data: Partial<Agent>) =>
    api.post<Agent>('/agents', data),
  
  update: (id: string, data: Partial<Agent>) =>
    api.put<Agent>(`/agents/${id}`, data),
  
  getPerformance: (organizationId: string) =>
    api.get<AgentPerformance[]>(`/agents/performance`, { params: { organizationId } }),
};

// Tasks API
export const tasksApi = {
  list: (projectId?: string, status?: string) =>
    api.get<Task[]>('/tasks', { params: { projectId, status } }),
  
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  
  create: (data: Partial<Task>) =>
    api.post<Task>('/tasks', data),
  
  update: (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data),
};

// Dashboard API with mock data support
export const dashboardApi = {
  getMetrics: async (organizationId: string) => {
    if (USE_MOCK_DATA) {
      return { data: mockDashboardMetrics };
    }
    return api.get<DashboardMetrics>(`/dashboard/metrics`, { params: { organizationId } });
  },
  
  getCostTrend: async (organizationId: string, days: number = 30) => {
    if (USE_MOCK_DATA) {
      return { data: generateTimeSeriesData(days, 115, 30) };
    }
    return api.get<TimeSeriesData[]>(`/dashboard/cost-trend`, { 
      params: { organizationId, days } 
    });
  },
  
  getTokenUsage: async (organizationId: string, days: number = 30) => {
    if (USE_MOCK_DATA) {
      return { data: generateTimeSeriesData(days, 72000, 15000) };
    }
    return api.get<TimeSeriesData[]>(`/dashboard/token-usage`, { 
      params: { organizationId, days } 
    });
  },
  
  getCostBreakdown: async (organizationId: string) => {
    if (USE_MOCK_DATA) {
      return { data: mockCostBreakdown };
    }
    return api.get<CostBreakdown[]>(`/dashboard/cost-breakdown`, { 
      params: { organizationId } 
    });
  },
  
  getTaskCompletionTrend: async (organizationId: string, days: number = 30) => {
    if (USE_MOCK_DATA) {
      return { data: generateTimeSeriesData(days, 12, 5) };
    }
    return api.get<TimeSeriesData[]>(`/dashboard/task-completion`, { 
      params: { organizationId, days } 
    });
  },
};

export default api;