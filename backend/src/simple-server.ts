import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 9917;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Studio Backend API is running'
  });
});

// Mock API endpoints for testing
app.get('/api/v1/projects', (req, res) => {
  res.json({
    success: true,
    data: {
      projects: [
        {
          id: '1',
          name: 'Studio Development',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          memberCount: 1,
          agentCount: 0,
          taskCount: 0
        }
      ]
    }
  });
});

app.get('/api/v1/agents', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: []
    }
  });
});

app.get('/api/v1/tasks', (req, res) => {
  res.json({
    success: true,
    data: {
      tasks: []
    }
  });
});

app.get('/api/v1/organizations/current/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        projects: { total: 1, active: 1 },
        agents: { total: 0, active: 0, idle: 0 },
        tasks: { total: 0, completedThisMonth: 0, completionRate: 0 },
        members: { total: 1 },
        usage: { totalTokens: 0, monthlyTokens: 0 }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Studio Backend API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export { app };