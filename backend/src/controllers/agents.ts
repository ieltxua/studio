import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { AuditAction } from '@prisma/client';

export const createAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, type, projectId, configuration, budgetLimit, enabled = true } = req.body;
    const { organizationId, userId } = req.user!;

    // Verify project exists and user has access
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
                role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
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

    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        type,
        projectId,
        organizationId,
        configuration,
        budgetLimit,
        enabled,
        status: enabled ? 'IDLE' : 'DISABLED',
        createdById: userId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        entityType: 'Agent',
        entityId: agent.id,
        userId,
        organizationId,
        details: {
          agentName: name,
          agentType: type,
          projectId
        }
      }
    });

    logger.info('Agent created successfully', {
      agentId: agent.id,
      agentName: name,
      agentType: type,
      projectId,
      userId,
      organizationId
    });

    res.status(201).json({
      success: true,
      data: {
        agent
      }
    });
  } catch (error) {
    logger.error('Error creating agent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create agent'
    });
  }
};

export const getAgents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;
    const { 
      page = 1, 
      limit = 20, 
      projectId, 
      type, 
      status, 
      search 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      organizationId,
      project: {
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
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
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
              tasks: true
            }
          }
        }
      }),
      prisma.agent.count({ where })
    ]);

    const agentsWithMetrics = agents.map(agent => ({
      ...agent,
      taskCount: agent._count.tasks,
      uptime: agent.lastActiveAt 
        ? Math.floor((Date.now() - agent.lastActiveAt.getTime()) / 1000)
        : 0
    }));

    res.json({
      success: true,
      data: {
        agents: agentsWithMetrics,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch agents'
    });
  }
};

export const getAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;

    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
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
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tasks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            completedAt: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
      return;
    }

    // Calculate runtime metrics
    const uptime = agent.lastActiveAt 
      ? Math.floor((Date.now() - agent.lastActiveAt.getTime()) / 1000)
      : 0;

    const completedTasks = agent.tasks.filter(task => task.status === 'COMPLETED').length;
    const successRate = agent.tasks.length > 0 ? (completedTasks / agent.tasks.length) * 100 : 0;

    res.json({
      success: true,
      data: {
        agent: {
          ...agent,
          taskCount: agent._count.tasks,
          uptime,
          successRate: Math.round(successRate),
          recentTasks: agent.tasks
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching agent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch agent'
    });
  }
};

export const updateAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;
    const updateData = req.body;

    // Check if user has permission to update agent
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
          OR: [
            { createdById: userId },
            {
              projectUsers: {
                some: {
                  userId,
                  role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
                }
              }
            }
          ]
        }
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found or insufficient permissions'
      });
      return;
    }

    // Handle status changes based on enabled flag
    if ('enabled' in updateData) {
      if (updateData.enabled && agent.status === 'DISABLED') {
        updateData.status = 'IDLE';
      } else if (!updateData.enabled && agent.status !== 'DISABLED') {
        updateData.status = 'DISABLED';
      }
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
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
            tasks: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Agent',
        entityId: agentId,
        userId,
        organizationId,
        details: {
          changes: updateData
        }
      }
    });

    logger.info('Agent updated successfully', {
      agentId,
      userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: {
        agent: {
          ...updatedAgent,
          taskCount: updatedAgent._count.tasks
        }
      }
    });
  } catch (error) {
    logger.error('Error updating agent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update agent'
    });
  }
};

export const deleteAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;

    // Check if user has permission to delete agent
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
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
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found or insufficient permissions'
      });
      return;
    }

    // Soft delete by disabling and marking as deleted
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        enabled: false,
        status: 'DISABLED',
        deletedAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Agent',
        entityId: agentId,
        userId,
        organizationId,
        details: {
          agentName: agent.name,
          agentType: agent.type
        }
      }
    });

    logger.info('Agent deleted successfully', {
      agentId,
      userId,
      agentName: agent.name
    });

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting agent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete agent'
    });
  }
};

