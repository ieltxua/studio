import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { apiRateLimit } from '@/middleware/rateLimiter';
import { 
  createProject, 
  getProjects, 
  getProject, 
  updateProject, 
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMember
} from '@/controllers/projects';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Create project
router.post('/',
  requirePermission('project', 'CREATE'),
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be 1-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('slug')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be a valid object'),
    body('budgetLimit')
      .optional()
      .isNumeric()
      .withMessage('Budget limit must be a number')
  ],
  validate,
  createProject
);

// Get projects (with filters and pagination)
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
    query('status')
      .optional()
      .isIn(['ACTIVE', 'ARCHIVED', 'DRAFT'])
      .withMessage('Invalid status'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term cannot exceed 100 characters')
  ],
  validate,
  getProjects
);

// Get single project
router.get('/:projectId',
  requirePermission('project', 'READ'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID')
  ],
  validate,
  getProject
);

// Update project
router.put('/:projectId',
  requirePermission('project', 'UPDATE'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be 1-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('status')
      .optional()
      .isIn(['ACTIVE', 'ARCHIVED', 'DRAFT'])
      .withMessage('Invalid status'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be a valid object'),
    body('budgetLimit')
      .optional()
      .isNumeric()
      .withMessage('Budget limit must be a number')
  ],
  validate,
  updateProject
);

// Delete project
router.delete('/:projectId',
  requirePermission('project', 'DELETE'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID')
  ],
  validate,
  deleteProject
);

// Project members management
router.get('/:projectId/members',
  requirePermission('project', 'READ'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID')
  ],
  validate,
  getProjectMembers
);

router.post('/:projectId/members',
  requirePermission('project', 'UPDATE'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID'),
    body('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('role')
      .isIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role')
  ],
  validate,
  addProjectMember
);

router.put('/:projectId/members/:userId',
  requirePermission('project', 'UPDATE'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID'),
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('role')
      .isIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role')
  ],
  validate,
  updateProjectMember
);

router.delete('/:projectId/members/:userId',
  requirePermission('project', 'UPDATE'),
  [
    param('projectId')
      .isUUID()
      .withMessage('Invalid project ID'),
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID')
  ],
  validate,
  removeProjectMember
);

export { router as projectRoutes };