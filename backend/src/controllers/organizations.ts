import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { AuditAction } from '@prisma/client';

export const createOrganization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, description, settings } = req.body;
    const { userId } = req.user!;

    // Check if slug is unique
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Organization slug already exists'
      });
      return;
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description,
        settings: settings || {},
        createdById: userId
      }
    });

    // Add creator as organization owner
    await prisma.organizationUser.create({
      data: {
        organizationId: organization.id,
        userId,
        role: 'OWNER'
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Organization',
        entityId: organization.id,
        userId,
        organizationId: organization.id,
        details: {
          organizationName: name,
          slug
        }
      }
    });

    logger.info('Organization created successfully', {
      organizationId: organization.id,
      organizationName: name,
      userId
    });

    res.status(201).json({
      success: true,
      data: {
        organization
      }
    });
  } catch (error) {
    logger.error('Error creating organization:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create organization'
    });
  }
};

export const getOrganizations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;

    const organizationUsers = await prisma.organizationUser.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                users: true,
                projects: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const organizations = organizationUsers.map(orgUser => ({
      ...orgUser.organization,
      role: orgUser.role,
      joinedAt: orgUser.createdAt,
      memberCount: orgUser.organization._count.users,
      projectCount: orgUser.organization._count.projects
    }));

    res.json({
      success: true,
      data: {
        organizations
      }
    });
  } catch (error) {
    logger.error('Error fetching organizations:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch organizations'
    });
  }
};

export const getOrganization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;

    const organizationUser = await prisma.organizationUser.findFirst({
      where: {
        organizationId,
        userId
      },
      include: {
        organization: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            _count: {
              select: {
                users: true,
                projects: true,
                agents: true
              }
            }
          }
        }
      }
    });

    if (!organizationUser) {
      res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
      return;
    }

    // Get recent projects
    const recentProjects = await prisma.project.findMany({
      where: {
        organizationId,
        OR: [
          { createdById: userId },
          {
            projectUsers: {
              some: {
                userId
              }
            }
          }
        ]
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        updatedAt: true
      }
    });

    const organization = {
      ...organizationUser.organization,
      role: organizationUser.role,
      joinedAt: organizationUser.createdAt,
      memberCount: organizationUser.organization._count.users,
      projectCount: organizationUser.organization._count.projects,
      agentCount: organizationUser.organization._count.agents,
      recentProjects
    };

    res.json({
      success: true,
      data: {
        organization
      }
    });
  } catch (error) {
    logger.error('Error fetching organization:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch organization'
    });
  }
};

export const updateOrganization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;
    const updateData = req.body;

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
            agents: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Organization',
        entityId: organizationId,
        userId,
        organizationId,
        details: {
          changes: updateData
        }
      }
    });

    logger.info('Organization updated successfully', {
      organizationId,
      userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: {
        organization: {
          ...updatedOrganization,
          memberCount: updatedOrganization._count.users,
          projectCount: updatedOrganization._count.projects,
          agentCount: updatedOrganization._count.agents
        }
      }
    });
  } catch (error) {
    logger.error('Error updating organization:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update organization'
    });
  }
};

export const deleteOrganization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;

    // Get organization details for logging
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      res.status(404).json({
        error: 'Not found',
        message: 'Organization not found'
      });
      return;
    }

    // Soft delete by updating status
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        deletedAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Organization',
        entityId: organizationId,
        userId,
        organizationId,
        details: {
          organizationName: organization.name
        }
      }
    });

    logger.info('Organization deleted successfully', {
      organizationId,
      userId,
      organizationName: organization.name
    });

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting organization:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete organization'
    });
  }
};

export const getOrganizationMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.user!;
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
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
          { email: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    const [members, total] = await Promise.all([
      prisma.organizationUser.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { role: 'asc' },
          { createdAt: 'desc' }
        ],
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
              lastLoginAt: true,
              createdAt: true
            }
          }
        }
      }),
      prisma.organizationUser.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching organization members:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch organization members'
    });
  }
};

