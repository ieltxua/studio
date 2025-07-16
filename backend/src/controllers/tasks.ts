import { Request, Response } from 'express';
import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { AuditAction } from '@prisma/client';

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      priority, 
      projectId, 
      agentId, 
      assigneeId, 
      dueDate, 
      estimatedTokens, 
      metadata 
    } = req.body;
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

    // Verify agent exists if specified
    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          projectId,
          organizationId
        }
      });

      if (!agent) {
        res.status(404).json({
          error: 'Not found',
          message: 'Agent not found'
        });
        return;
      }
    }

    // Verify assignee exists if specified
    if (assigneeId) {
      const assignee = await prisma.organizationUser.findFirst({
        where: {
          userId: assigneeId,
          organizationId
        }
      });

      if (!assignee) {
        res.status(404).json({
          error: 'Not found',
          message: 'Assignee not found in organization'
        });
        return;
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        projectId,
        organizationId,
        agentId,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedTokens,
        metadata: metadata || {},
        createdById: userId,
        status: 'TODO'
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
        entityType: 'Task',
        entityId: task.id,
        userId,
        organizationId,
        details: {
          taskTitle: title,
          projectId,
          agentId,
          assigneeId
        }
      }
    });

    logger.info('Task created successfully', {
      taskId: task.id,
      taskTitle: title,
      projectId,
      userId,
      organizationId
    });

    res.status(201).json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create task'
    });
  }
};

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;
    const { 
      page = 1, 
      limit = 20, 
      projectId, 
      agentId, 
      assigneeId, 
      status, 
      priority, 
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

    if (agentId) {
      where.agentId = agentId;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          agent: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
              comments: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    const tasksWithCommentCount = tasks.map(task => ({
      ...task,
      commentCount: task._count.comments,
      isOverdue: task.dueDate && new Date() > task.dueDate && task.status !== 'COMPLETED'
    }));

    res.json({
      success: true,
      data: {
        tasks: tasksWithCommentCount,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch tasks'
    });
  }
};

export const getTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { organizationId, userId } = req.user!;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
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
        comments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found'
      });
      return;
    }

    const taskWithDetails = {
      ...task,
      commentCount: task._count.comments,
      isOverdue: task.dueDate && new Date() > task.dueDate && task.status !== 'COMPLETED',
      duration: task.completedAt 
        ? Math.floor((task.completedAt.getTime() - task.createdAt.getTime()) / 1000)
        : null
    };

    res.json({
      success: true,
      data: {
        task: taskWithDetails
      }
    });
  } catch (error) {
    logger.error('Error fetching task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch task'
    });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { organizationId, userId } = req.user!;
    const updateData = req.body;

    // Check if user has permission to update task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found or insufficient permissions'
      });
      return;
    }

    // Handle status transitions
    if (updateData.status) {
      if (updateData.status === 'COMPLETED' && task.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (updateData.status !== 'COMPLETED' && task.status === 'COMPLETED') {
        updateData.completedAt = null;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
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
        agent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
            comments: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Task',
        entityId: taskId,
        userId,
        organizationId,
        details: {
          changes: updateData
        }
      }
    });

    logger.info('Task updated successfully', {
      taskId,
      userId,
      changes: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: {
        task: {
          ...updatedTask,
          commentCount: updatedTask._count.comments,
          isOverdue: updatedTask.dueDate && new Date() > updatedTask.dueDate && updatedTask.status !== 'COMPLETED'
        }
      }
    });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update task'
    });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { organizationId, userId } = req.user!;

    // Check if user has permission to delete task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found or insufficient permissions'
      });
      return;
    }

    // Soft delete by updating status
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'CANCELLED',
        deletedAt: new Date()
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.DELETE,
        entityType: 'Task',
        entityId: taskId,
        userId,
        organizationId,
        details: {
          taskTitle: task.title
        }
      }
    });

    logger.info('Task deleted successfully', {
      taskId,
      userId,
      taskTitle: task.title
    });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete task'
    });
  }
};

export const assignTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { assigneeId, agentId } = req.body;
    const { organizationId, userId } = req.user!;

    // Check if user has permission to assign task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found or insufficient permissions'
      });
      return;
    }

    // Verify assignee if specified
    if (assigneeId) {
      const assignee = await prisma.organizationUser.findFirst({
        where: {
          userId: assigneeId,
          organizationId
        }
      });

      if (!assignee) {
        res.status(404).json({
          error: 'Not found',
          message: 'Assignee not found in organization'
        });
        return;
      }
    }

    // Verify agent if specified
    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          organizationId
        }
      });

      if (!agent) {
        res.status(404).json({
          error: 'Not found',
          message: 'Agent not found'
        });
        return;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId,
        agentId,
        status: assigneeId || agentId ? 'IN_PROGRESS' : 'TODO',
        updatedAt: new Date()
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Task',
        entityId: taskId,
        userId,
        organizationId,
        details: {
          action: 'assign',
          assigneeId,
          agentId
        }
      }
    });

    logger.info('Task assigned successfully', {
      taskId,
      assigneeId,
      agentId,
      assignedBy: userId
    });

    res.json({
      success: true,
      data: {
        task: updatedTask
      }
    });
  } catch (error) {
    logger.error('Error assigning task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to assign task'
    });
  }
};

export const completeTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { completionNotes, actualTokens } = req.body;
    const { organizationId, userId } = req.user!;

    // Check if user has permission to complete task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
        OR: [
          { createdById: userId },
          { assigneeId: userId },
          {
            project: {
              projectUsers: {
                some: {
                  userId,
                  role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
                }
              }
            }
          }
        ]
      }
    });

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found or insufficient permissions'
      });
      return;
    }

    if (task.status === 'COMPLETED') {
      res.status(400).json({
        error: 'Bad request',
        message: 'Task is already completed'
      });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completionNotes,
        actualTokens,
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
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        agent: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        entityType: 'Task',
        entityId: taskId,
        userId,
        organizationId,
        details: {
          action: 'complete',
          completionNotes,
          actualTokens
        }
      }
    });

    logger.info('Task completed successfully', {
      taskId,
      completedBy: userId,
      actualTokens
    });

    res.json({
      success: true,
      data: {
        task: updatedTask
      }
    });
  } catch (error) {
    logger.error('Error completing task:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to complete task'
    });
  }
};

export const getTaskComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { organizationId, userId } = req.user!;
    const { page = 1, limit = 20 } = req.query;

    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found'
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [comments, total] = await Promise.all([
      prisma.taskComment.findMany({
        where: { taskId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true
            }
          }
        }
      }),
      prisma.taskComment.count({ where: { taskId } })
    ]);

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching task comments:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch task comments'
    });
  }
};

export const addTaskComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const { organizationId, userId } = req.user!;

    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
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

    if (!task) {
      res.status(404).json({
        error: 'Not found',
        message: 'Task not found'
      });
      return;
    }

    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        authorId: userId
      },
      include: {
        author: {
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
        entityType: 'TaskComment',
        entityId: comment.id,
        userId,
        organizationId,
        details: {
          taskId,
          commentLength: content.length
        }
      }
    });

    logger.info('Task comment added successfully', {
      commentId: comment.id,
      taskId,
      userId
    });

    res.status(201).json({
      success: true,
      data: {
        comment
      }
    });
  } catch (error) {
    logger.error('Error adding task comment:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add task comment'
    });
  }
};