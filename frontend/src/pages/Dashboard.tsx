import React from 'react';
import { Grid, Box, Typography, Skeleton } from '@mui/material';
import {
  AttachMoney,
  Token,
  FolderOpen,
  SmartToy,
  TaskAlt,
  TrendingUp,
} from '@mui/icons-material';
import { MetricCard } from '@/components/MetricCard';
import { CostChart } from '@/components/CostChart';
import { TokenUsageChart } from '@/components/TokenUsageChart';
import { AgentActivityTable } from '@/components/AgentActivityTable';
import { ProjectProgressList } from '@/components/ProjectProgressList';
import { CostBreakdownChart } from '@/components/CostBreakdownChart';
import {
  useDashboardMetrics,
  useCostTrend,
  useTokenUsage,
  useProjects,
  useAgents,
  useCostBreakdown,
} from '@/hooks/useDashboardData';

export const Dashboard: React.FC = () => {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: costTrend, isLoading: costTrendLoading } = useCostTrend(30);
  const { data: tokenUsage, isLoading: tokenUsageLoading } = useTokenUsage(30);
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: costBreakdown, isLoading: costBreakdownLoading } = useCostBreakdown();

  // Calculate trends (mock data for now)
  const costTrend30d = 12.5;
  const tokenTrend30d = 8.3;
  const automationRate = metrics?.data.productivity.automationRate || 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Executive Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Real-time insights into your AI-powered development operations
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard
            title="Total Spend"
            value={`$${metrics?.data.costs.totalSpent.toFixed(2) || '0.00'}`}
            subtitle="All time"
            trend={costTrend30d}
            trendLabel="vs last 30d"
            icon={<AttachMoney />}
            loading={metricsLoading}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard
            title="Monthly Cost"
            value={`$${metrics?.data.costs.monthlySpent.toFixed(2) || '0.00'}`}
            subtitle="Current month"
            trend={15.2}
            icon={<AttachMoney />}
            loading={metricsLoading}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard
            title="Tokens Used"
            value={
              metrics?.data.tokens.totalUsed
                ? `${(metrics.data.tokens.totalUsed / 1000000).toFixed(1)}M`
                : '0'
            }
            subtitle="All time"
            trend={tokenTrend30d}
            icon={<Token />}
            loading={metricsLoading}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard
            title="Active Projects"
            value={metrics?.data.projects.active || 0}
            subtitle={`${metrics?.data.projects.total || 0} total`}
            icon={<FolderOpen />}
            loading={metricsLoading}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard
            title="AI Agents"
            value={metrics?.data.agents.busy || 0}
            subtitle={`${metrics?.data.agents.total || 0} total`}
            icon={<SmartToy />}
            loading={metricsLoading}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <MetricCard
            title="Automation"
            value={`${(automationRate * 100).toFixed(0)}%`}
            subtitle="Task automation rate"
            trend={5.7}
            icon={<TrendingUp />}
            loading={metricsLoading}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <CostChart
            data={costTrend?.data || []}
            title="Cost Trend (30 Days)"
            loading={costTrendLoading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <CostBreakdownChart
            data={costBreakdown?.data || []}
            loading={costBreakdownLoading}
          />
        </Grid>
      </Grid>

      {/* Token Usage and Projects */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <TokenUsageChart
            data={tokenUsage?.data || []}
            title="Token Usage (30 Days)"
            loading={tokenUsageLoading}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProjectProgressList
            projects={projects?.data || []}
            loading={projectsLoading}
          />
        </Grid>
      </Grid>

      {/* Agent Activity */}
      <AgentActivityTable
        agents={agents?.data || []}
        loading={agentsLoading}
      />
    </Box>
  );
};