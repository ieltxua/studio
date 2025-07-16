import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { dashboardApi, projectsApi, agentsApi, tasksApi } from '@/services/api';

export const useDashboardMetrics = () => {
  const { currentOrganization } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();

  const query = useQuery({
    queryKey: ['dashboard-metrics', currentOrganization?.id],
    queryFn: () => dashboardApi.getMetrics(currentOrganization!.id),
    enabled: !!currentOrganization,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    const handleMetricUpdate = (data: any) => {
      query.refetch();
    };

    subscribe('metric_update', handleMetricUpdate);
    return () => unsubscribe('metric_update', handleMetricUpdate);
  }, [subscribe, unsubscribe]);

  return query;
};

export const useCostTrend = (days: number = 30) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['cost-trend', currentOrganization?.id, days],
    queryFn: () => dashboardApi.getCostTrend(currentOrganization!.id, days),
    enabled: !!currentOrganization,
  });
};

export const useTokenUsage = (days: number = 30) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['token-usage', currentOrganization?.id, days],
    queryFn: () => dashboardApi.getTokenUsage(currentOrganization!.id, days),
    enabled: !!currentOrganization,
  });
};

export const useCostBreakdown = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['cost-breakdown', currentOrganization?.id],
    queryFn: () => dashboardApi.getCostBreakdown(currentOrganization!.id),
    enabled: !!currentOrganization,
  });
};

export const useProjects = () => {
  const { currentOrganization } = useAuth();
  const { subscribe, unsubscribe } = useWebSocket();

  const query = useQuery({
    queryKey: ['projects', currentOrganization?.id],
    queryFn: () => projectsApi.list(currentOrganization!.id),
    enabled: !!currentOrganization,
  });

  useEffect(() => {
    const handleProjectUpdate = (data: any) => {
      query.refetch();
    };

    subscribe('project_update', handleProjectUpdate);
    return () => unsubscribe('project_update', handleProjectUpdate);
  }, [subscribe, unsubscribe]);

  return query;
};

export const useAgents = (projectId?: string) => {
  const { subscribe, unsubscribe } = useWebSocket();

  const query = useQuery({
    queryKey: ['agents', projectId],
    queryFn: () => agentsApi.list(projectId),
  });

  useEffect(() => {
    const handleAgentUpdate = (data: any) => {
      query.refetch();
    };

    subscribe('agent_update', handleAgentUpdate);
    return () => unsubscribe('agent_update', handleAgentUpdate);
  }, [subscribe, unsubscribe]);

  return query;
};

export const useAgentPerformance = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['agent-performance', currentOrganization?.id],
    queryFn: () => agentsApi.getPerformance(currentOrganization!.id),
    enabled: !!currentOrganization,
  });
};

export const useTasks = (projectId?: string, status?: string) => {
  const { subscribe, unsubscribe } = useWebSocket();

  const query = useQuery({
    queryKey: ['tasks', projectId, status],
    queryFn: () => tasksApi.list(projectId, status),
  });

  useEffect(() => {
    const handleTaskUpdate = (data: any) => {
      query.refetch();
    };

    subscribe('task_update', handleTaskUpdate);
    return () => unsubscribe('task_update', handleTaskUpdate);
  }, [subscribe, unsubscribe]);

  return query;
};

export const useTaskCompletionTrend = (days: number = 30) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['task-completion', currentOrganization?.id, days],
    queryFn: () => dashboardApi.getTaskCompletionTrend(currentOrganization!.id, days),
    enabled: !!currentOrganization,
  });
};