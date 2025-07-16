import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Box,
  Chip,
  IconButton,
  Skeleton,
} from '@mui/material';
import { ArrowForward, FolderOpen } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types';

interface ProjectProgressListProps {
  projects: Project[];
  loading?: boolean;
}

const getStatusColor = (status: Project['status']) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PAUSED':
      return 'warning';
    case 'COMPLETED':
      return 'info';
    case 'ARCHIVED':
      return 'default';
    default:
      return 'default';
  }
};

export const ProjectProgressList: React.FC<ProjectProgressListProps> = ({ 
  projects, 
  loading = false 
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Progress
          </Typography>
          <List>
            {[1, 2, 3].map((i) => (
              <ListItem key={i} divider>
                <ListItemText
                  primary={<Skeleton variant="text" width="60%" />}
                  secondary={<Skeleton variant="text" width="40%" />}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

  const calculateProgress = (project: Project) => {
    // This would normally come from task completion data
    // For now, we'll use a mock calculation
    if (project.status === 'COMPLETED') return 100;
    if (project.status === 'ARCHIVED') return 100;
    return Math.floor(Math.random() * 80) + 20;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            Project Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projects.length} active projects
          </Typography>
        </Box>
        
        <List disablePadding>
          {projects.slice(0, 5).map((project, index) => {
            const progress = calculateProgress(project);
            const isLastItem = index === projects.slice(0, 5).length - 1;
            
            return (
              <ListItem
                key={project.id}
                divider={!isLastItem}
                sx={{
                  py: 2,
                  px: 0,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    mx: -2,
                    px: 2,
                    borderRadius: 1,
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <ArrowForward fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <FolderOpen fontSize="small" color="action" />
                      <Typography variant="body1" fontWeight={500}>
                        {project.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={project.status}
                        color={getStatusColor(project.status) as any}
                        sx={{ height: 20 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {project._count?.tasks || 0} tasks • ${project.currentSpent.toFixed(2)} spent
                        </Typography>
                        <Typography variant="caption" fontWeight={500}>
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundColor: getStatusColor(project.status) === 'success' 
                              ? 'success.main' 
                              : 'primary.main',
                          },
                        }}
                      />
                    </Box>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};