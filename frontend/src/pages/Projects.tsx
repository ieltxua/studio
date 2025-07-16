import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
} from '@mui/material';
import { Add, MoreVert, FolderOpen } from '@mui/icons-material';
import { useProjects } from '@/hooks/useDashboardData';

const Projects: React.FC = () => {
  const { data: projects, isLoading } = useProjects();

  const getStatusColor = (status: string) => {
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ textTransform: 'none' }}
        >
          New Project
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Project Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Progress</TableCell>
                      <TableCell align="right">Tasks</TableCell>
                      <TableCell align="right">Agents</TableCell>
                      <TableCell align="right">Spent</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          Loading projects...
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects?.data.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <FolderOpen color="action" />
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {project.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {project.description}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={project.status}
                              color={getStatusColor(project.status) as any}
                            />
                          </TableCell>
                          <TableCell>
                            <Box width={100}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.floor(Math.random() * 80) + 20}
                                sx={{ height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {project._count?.tasks || 0}
                          </TableCell>
                          <TableCell align="right">
                            {project._count?.agents || 0}
                          </TableCell>
                          <TableCell align="right">
                            ${project.currentSpent.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small">
                              <MoreVert />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Projects;