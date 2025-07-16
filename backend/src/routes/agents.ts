import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { apiRateLimit } from '@/middleware/rateLimiter';
import { 
  createAgent, 
  getAgents, 
  getAgent, 
  updateAgent, 
  deleteAgent,
  startAgent,
  stopAgent,
  getAgentLogs,
  getAgentMetrics
} from '@/controllers/agents';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Create agent
router.post('/',
  requirePermission('agent', 'CREATE'),
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Agent name must be 1-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('type')
      .isIn(['GITHUB_AUTOMATION', 'CODE_GENERATION', 'TESTING', 'MONITORING', 'CUSTOM'])
      .withMessage('Invalid agent type'),
    body('projectId')
      .isUUID()
      .withMessage('Invalid project ID'),
    body('configuration')
      .isObject()
      .withMessage('Configuration must be a valid object'),
    body('budgetLimit')
      .optional()
      .isNumeric()
      .withMessage('Budget limit must be a number'),
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean')
  ],
  validate,
  createAgent
);

// Get agents (with filters and pagination)
router.get('/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('projectId')
      .optional()
      .isUUID()
      .withMessage('Invalid project ID'),
    query('type')
      .optional()
      .isIn(['GITHUB_AUTOMATION', 'CODE_GENERATION', 'TESTING', 'MONITORING', 'CUSTOM'])
      .withMessage('Invalid agent type'),
    query('status')
      .optional()
      .isIn(['IDLE', 'RUNNING', 'ERROR', 'DISABLED'])
      .withMessage('Invalid status'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term cannot exceed 100 characters')
  ],
  validate,
  getAgents
);

// Get single agent
router.get('/:agentId',
  requirePermission('agent', 'READ'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID')
  ],
  validate,
  getAgent
);

// Update agent
router.put('/:agentId',
  requirePermission('agent', 'UPDATE'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Agent name must be 1-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('configuration')
      .optional()
      .isObject()
      .withMessage('Configuration must be a valid object'),
    body('budgetLimit')
      .optional()
      .isNumeric()
      .withMessage('Budget limit must be a number'),
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean')
  ],
  validate,
  updateAgent
);

// Delete agent
router.delete('/:agentId',
  requirePermission('agent', 'DELETE'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID')
  ],
  validate,
  deleteAgent
);

// Agent control operations
router.post('/:agentId/start',
  requirePermission('agent', 'UPDATE'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID')
  ],
  validate,
  startAgent
);

router.post('/:agentId/stop',
  requirePermission('agent', 'UPDATE'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID')
  ],
  validate,
  stopAgent
);

// Agent monitoring
router.get('/:agentId/logs',
  requirePermission('agent', 'READ'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('level')
      .optional()
      .isIn(['DEBUG', 'INFO', 'WARN', 'ERROR'])
      .withMessage('Invalid log level'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date')
  ],
  validate,
  getAgentLogs
);

router.get('/:agentId/metrics',
  requirePermission('agent', 'READ'),
  [
    param('agentId')
      .isUUID()
      .withMessage('Invalid agent ID'),
    query('period')
      .optional()
      .isIn(['1h', '24h', '7d', '30d'])
      .withMessage('Invalid period')
  ],
  validate,
  getAgentMetrics
);

export { router as agentRoutes };