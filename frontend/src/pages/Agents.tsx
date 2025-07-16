import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  LinearProgress,
} from '@mui/material';
import { Add, SmartToy } from '@mui/icons-material';
import { useAgents } from '@/hooks/useDashboardData';

const Agents: React.FC = () => {
  const { data: agents, isLoading } = useAgents();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE':
        return 'default';
      case 'BUSY':
        return 'primary';
      case 'ERROR':
        return 'error';
      case 'OFFLINE':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          AI Agents
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ textTransform: 'none' }}
        >
          Deploy Agent
        </Button>
      </Box>

      <Grid container spacing={3}>
        {isLoading ? (
          <Grid item xs={12}>
            <Typography>Loading agents...</Typography>
          </Grid>
        ) : (
          agents?.data.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <SmartToy />
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600}>
                        {agent.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {agent.type}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={agent.status}
                      color={getStatusColor(agent.status) as any}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Tasks Completed
                      </Typography>
                      <Typography variant="h6">
                        {agent.tasksCompleted}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Success Rate
                      </Typography>
                      <Typography variant="h6">
                        {(agent.successRate * 100).toFixed(0)}%
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      Performance
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={agent.successRate * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        mt: 0.5,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor:
                            agent.successRate > 0.8 ? 'success.main' : 'warning.main',
                        },
                      }}
                    />
                  </Box>

                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Model: {agent.model}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cost: ${agent.totalCost.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default Agents;