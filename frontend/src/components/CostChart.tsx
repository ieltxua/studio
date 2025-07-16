import React from 'react';
import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import type { TimeSeriesData } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CostChartProps {
  data: TimeSeriesData[];
  title?: string;
  loading?: boolean;
}

export const CostChart: React.FC<CostChartProps> = ({ 
  data, 
  title = 'Cost Trend',
  loading = false 
}) => {
  const theme = useTheme();

  const chartData = {
    labels: data.map(d => format(new Date(d.timestamp), 'MMM dd')),
    datasets: [
      {
        label: 'Daily Cost',
        data: data.map(d => d.value),
        fill: true,
        borderColor: theme.palette.primary.main,
        backgroundColor: `${theme.palette.primary.main}20`,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: theme.palette.primary.main,
        pointBorderWidth: 2,
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
          label: (context: any) => `$${context.parsed.y.toFixed(2)}`,
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
          callback: (value: any) => `$${value}`,
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
          <Line data={chartData} options={options} />
        </Box>
      </CardContent>
    </Card>
  );
};