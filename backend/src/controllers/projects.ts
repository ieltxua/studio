import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { AuditAction } from '@prisma/client';

export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, slug, settings, budgetLimit } = req.body;
    const { organizationId, userId } = req.user!;

    // Check if slug is unique within organization
    const existingProject = await prisma.project.findFirst({
      where: {
        slug,
        organizationId
      }
    });

    if (existingProject) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Project slug already exists in this organization'
      });
      return;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        slug,
        settings: settings || {},
        budgetLimit,
        organizationId,
        createdById: userId
      },
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
            projectUsers: true,
            agents: true,
            tasks: true
          }
        }
      }
    });

    // Add creator as project owner
    await prisma.projectUser.create({
      data: {
        projectId: project.id,
        userId,
        role: 'OWNER'
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Project',
        entityId: project.id,
        userId,
        organizationId,
        details: {
          projectName: name,
          slug
        }
      }
    });

    logger.info('Project created successfully', {
      projectId: project.id,
      projectName: name,
      userId,
      organizationId
    });

    res.status(201).json({
      success: true,
      data: {
        project: {
          ...project,
          memberCount: project._count.projectUsers + 1, // Include owner
          agentCount: project._count.agents,
          taskCount: project._count.tasks
        }
      }
    });
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create project'
    });
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      search 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
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
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
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
              projectUsers: true,
              agents: true,
              tasks: true
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    const projectsWithCounts = projects.map(project => ({
      ...project,
      memberCount: project._count.projectUsers,
      agentCount: project._count.agents,
      taskCount: project._count.tasks
    }));

    res.json({
      success: true,
      data: {
        projects: projectsWithCounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch projects'
    });
  }
};

export const getProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { organizationId, userId } = req.user!;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        projectUsers: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        agents: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true
          }
        },
        tasks: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            agents: true,
            tasks: true
          }
        }
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        project: {
          ...project,
          memberCount: project.projectUsers.length,
          agentCount: project._count.agents,
          taskCount: project._count.tasks
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch project'
    });
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { organizationId, userId } = req.user!;
    const updateData = req.body;

    // Check if user has permission to update project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        OR: [
          { createdById: userId },
          {
            projectUsers: {
              some: {
                userId,
                role: { in: ['OWNER', 'ADMIN'] }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found or insufficient permissions'
      });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
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
            projectUsers: true,
            agents: true,
            tasks: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Project',
        entityId: projectId,
        userId,
        organizationId,
        details: {
          changes: updateData
        }
      }
    });

    logger.info('Project updated successfully', {
      projectId,
      userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: {
        project: {
          ...updatedProject,
          memberCount: updatedProject._count.projectUsers,
          agentCount: updatedProject._count.agents,
          taskCount: updatedProject._count.tasks
        }
      }
    });
  } catch (error) {
    logger.error('Error updating project:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update project'
    });
  }
};

export const deleteProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { organizationId, userId } = req.user!;

    // Check if user has permission to delete project (only owners)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        OR: [
          { createdById: userId },
          {
            projectUsers: {
              some: {
                userId,
                role: 'OWNER'
              }
            }
          }
        ]
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found or insufficient permissions'
      });
      return;
    }

    // Soft delete by updating status
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Project',
        entityId: projectId,
        userId,
        organizationId,
        details: {
          projectName: project.name
        }
      }
    });

    logger.info('Project deleted successfully', {
      projectId,
      userId,
      projectName: project.name
    });

    res.json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete project'
    });
  }
};

export const getProjectMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { organizationId, userId } = req.user!;

    // Check if user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found'
      });
      return;
    }

    const members = await prisma.projectUser.findMany({
      where: {
        projectId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: {
        role: 'asc'
      }
    });

    res.json({
      success: true,
      data: {
        members
      }
    });
  } catch (error) {
    logger.error('Error fetching project members:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch project members'
    });
  }
};

export const addProjectMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { userId: targetUserId, role } = req.body;
    const { organizationId, userId } = req.user!;

    // Check if current user has permission to add members
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        OR: [
          { createdById: userId },
          {
            projectUsers: {
              some: {
                userId,
                role: { in: ['OWNER', 'ADMIN'] }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found or insufficient permissions'
      });
      return;
    }

    // Check if target user exists in organization
    const targetUser = await prisma.organizationUser.findFirst({
      where: {
        userId: targetUserId,
        organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!targetUser) {
      res.status(404).json({
        error: 'Not found',
        message: 'User not found in organization'
      });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.projectUser.findFirst({
      where: {
        projectId,
        userId: targetUserId
      }
    });

    if (existingMember) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User is already a member of this project'
      });
      return;
    }

    const member = await prisma.projectUser.create({
      data: {
        projectId,
        userId: targetUserId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'ProjectUser',
        entityId: member.id,
        userId,
        organizationId,
        details: {
          projectId,
          targetUserId,
          role
        }
      }
    });

    logger.info('Project member added successfully', {
      projectId,
      targetUserId,
      role,
      addedBy: userId
    });

    res.status(201).json({
      success: true,
      data: {
        member
      }
    });
  } catch (error) {
    logger.error('Error adding project member:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add project member'
    });
  }
};

export const updateProjectMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const { role } = req.body;
    const { organizationId, userId } = req.user!;

    // Check if current user has permission to update members
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        OR: [
          { createdById: userId },
          {
            projectUsers: {
              some: {
                userId,
                role: { in: ['OWNER', 'ADMIN'] }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found or insufficient permissions'
      });
      return;
    }

    const member = await prisma.projectUser.updateMany({
      where: {
        projectId,
        userId: targetUserId
      },
      data: {
        role
      }
    });

    if (member.count === 0) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project member not found'
      });
      return;
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'ProjectUser',
        entityId: `${projectId}-${targetUserId}`,
        userId,
        organizationId,
        details: {
          projectId,
          targetUserId,
          newRole: role
        }
      }
    });

    logger.info('Project member updated successfully', {
      projectId,
      targetUserId,
      newRole: role,
      updatedBy: userId
    });

    res.json({
      success: true,
      message: 'Project member updated successfully'
    });
  } catch (error) {
    logger.error('Error updating project member:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update project member'
    });
  }
};

export const removeProjectMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const { organizationId, userId } = req.user!;

    // Check if current user has permission to remove members
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        OR: [
          { createdById: userId },
          {
            projectUsers: {
              some: {
                userId,
                role: { in: ['OWNER', 'ADMIN'] }
              }
            }
          }
        ]
      }
    });

    if (!project) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project not found or insufficient permissions'
      });
      return;
    }

    const member = await prisma.projectUser.deleteMany({
      where: {
        projectId,
        userId: targetUserId
      }
    });

    if (member.count === 0) {
      res.status(404).json({
        error: 'Not found',
        message: 'Project member not found'
      });
      return;
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'ProjectUser',
        entityId: `${projectId}-${targetUserId}`,
        userId,
        organizationId,
        details: {
          projectId,
          targetUserId
        }
      }
    });

    logger.info('Project member removed successfully', {
      projectId,
      targetUserId,
      removedBy: userId
    });

    res.json({
      success: true,
      message: 'Project member removed successfully'
    });
  } catch (error) {
    logger.error('Error removing project member:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove project member'
    });
  }
};