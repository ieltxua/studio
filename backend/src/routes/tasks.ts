import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { apiRateLimit } from '@/middleware/rateLimiter';
import { 
  createTask, 
  getTasks, 
  getTask, 
  updateTask, 
  deleteTask,
  assignTask,
  completeTask,
  getTaskComments,
  addTaskComment
} from '@/controllers/tasks';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Create task
router.post('/',
  requirePermission('task', 'CREATE'),
  [
    body('title')
      .isLength({ min: 1, max: 200 })
      .withMessage('Task title must be 1-200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('priority')
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
    body('projectId')
      .isUUID()
      .withMessage('Invalid project ID'),
    body('agentId')
      .optional()
      .isUUID()
      .withMessage('Invalid agent ID'),
    body('assigneeId')
      .optional()
      .isUUID()
      .withMessage('Invalid assignee ID'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO date'),
    body('estimatedTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Estimated tokens must be a positive integer'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be a valid object')
  ],
  validate,
  createTask
);

// Get tasks (with filters and pagination)
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
    query('agentId')
      .optional()
      .isUUID()
      .withMessage('Invalid agent ID'),
    query('assigneeId')
      .optional()
      .isUUID()
      .withMessage('Invalid assignee ID'),
    query('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term cannot exceed 100 characters')
  ],
  validate,
  getTasks
);

// Get single task
router.get('/:taskId',
  requirePermission('task', 'READ'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID')
  ],
  validate,
  getTask
);

// Update task
router.put('/:taskId',
  requirePermission('task', 'UPDATE'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID'),
    body('title')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('Task title must be 1-200 characters'),
    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid priority'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid ISO date'),
    body('estimatedTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Estimated tokens must be a positive integer'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be a valid object')
  ],
  validate,
  updateTask
);

// Delete task
router.delete('/:taskId',
  requirePermission('task', 'DELETE'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID')
  ],
  validate,
  deleteTask
);

// Assign task
router.post('/:taskId/assign',
  requirePermission('task', 'UPDATE'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID'),
    body('assigneeId')
      .optional()
      .isUUID()
      .withMessage('Invalid assignee ID'),
    body('agentId')
      .optional()
      .isUUID()
      .withMessage('Invalid agent ID')
  ],
  validate,
  assignTask
);

// Complete task
router.post('/:taskId/complete',
  requirePermission('task', 'UPDATE'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID'),
    body('completionNotes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Completion notes cannot exceed 1000 characters'),
    body('actualTokens')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Actual tokens must be a positive integer')
  ],
  validate,
  completeTask
);

// Task comments
router.get('/:taskId/comments',
  requirePermission('task', 'READ'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validate,
  getTaskComments
);

router.post('/:taskId/comments',
  requirePermission('task', 'CREATE'),
  [
    param('taskId')
      .isUUID()
      .withMessage('Invalid task ID'),
    body('content')
      .isLength({ min: 1, max: 2000 })
      .withMessage('Comment content must be 1-2000 characters')
  ],
  validate,
  addTaskComment
);

export { router as taskRoutes };