export const startAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;

    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
          OR: [
            { createdById: userId },
            {
              projectUsers: {
                some: {
                  userId,
                  role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
                }
              }
            }
          ]
        }
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found or insufficient permissions'
      });
      return;
    }

    if (!agent.enabled) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Cannot start disabled agent'
      });
      return;
    }

    if (agent.status === 'RUNNING') {
      res.status(400).json({
        error: 'Bad request',
        message: 'Agent is already running'
      });
      return;
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'RUNNING',
        lastActiveAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Agent',
        entityId: agentId,
        userId,
        organizationId,
        details: {
          action: 'start',
          agentName: agent.name
        }
      }
    });

    logger.info('Agent started successfully', {
      agentId,
      userId,
      agentName: agent.name
    });

    res.json({
      success: true,
      message: 'Agent started successfully'
    });
  } catch (error) {
    logger.error('Error starting agent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to start agent'
    });
  }
};

export const stopAgent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;

    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
          OR: [
            { createdById: userId },
            {
              projectUsers: {
                some: {
                  userId,
                  role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
                }
              }
            }
          ]
        }
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found or insufficient permissions'
      });
      return;
    }

    if (agent.status === 'IDLE' || agent.status === 'DISABLED') {
      res.status(400).json({
        error: 'Bad request',
        message: 'Agent is not running'
      });
      return;
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: 'IDLE'
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Agent',
        entityId: agentId,
        userId,
        organizationId,
        details: {
          action: 'stop',
          agentName: agent.name
        }
      }
    });

    logger.info('Agent stopped successfully', {
      agentId,
      userId,
      agentName: agent.name
    });

    res.json({
      success: true,
      message: 'Agent stopped successfully'
    });
  } catch (error) {
    logger.error('Error stopping agent:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to stop agent'
    });
  }
};

export const getAgentLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;
    const { 
      page = 1, 
      limit = 100, 
      level, 
      startDate, 
      endDate 
    } = req.query;

    // Verify agent access
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
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
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
      return;
    }

    // For now, return mock logs - real implementation would query log storage
    const mockLogs = [
      {
        id: '1',
        timestamp: new Date(),
        level: 'INFO',
        message: 'Agent started successfully',
        metadata: { source: 'agent-runtime' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 300000),
        level: 'DEBUG',
        message: 'Processing task queue',
        metadata: { taskCount: 3 }
      }
    ];

    res.json({
      success: true,
      data: {
        logs: mockLogs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: mockLogs.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching agent logs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch agent logs'
    });
  }
};

export const getAgentMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const { organizationId, userId } = req.user!;
    const { period = '24h' } = req.query;

    // Verify agent access
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
        project: {
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
      },
      include: {
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    if (!agent) {
      res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
      return;
    }

    // Calculate basic metrics
    const now = new Date();
    const periodStart = new Date(now.getTime() - getPeriodMs(period as string));

    const tasks = await prisma.task.findMany({
      where: {
        agentId,
        createdAt: {
          gte: periodStart
        }
      },
      select: {
        status: true,
        createdAt: true,
        completedAt: true,
        estimatedTokens: true
      }
    });

    const completedTasks = tasks.filter(task => task.status === 'COMPLETED');
    const failedTasks = tasks.filter(task => task.status === 'FAILED');
    const totalTokens = tasks.reduce((sum, task) => sum + (task.estimatedTokens || 0), 0);

    const metrics = {
      period,
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      successRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      totalTokens,
      averageCompletionTime: completedTasks.length > 0 
        ? completedTasks.reduce((sum, task) => {
            if (task.completedAt) {
              return sum + (task.completedAt.getTime() - task.createdAt.getTime());
            }
            return sum;
          }, 0) / completedTasks.length / 1000 // Convert to seconds
        : 0,
      uptime: agent.lastActiveAt 
        ? Math.floor((now.getTime() - agent.lastActiveAt.getTime()) / 1000)
        : 0
    };

    res.json({
      success: true,
      data: {
        metrics
      }
    });
  } catch (error) {
    logger.error('Error fetching agent metrics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch agent metrics'
    });
  }
};

function getPeriodMs(period: string): number {
  switch (period) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}