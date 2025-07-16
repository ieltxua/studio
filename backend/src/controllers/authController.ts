import { Request, Response } from 'express';
import { authService, RegisterRequest, LoginRequest } from '@/services/authService';
import { logger } from '@/config/logger';
import Joi from 'joi';

/**
 * Validation schemas
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
  organizationName: Joi.string().max(100).optional(),
  organizationSlug: Joi.string().alphanum().min(2).max(50).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  organizationId: Joi.string().uuid().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const switchOrganizationSchema = Joi.object({
  organizationId: Joi.string().uuid().required()
});

class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message,
          details: error.details
        });
        return;
      }

      const registerData: RegisterRequest = value;

      // Validate organization data consistency
      if (registerData.organizationName && !registerData.organizationSlug) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Organization slug is required when organization name is provided'
        });
        return;
      }

      if (!registerData.organizationName && registerData.organizationSlug) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Organization name is required when organization slug is provided'
        });
        return;
      }

      // Register user
      const result = await authService.register(registerData);

      logger.info(`User registered: ${result.user.email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      logger.error('Registration error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('already taken')) {
          res.status(409).json({
            error: 'Conflict',
            message: error.message
          });
          return;
        }

        if (error.message.includes('Password validation failed')) {
          res.status(400).json({
            error: 'Validation error',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
      });
    }
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message,
          details: error.details
        });
        return;
      }

      const loginData: LoginRequest = value;

      // Attempt login
      const result = await authService.login(loginData);

      logger.info(`User logged in: ${result.user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Login error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          res.status(401).json({
            error: 'Authentication failed',
            message: 'Invalid email or password'
          });
          return;
        }

        if (error.message.includes('Multiple organizations found')) {
          res.status(400).json({
            error: 'Organization selection required',
            message: error.message
          });
          return;
        }

        if (error.message.includes('not a member of')) {
          res.status(403).json({
            error: 'Access denied',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not found in request'
        });
        return;
      }

      // Get user organizations
      const organizations = await authService.getUserOrganizations(req.user.userId);

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.userId,
            email: req.user.email,
            organizationId: req.user.organizationId,
            role: req.user.organizationRole,
            permissions: req.user.permissions
          },
          organizations: organizations.map(org => ({
            id: org.organization.id,
            name: org.organization.name,
            slug: org.organization.slug,
            role: org.role,
            joinedAt: org.joinedAt
          }))
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        error: 'Profile retrieval failed',
        message: 'An error occurred while retrieving profile'
      });
    }
  }

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not found in request'
        });
        return;
      }

      // Validate input
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message,
          details: error.details
        });
        return;
      }

      const { currentPassword, newPassword } = value;

      // Change password
      await authService.changePassword(req.user.userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);

      if (error instanceof Error) {
        if (error.message.includes('Current password is incorrect')) {
          res.status(400).json({
            error: 'Invalid password',
            message: error.message
          });
          return;
        }

        if (error.message.includes('Password validation failed')) {
          res.status(400).json({
            error: 'Validation error',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Password change failed',
        message: 'An error occurred while changing password'
      });
    }
  }

  /**
   * Switch organization context
   * POST /api/v1/auth/switch-organization
   */
  async switchOrganization(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not found in request'
        });
        return;
      }

      // Validate input
      const { error, value } = switchOrganizationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message,
          details: error.details
        });
        return;
      }

      const { organizationId } = value;

      // Switch organization
      const tokens = await authService.switchOrganization(req.user.userId, organizationId);

      res.json({
        success: true,
        message: 'Organization switched successfully',
        data: { tokens }
      });
    } catch (error) {
      logger.error('Switch organization error:', error);

      if (error instanceof Error) {
        if (error.message.includes('not a member of')) {
          res.status(403).json({
            error: 'Access denied',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Organization switch failed',
        message: 'An error occurred while switching organization'
      });
    }
  }

  /**
   * Logout user (placeholder - mainly client-side)
   * POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a full implementation, this would invalidate the refresh token
      // For now, just return success (logout is mainly client-side)
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout'
      });
    }
  }
}

export const authController = new AuthController();