export const inviteMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, role, message } = req.body;
    const { organizationId, userId } = req.user!;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.organizationUser.findFirst({
        where: {
          organizationId,
          userId: existingUser.id
        }
      });

      if (existingMember) {
        res.status(409).json({
          error: 'Conflict',
          message: 'User is already a member of this organization'
        });
        return;
      }

      // Add existing user to organization
      const member = await prisma.organizationUser.create({
        data: {
          organizationId,
          userId: existingUser.id,
          role
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityType: 'OrganizationUser',
          entityId: member.id,
          userId,
          organizationId,
          details: {
            invitedEmail: email,
            role
          }
        }
      });

      res.status(201).json({
        success: true,
        data: {
          member
        },
        message: 'User added to organization successfully'
      });
    } else {
      // Create invitation for new user
      // In a real implementation, this would send an email invitation
      res.status(501).json({
        error: 'Not implemented',
        message: 'Email invitations not yet implemented. User must register first.'
      });
    }
  } catch (error) {
    logger.error('Error inviting member:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to invite member'
    });
  }
};

export const updateMemberRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const { role } = req.body;
    const { organizationId, userId } = req.user!;

    // Prevent changing own role
    if (targetUserId === userId) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Cannot change your own role'
      });
      return;
    }

    const member = await prisma.organizationUser.updateMany({
      where: {
        organizationId,
        userId: targetUserId
      },
      data: {
        role
      }
    });

    if (member.count === 0) {
      res.status(404).json({
        error: 'Not found',
        message: 'Member not found'
      });
      return;
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'OrganizationUser',
        entityId: `${organizationId}-${targetUserId}`,
        userId,
        organizationId,
        details: {
          targetUserId,
          newRole: role
        }
      }
    });

    logger.info('Member role updated successfully', {
      organizationId,
      targetUserId,
      newRole: role,
      updatedBy: userId
    });

    res.json({
      success: true,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    logger.error('Error updating member role:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update member role'
    });
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const { organizationId, userId } = req.user!;

    // Prevent removing self
    if (targetUserId === userId) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Cannot remove yourself from organization'
      });
      return;
    }

    // Check if target is organization owner
    const targetMember = await prisma.organizationUser.findFirst({
      where: {
        organizationId,
        userId: targetUserId
      }
    });

    if (!targetMember) {
      res.status(404).json({
        error: 'Not found',
        message: 'Member not found'
      });
      return;
    }

    if (targetMember.role === 'OWNER') {
      res.status(400).json({
        error: 'Bad request',
        message: 'Cannot remove organization owner'
      });
      return;
    }

    await prisma.organizationUser.delete({
      where: {
        id: targetMember.id
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'OrganizationUser',
        entityId: targetMember.id,
        userId,
        organizationId,
        details: {
          targetUserId,
          removedRole: targetMember.role
        }
      }
    });

    logger.info('Member removed successfully', {
      organizationId,
      targetUserId,
      removedBy: userId
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    logger.error('Error removing member:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove member'
    });
  }
};

export const getOrganizationStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.user!;

    // Get current month start and end
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalProjects,
      totalAgents,
      totalTasks,
      activeAgents,
      completedTasksThisMonth,
      totalMembers,
      totalTokensUsed
    ] = await Promise.all([
      prisma.project.count({
        where: { organizationId, status: 'ACTIVE' }
      }),
      prisma.agent.count({
        where: { organizationId, enabled: true }
      }),
      prisma.task.count({
        where: { organizationId }
      }),
      prisma.agent.count({
        where: { organizationId, status: 'RUNNING' }
      }),
      prisma.task.count({
        where: {
          organizationId,
          status: 'COMPLETED',
          completedAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      }),
      prisma.organizationUser.count({
        where: { organizationId }
      }),
      prisma.task.aggregate({
        where: {
          organizationId,
          actualTokens: { not: null }
        },
        _sum: {
          actualTokens: true
        }
      })
    ]);

    // Calculate task completion rate this month
    const totalTasksThisMonth = await prisma.task.count({
      where: {
        organizationId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const completionRate = totalTasksThisMonth > 0 
      ? (completedTasksThisMonth / totalTasksThisMonth) * 100 
      : 0;

    const stats = {
      projects: {
        total: totalProjects,
        active: totalProjects // Assuming all counted projects are active
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
        idle: totalAgents - activeAgents
      },
      tasks: {
        total: totalTasks,
        completedThisMonth: completedTasksThisMonth,
        completionRate: Math.round(completionRate)
      },
      members: {
        total: totalMembers
      },
      usage: {
        totalTokens: totalTokensUsed._sum.actualTokens || 0,
        monthlyTokens: 0 // Would need to calculate monthly usage
      }
    };

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    logger.error('Error fetching organization stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch organization stats'
    });
  }
};