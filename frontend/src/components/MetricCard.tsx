import React from 'react';
import { Card, CardContent, Typography, Box, Skeleton, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon,
  loading = false,
  color = 'primary',
}) => {
  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return <TrendingUp fontSize="small" />;
    if (trend < 0) return <TrendingDown fontSize="small" />;
    return <TrendingFlat fontSize="small" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return 'default';
    if (trend > 0) return 'success';
    if (trend < 0) return 'error';
    return 'default';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={40} sx={{ my: 1 }} />
          <Skeleton variant="text" width="40%" height={20} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: `${color}.50`,
                color: `${color}.main`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
        
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {value}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1}>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          
          {trend !== undefined && (
            <Chip
              size="small"
              icon={getTrendIcon()}
              label={trendLabel || `${trend > 0 ? '+' : ''}${trend}%`}
              color={getTrendColor() as any}
              variant="outlined"
              sx={{ height: 24 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};