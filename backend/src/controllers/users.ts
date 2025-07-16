import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { AuditAction } from '@prisma/client';

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, organizationId } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        bio: true,
        timezone: true,
        preferences: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
      return;
    }

    // Get user's organizations
    const organizations = await prisma.organizationUser.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatar: true
          }
        }
      }
    });

    // Get user's projects in current organization
    const projects = await prisma.projectUser.findMany({
      where: {
        userId,
        project: {
          organizationId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        user,
        organizations: organizations.map(org => ({
          ...org.organization,
          role: org.role,
          joinedAt: org.createdAt
        })),
        projects: projects.map(proj => ({
          ...proj.project,
          role: proj.role,
          joinedAt: proj.createdAt
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user profile'
    });
  }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, organizationId } = req.user!;
    const updateData = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        bio: true,
        timezone: true,
        preferences: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: userId,
        userId,
        organizationId,
        details: {
          changes: updateData
        }
      }
    });

    logger.info('User profile updated successfully', {
      userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user profile'
    });
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Avatar upload would typically involve file upload middleware
    // and cloud storage service integration
    res.status(501).json({
      error: 'Not implemented',
      message: 'Avatar upload functionality not yet implemented'
    });
  } catch (error) {
    logger.error('Error uploading avatar:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to upload avatar'
    });
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.user!;
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause for organization users
    const where: any = {
      organizationId
    };

    if (role) {
      where.role = role;
    }

    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    const [organizationUsers, total] = await Promise.all([
      prisma.organizationUser.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              avatar: true,
              isActive: true,
              emailVerified: true,
              createdAt: true,
              lastLoginAt: true
            }
          }
        }
      }),
      prisma.organizationUser.count({ where })
    ]);

    const users = organizationUsers.map(orgUser => ({
      ...orgUser.user,
      organizationRole: orgUser.role,
      joinedAt: orgUser.createdAt
    }));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch users'
    });
  }
};

export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.user!;

    const organizationUser = await prisma.organizationUser.findFirst({
      where: {
        userId,
        organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            bio: true,
            timezone: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true
          }
        }
      }
    });

    if (!organizationUser) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found in organization'
      });
      return;
    }

    // Get user's projects in this organization
    const projects = await prisma.projectUser.findMany({
      where: {
        userId,
        project: {
          organizationId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    // Get user's recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        userId,
        organizationId
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        details: true
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          ...organizationUser.user,
          organizationRole: organizationUser.role,
          joinedAt: organizationUser.createdAt
        },
        projects: projects.map(proj => ({
          ...proj.project,
          role: proj.role,
          joinedAt: proj.createdAt
        })),
        recentActivity
      }
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user'
    });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const { organizationId, userId } = req.user!;
    const updateData = req.body;

    // Check if target user exists in organization
    const organizationUser = await prisma.organizationUser.findFirst({
      where: {
        userId: targetUserId,
        organizationId
      }
    });

    if (!organizationUser) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found in organization'
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        avatar: true,
        bio: true,
        timezone: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: targetUserId,
        userId,
        organizationId,
        details: {
          changes: updateData,
          targetUserId
        }
      }
    });

    logger.info('User updated successfully', {
      targetUserId,
      updatedBy: userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: {
        user: {
          ...updatedUser,
          organizationRole: organizationUser.role,
          joinedAt: organizationUser.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user'
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const { organizationId, userId } = req.user!;

    // Check if target user exists in organization
    const organizationUser = await prisma.organizationUser.findFirst({
      where: {
        userId: targetUserId,
        organizationId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!organizationUser) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found in organization'
      });
      return;
    }

    // Prevent deleting organization owners (business rule)
    if (organizationUser.role === 'OWNER') {
      res.status(400).json({
        error: 'Bad request',
        message: 'Cannot delete organization owner'
      });
      return;
    }

    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive: false,
        deactivatedAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'User',
        entityId: targetUserId,
        userId,
        organizationId,
        details: {
          targetUserId,
          userEmail: organizationUser.user.email
        }
      }
    });

    logger.info('User deactivated successfully', {
      targetUserId,
      deletedBy: userId,
      userEmail: organizationUser.user.email
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user'
    });
  }
};