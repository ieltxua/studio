import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Box,
  LinearProgress,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  SmartToy,
  CheckCircle,
  Error,
  HourglassEmpty,
  OfflineBolt,
} from '@mui/icons-material';
import type { Agent } from '@/types';

interface AgentActivityTableProps {
  agents: Agent[];
  loading?: boolean;
}

const getStatusIcon = (status: Agent['status']) => {
  switch (status) {
    case 'IDLE':
      return <HourglassEmpty fontSize="small" />;
    case 'BUSY':
      return <SmartToy fontSize="small" />;
    case 'ERROR':
      return <Error fontSize="small" />;
    case 'OFFLINE':
      return <OfflineBolt fontSize="small" />;
    default:
      return null;
  }
};

const getStatusColor = (status: Agent['status']): 'default' | 'primary' | 'error' | 'warning' => {
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

export const AgentActivityTable: React.FC<AgentActivityTableProps> = ({ 
  agents, 
  loading = false 
}) => {
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Agent',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            <SmartToy fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {params.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.type}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          size="small"
          icon={getStatusIcon(params.value)}
          label={params.value}
          color={getStatusColor(params.value)}
          variant="outlined"
        />
      ),
    },
    {
      field: 'project',
      headerName: 'Project',
      width: 150,
      renderCell: (params) => params.value?.name || '-',
    },
    {
      field: 'tasksCompleted',
      headerName: 'Tasks',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'successRate',
      headerName: 'Success Rate',
      width: 120,
      renderCell: (params) => (
        <Box width="100%">
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">{(params.value * 100).toFixed(0)}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={params.value * 100}
            sx={{ 
              height: 4, 
              borderRadius: 2,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: params.value > 0.8 ? 'success.main' : 'warning.main',
              },
            }}
          />
        </Box>
      ),
    },
    {
      field: 'avgDuration',
      headerName: 'Avg Time',
      width: 100,
      renderCell: (params) => `${params.value}m`,
    },
    {
      field: 'totalCost',
      headerName: 'Total Cost',
      width: 100,
      renderCell: (params) => `$${params.value.toFixed(2)}`,
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Agent Activity
        </Typography>
        <Box height={400}>
          <DataGrid
            rows={agents}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'background.default',
                borderBottom: '2px solid',
                borderColor: 'divider',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '2px solid',
                borderColor: 'divider',
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};