import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import type { TimeSeriesData } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TokenUsageChartProps {
  data: TimeSeriesData[];
  title?: string;
  loading?: boolean;
}

export const TokenUsageChart: React.FC<TokenUsageChartProps> = ({ 
  data, 
  title = 'Token Usage',
  loading = false 
}) => {
  const theme = useTheme();

  const chartData = {
    labels: data.map(d => format(new Date(d.timestamp), 'MMM dd')),
    datasets: [
      {
        label: 'Tokens Used',
        data: data.map(d => d.value),
        backgroundColor: theme.palette.secondary.main,
        borderColor: theme.palette.secondary.dark,
        borderWidth: 1,
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${context.parsed.y.toLocaleString()} tokens`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: theme.palette.text.secondary,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider,
          borderDash: [5, 5],
        },
        ticks: {
          font: {
            size: 12,
          },
          color: theme.palette.text.secondary,
          callback: (value: any) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            } else if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}K`;
            }
            return value;
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          {title}
        </Typography>
        <Box height={300}>
          <Bar data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};