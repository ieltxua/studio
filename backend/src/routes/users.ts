import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, requirePermission } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { apiRateLimit } from '@/middleware/rateLimiter';
import { 
  getUsers, 
  getUser, 
  updateUser, 
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  deleteUser
} from '@/controllers/users';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Get current user profile
router.get('/me', getUserProfile);

// Update current user profile
router.put('/me',
  [
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('timezone')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Timezone cannot exceed 50 characters'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be a valid object')
  ],
  validate,
  updateUserProfile
);

// Upload avatar
router.post('/me/avatar', uploadAvatar);

// Get users (admin only)
router.get('/',
  requirePermission('user', 'READ'),
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
  getUsers
);

// Get specific user (admin only)
router.get('/:userId',
  requirePermission('user', 'READ'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID')
  ],
  validate,
  getUser
);

// Update user (admin only)
router.put('/:userId',
  requirePermission('user', 'UPDATE'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    body('firstName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('emailVerified')
      .optional()
      .isISO8601()
      .withMessage('emailVerified must be a valid date')
  ],
  validate,
  updateUser
);

// Delete user (admin only)
router.delete('/:userId',
  requirePermission('user', 'DELETE'),
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID')
  ],
  validate,
  deleteUser
);

export { router as userRoutes };