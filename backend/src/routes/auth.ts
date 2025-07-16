import { Router } from 'express';
import { authController } from '@/controllers/authController';
import { authenticate } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rateLimiter';

const router = Router();

/**
 * Authentication Routes
 * Base path: /api/v1/auth
 */

// Public routes (no authentication required)
router.post('/register', rateLimiter('auth', 5, 15), authController.register);
router.post('/login', rateLimiter('auth', 10, 15), authController.login);

// Protected routes (authentication required)
router.get('/me', authenticate, authController.getProfile);
router.post('/change-password', authenticate, rateLimiter('auth', 3, 15), authController.changePassword);
router.post('/switch-organization', authenticate, authController.switchOrganization);
router.post('/logout', authenticate, authController.logout);

export default router;