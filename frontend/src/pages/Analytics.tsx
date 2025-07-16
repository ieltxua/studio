import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { CalendarMonth, TrendingUp, Speed, AttachMoney } from '@mui/icons-material';
import { CostChart } from '@/components/CostChart';
import { TokenUsageChart } from '@/components/TokenUsageChart';
import { CostBreakdownChart } from '@/components/CostBreakdownChart';
import { MetricCard } from '@/components/MetricCard';
import {
  useCostTrend,
  useTokenUsage,
  useCostBreakdown,
  useTaskCompletionTrend,
  useDashboardMetrics,
} from '@/hooks/useDashboardData';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState(30);
  const [view, setView] = useState('overview');

  const { data: metrics } = useDashboardMetrics();
  const { data: costTrend } = useCostTrend(timeRange);
  const { data: tokenUsage } = useTokenUsage(timeRange);
  const { data: costBreakdown } = useCostBreakdown();
  const { data: taskCompletion } = useTaskCompletionTrend(timeRange);

  const handleTimeRangeChange = (
    event: React.MouseEvent<HTMLElement>,
    newRange: number,
  ) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Analytics
      </Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
        >
          <ToggleButton value={7}>7D</ToggleButton>
          <ToggleButton value={30}>30D</ToggleButton>
          <ToggleButton value={90}>90D</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>View</InputLabel>
          <Select
            value={view}
            label="View"
            onChange={(e) => setView(e.target.value)}
          >
            <MenuItem value="overview">Overview</MenuItem>
            <MenuItem value="costs">Cost Analysis</MenuItem>
            <MenuItem value="performance">Performance</MenuItem>
            <MenuItem value="productivity">Productivity</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Daily Cost"
            value={`$${metrics?.data.costs.dailyAverage.toFixed(2) || '0.00'}`}
            subtitle={`Last ${timeRange} days`}
            icon={<AttachMoney />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Projected Monthly"
            value={`$${metrics?.data.costs.projectedMonthly.toFixed(2) || '0.00'}`}
            subtitle="Based on current usage"
            icon={<TrendingUp />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Completion Time"
            value={`${metrics?.data.productivity.avgCompletionTime || 0}m`}
            subtitle="Per task"
            icon={<Speed />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Tasks This Week"
            value={metrics?.data.productivity.tasksCompletedWeek || 0}
            subtitle={`${metrics?.data.productivity.tasksCompletedToday || 0} today`}
            icon={<CalendarMonth />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <CostChart
            data={costTrend?.data || []}
            title={`Cost Trend (${timeRange} Days)`}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TokenUsageChart
            data={tokenUsage?.data || []}
            title={`Token Usage (${timeRange} Days)`}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Task Completion Trend
              </Typography>
              <Box height={300} display="flex" alignItems="center" justifyContent="center">
                <Typography color="text.secondary">
                  Task completion chart would go here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <CostBreakdownChart
            data={costBreakdown?.data || []}
            title="Cost by Project"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;