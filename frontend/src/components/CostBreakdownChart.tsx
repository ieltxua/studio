import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { CostBreakdown } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CostBreakdownChartProps {
  data: CostBreakdown[];
  title?: string;
  loading?: boolean;
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({ 
  data, 
  title = 'Cost Breakdown by Project',
  loading = false 
}) => {
  const theme = useTheme();

  // Aggregate costs by project
  const projectCosts = data.reduce((acc, item) => {
    Object.entries(item.projects).forEach(([projectName, cost]) => {
      acc[projectName] = (acc[projectName] || 0) + cost;
    });
    return acc;
  }, {} as { [key: string]: number });

  const sortedProjects = Object.entries(projectCosts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5); // Top 5 projects

  const chartData = {
    labels: sortedProjects.map(([name]) => name),
    datasets: [
      {
        data: sortedProjects.map(([, cost]) => cost),
        backgroundColor: [
          theme.palette.primary.main,
          theme.palette.secondary.main,
          theme.palette.success.main,
          theme.palette.warning.main,
          theme.palette.info.main,
        ],
        borderColor: theme.palette.background.paper,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          generateLabels: (chart: any) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Box height={300} display="flex" alignItems="center" justifyContent="center">
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const totalCost = sortedProjects.reduce((sum, [, cost]) => sum + cost, 0);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          {title}
        </Typography>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="body2" color="text.secondary">
            Total: ${totalCost.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Top {sortedProjects.length} projects shown
          </Typography>
        </Box>
        <Box height={250}>
          <Doughnut data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};