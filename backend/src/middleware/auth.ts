import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '@/utils/jwt';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { Role, ProjectRole } from '@/models';

// Extend Express Request type to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & {
        organizationRole?: Role;
        projectRole?: ProjectRole;
        permissions?: string[];
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
      return;
    }

    // Verify the token
    const payload = verifyToken(token);

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'User not found'
      });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Attach user data to request
    req.user = {
      ...payload,
      organizationRole: payload.role,
      permissions: payload.permissions || []
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({
          error: 'Token expired',
          message: 'Please refresh your token'
        });
        return;
      } else if (error.message === 'Invalid token') {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Token is malformed or invalid'
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Authentication error',
      message: 'Failed to authenticate request'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return next();
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      ...payload,
      organizationRole: payload.role,
      permissions: payload.permissions || []
    };
  } catch (error) {
    // Ignore authentication errors for optional auth
    logger.debug('Optional auth failed:', error);
  }

  next();
};

/**
 * Role-based authorization middleware
 */
export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
      return;
    }

    const userRole = req.user.organizationRole;
    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Requires one of: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated to access this resource'
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission) && !userPermissions.includes('all')) {
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Requires permission: ${permission}`
      });
      return;
    }

    next();
  };
};

/**
 * Organization membership middleware
 */
export const requireOrganizationMember = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.organizationId) {
    res.status(403).json({
      error: 'Organization access required',
      message: 'Must be a member of an organization'
    });
    return;
  }

  next();
};

/**
 * Project access middleware
 */
export const requireProjectAccess = (projectIdParam = 'projectId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'Must be authenticated to access project'
        });
        return;
      }

      const projectId = req.params[projectIdParam];
      if (!projectId) {
        res.status(400).json({
          error: 'Project ID required',
          message: 'Project ID must be provided'
        });
        return;
      }

      // Check if user has access to the project
      const projectUser = await prisma.projectUser.findFirst({
        where: {
          projectId,
          userId: req.user.userId
        },
        include: {
          project: {
            include: {
              organization: true
            }
          }
        }
      });

      if (!projectUser) {
        res.status(403).json({
          error: 'Project access denied',
          message: 'You do not have access to this project'
        });
        return;
      }

      // Add project role to request
      req.user.projectRole = projectUser.role;

      next();
    } catch (error) {
      logger.error('Project access check error:', error);
      res.status(500).json({
        error: 'Authorization error',
        message: 'Failed to verify project access'
      });
    }
  };
};

/**
 * Owner-only middleware (organization or project level)
 */
export const requireOwner = (level: 'organization' | 'project' = 'organization') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Must be authenticated'
      });
      return;
    }

    const role = level === 'organization' ? req.user.organizationRole : req.user.projectRole;
    
    if (role !== 'OWNER') {
      res.status(403).json({
        error: 'Owner access required',
        message: `Must be ${level} owner to perform this action`
      });
      return;
    }

    next();
  };
};