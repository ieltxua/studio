import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { apiRateLimit } from '@/middleware/rateLimiter';
import { 
  createOrganization, 
  getOrganizations, 
  getOrganization, 
  updateOrganization, 
  deleteOrganization,
  getOrganizationMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  getOrganizationStats
} from '@/controllers/organizations';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Create organization
router.post('/',
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Organization name must be 1-100 characters'),
    body('slug')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be a valid object')
  ],
  validate,
  createOrganization
);

// Get user's organizations
router.get('/', getOrganizations);

// Get current organization details
router.get('/current', getOrganization);

// Get organization stats
router.get('/current/stats',
  requirePermission('organization', 'READ'),
  getOrganizationStats
);

// Update organization
router.put('/current',
  requirePermission('organization', 'UPDATE'),
  [
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Organization name must be 1-100 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be a valid object')
  ],
  validate,
  updateOrganization
);

// Delete organization
router.delete('/current',
  requirePermission('organization', 'DELETE'),
  deleteOrganization
);

// Organization members management
router.get('/current/members',
  requirePermission('organization', 'READ'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term cannot exceed 100 characters'),
    query('role')
      .optional()
      .isIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role filter')
  ],
  validate,
  getOrganizationMembers
);

router.post('/current/members/invite',
  requirePermission('organization', 'UPDATE'),
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email address'),
    body('role')
      .isIn(['ADMIN', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Message cannot exceed 500 characters')
  ],
  validate,
  inviteMember
);

router.put('/current/members/:userId',
  requirePermission('organization', 'UPDATE'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('role')
      .isIn(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
      .withMessage('Invalid role')
  ],
  validate,
  updateMemberRole
);

router.delete('/current/members/:userId',
  requirePermission('organization', 'UPDATE'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID')
  ],
  validate,
  removeMember
);

export { router as organizationRoutes };