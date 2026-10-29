import { Role, TaskStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
import { TaskService } from '../services/task.service.js';
import {
  buildPrismaQuery,
  parseQueryContract,
  QueryContractError,
} from '../utils/ezfilter.helper.js';
import {
  buildPaginationMeta,
  sendError,
  sendSuccess,
} from '../utils/response.js';

export const projectRouter = Router();

projectRouter.use(authMiddleware);

const createProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  client_id: z.string().uuid().optional().nullable(),
});

// GET /projects - List projects
projectRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const rawQuery = req.query as Record<string, any>;

    const additionalWhere: any = {};
    if (user.role === Role.CLIENT_GUEST) {
      additionalWhere.clients = {
        some: { user_id: user.id },
      };
    } else if (user.role === Role.INTERNAL_TEAM) {
      // Internal Team can only view projects assigned to them
      additionalWhere.OR = [
        { members: { some: { user_id: user.id } } },
        { tasks: { some: { assignee_id: user.id, deleted_at: null } } },
      ];
    }

    const prismaQuery = buildPrismaQuery(rawQuery, additionalWhere, {
      userRole: user.role,
      includeDeleted:
        rawQuery.includeDeleted === 'true' || rawQuery.includeDeleted === '1',
    });

    const totalRows = await prisma.project.count({
      where: prismaQuery.where,
    });

    const projects = await prisma.project.findMany({
      where: prismaQuery.where,
      orderBy: prismaQuery.orderBy || { created_at: 'desc' },
      take: prismaQuery.take,
      skip: prismaQuery.skip,
      include: {
        _count: {
          select: { tasks: { where: { deleted_at: null } } },
        },
      },
    });

    const parsedQuery = parseQueryContract(rawQuery);
    const page = parsedQuery.page || 1;
    const rows = parsedQuery.rows || 10;
    const paginationMeta = buildPaginationMeta(page, rows, totalRows);

    return sendSuccess(res, projects, paginationMeta);
  } catch (err: any) {
    if (err instanceof QueryContractError) {
      return sendError(
        res,
        err.code,
        err.message,
        err.details || [],
        err.statusCode as any,
      );
    }
    return sendError(res, 'QUERY_ERROR', err.message, [], 500);
  }
});

// GET /projects/archived - List soft-deleted/archived projects (PM & Super Admin)
projectRouter.get(
  '/archived',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (_req, res) => {
    try {
      const archived = await prisma.project.findMany({
        where: { deleted_at: { not: null } },
        orderBy: { deleted_at: 'desc' },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });
      return sendSuccess(res, archived);
    } catch (err: any) {
      return sendError(res, 'ARCHIVE_FETCH_ERROR', err.message, [], 500);
    }
  },
);

// GET /projects/:id - Get project details
projectRouter.get('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id, deleted_at: null },
      include: {
        clients: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
                role: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                role: true,
                avatar_url: true,
              },
            },
          },
        },
        tasks: {
          where: { deleted_at: null },
          select: { id: true, assignee_id: true, department: true },
        },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
    }

    if (user.role === Role.CLIENT_GUEST) {
      const isClientAssigned = project.clients.some(
        (cl) => cl.user_id === user.id,
      );
      if (!isClientAssigned) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access to this project is denied',
          [],
          403,
        );
      }
    } else if (user.role === Role.INTERNAL_TEAM) {
      const isMember =
        project.members.some((m) => m.user_id === user.id) ||
        project.tasks.some((t) => t.assignee_id === user.id);
      if (!isMember) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You are not assigned to this project.',
          [],
          403,
        );
      }
    }

    return sendSuccess(res, project);
  } catch (err: any) {
    return sendError(res, 'GET_ERROR', err.message, [], 500);
  }
});

// GET /projects/:id/members - List members and clients of project
projectRouter.get('/:id/members', async (req, res) => {
  try {
    const id = req.params.id as string;
    const project = await prisma.project.findFirst({
      where: { id, deleted_at: null },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                role: true,
                avatar_url: true,
              },
            },
          },
        },
        clients: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
    }

    return sendSuccess(res, {
      members: project.members.map((m) => m.user),
      clients: project.clients.map((c) => c.user),
    });
  } catch (err: any) {
    return sendError(res, 'GET_MEMBERS_ERROR', err.message, [], 500);
  }
});

// POST /projects/:id/members - Add internal member to project (PM & Super Admin)
projectRouter.post(
  '/:id/members',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const projectId = req.params.id as string;
      const { user_id } = req.body;
      if (!user_id) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'user_id is required',
          [],
          400,
        );
      }

      const user = await prisma.user.findFirst({
        where: { id: user_id, deleted_at: null },
      });
      if (!user) {
        return sendError(res, 'USER_NOT_FOUND', 'User not found', [], 404);
      }

      const member = await prisma.projectMember.upsert({
        where: {
          project_id_user_id: { project_id: projectId, user_id },
        },
        create: { project_id: projectId, user_id },
        update: {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              role: true,
              avatar_url: true,
            },
          },
        },
      });

      return sendSuccess(res, member, undefined, 201);
    } catch (err: any) {
      return sendError(res, 'ADD_MEMBER_ERROR', err.message, [], 500);
    }
  },
);

// DELETE /projects/:id/members/:userId - Remove internal member from project (PM & Super Admin)
projectRouter.delete(
  '/:id/members/:userId',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const projectId = req.params.id as string;
      const userId = req.params.userId as string;

      await prisma.projectMember.deleteMany({
        where: { project_id: projectId, user_id: userId },
      });

      return sendSuccess(res, {
        message: 'Member removed from project successfully',
      });
    } catch (err: any) {
      return sendError(res, 'REMOVE_MEMBER_ERROR', err.message, [], 500);
    }
  },
);

// POST /projects/:id/clients - Assign client guest to project (PM & Super Admin)
projectRouter.post(
  '/:id/clients',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const projectId = req.params.id as string;
      const { user_id } = req.body;
      if (!user_id) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'user_id is required',
          [],
          400,
        );
      }

      const clientUser = await prisma.user.findFirst({
        where: { id: user_id, role: Role.CLIENT_GUEST, deleted_at: null },
      });
      if (!clientUser) {
        return sendError(
          res,
          'CLIENT_NOT_FOUND',
          'Active Client Guest not found',
          [],
          404,
        );
      }

      const client = await prisma.projectClient.upsert({
        where: {
          project_id_user_id: { project_id: projectId, user_id },
        },
        create: { project_id: projectId, user_id },
        update: {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar_url: true,
              role: true,
            },
          },
        },
      });

      return sendSuccess(res, client, undefined, 201);
    } catch (err: any) {
      return sendError(res, 'ADD_CLIENT_ERROR', err.message, [], 500);
    }
  },
);

// DELETE /projects/:id/clients/:userId - Remove client guest from project (PM & Super Admin)
projectRouter.delete(
  '/:id/clients/:userId',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const projectId = req.params.id as string;
      const userId = req.params.userId as string;

      await prisma.projectClient.deleteMany({
        where: { project_id: projectId, user_id: userId },
      });

      return sendSuccess(res, {
        message: 'Client removed from project successfully',
      });
    } catch (err: any) {
      return sendError(res, 'REMOVE_CLIENT_ERROR', err.message, [], 500);
    }
  },
);

// POST /projects - Create project (PM & Super Admin)
projectRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const validated = createProjectSchema.safeParse(req.body);

      if (!validated.success) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid project payload',
          validated.error.issues,
          400,
        );
      }

      const project = await prisma.$transaction(async (tx) => {
        const { client_id, ...projectData } = validated.data;
        const p = await tx.project.create({
          data: projectData,
        });

        // Auto-enroll active internal team members to the new project
        const internalUsers = await tx.user.findMany({
          where: { role: Role.INTERNAL_TEAM, deleted_at: null },
          select: { id: true },
        });

        if (internalUsers.length > 0) {
          await tx.projectMember.createMany({
            data: internalUsers.map((u) => ({
              project_id: p.id,
              user_id: u.id,
            })),
          });
        }

        // If client guest was selected during project creation, assign client
        if (client_id) {
          await tx.projectClient.create({
            data: {
              project_id: p.id,
              user_id: client_id,
            },
          });
        }

        return p;
      });

      return sendSuccess(res, project, undefined, 201);
    } catch (err: any) {
      return sendError(res, 'CREATE_ERROR', err.message, [], 500);
    }
  },
);

// PATCH /projects/:id - Edit project (PM only)
projectRouter.patch(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const updateProjectSchema = z.object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
      });

      const validated = updateProjectSchema.safeParse(req.body);
      if (!validated.success) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid project update payload',
          validated.error.issues,
          400,
        );
      }

      const existing = await prisma.project.findFirst({
        where: { id, deleted_at: null },
      });
      if (!existing) {
        return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
      }

      const updated = await prisma.project.update({
        where: { id },
        data: validated.data,
      });

      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, 'UPDATE_ERROR', err.message, [], 500);
    }
  },
);

// DELETE /projects/:id - Cascading soft-delete project & its tasks (PM & Super Admin)
projectRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findFirst({
        where: { id, deleted_at: null },
      });
      if (!project) {
        return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
      }

      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id },
          data: { deleted_at: new Date() },
        });
        await tx.task.updateMany({
          where: { project_id: id, deleted_at: null },
          data: { deleted_at: new Date() },
        });
      });

      return sendSuccess(res, {
        message: 'Project and all related tasks soft-deleted successfully',
      });
    } catch (err: any) {
      return sendError(res, 'DELETE_ERROR', err.message, [], 500);
    }
  },
);

// POST /projects/:id/restore - Restore soft-deleted project and all child tasks (PM & Super Admin)
projectRouter.post(
  '/:id/restore',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const project = await prisma.project.findFirst({
        where: { id, deleted_at: { not: null } },
      });
      if (!project) {
        return sendError(
          res,
          'NOT_FOUND',
          'Archived project not found',
          [],
          404,
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id },
          data: { deleted_at: null },
        });
        await tx.task.updateMany({
          where: { project_id: id },
          data: { deleted_at: null },
        });
      });

      return sendSuccess(res, {
        message:
          'Project and all associated deliverables restored successfully',
        project,
      });
    } catch (err: any) {
      return sendError(res, 'RESTORE_ERROR', err.message, [], 500);
    }
  },
);

// GET /projects/:id/client-view - Multi-Tenant Client Guest Portal
projectRouter.get('/:id/client-view', async (req, res) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id, deleted_at: null },
      include: {
        clients: true,
        tasks: {
          where: {
            deleted_at: null,
            client_visible: true,
          },
          include: {
            dependencies: {
              where: { deleted_at: null },
              include: {
                prerequisite: {
                  select: { id: true, title: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
    }

    if (user.role === Role.CLIENT_GUEST) {
      const isAssigned = project.clients.some((cl) => cl.user_id === user.id);
      if (!isAssigned) {
        return sendError(
          res,
          'FORBIDDEN',
          'You do not have permission to view this project',
          [],
          403,
        );
      }
    }

    // Compute progress metrics
    const totalVisible = project.tasks.length;
    const completedVisible = project.tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const inProgressVisible = project.tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const progressPercentage =
      totalVisible > 0
        ? Math.round((completedVisible / totalVisible) * 100)
        : 0;

    // Strict Data Masking: internal engineer identities and sensitive details are scrubbed
    const maskedTasks = project.tasks.map((task) => {
      const isBlocked = task.dependencies.some(
        (d) => d.prerequisite.status !== TaskStatus.DONE,
      );
      return {
        ...TaskService.maskTaskForClient(task),
        isBlocked,
      };
    });

    return sendSuccess(res, {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
      metrics: {
        totalTasks: totalVisible,
        completedTasks: completedVisible,
        inProgressTasks: inProgressVisible,
        progressPercentage,
      },
      tasks: maskedTasks,
    });
  } catch (err: any) {
    console.error('CLIENT_VIEW_ERROR details:', err);
    return sendError(res, 'CLIENT_VIEW_ERROR', err.message, [], 500);
  }
});

// GET /projects/:id/summary - Aggregate metrics
projectRouter.get('/:id/summary', async (req, res) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id, deleted_at: null },
      include: {
        clients: true,
        members: true,
        tasks: {
          where: { deleted_at: null },
        },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
    }

    if (user.role === Role.CLIENT_GUEST) {
      const isAssigned = project.clients.some((cl) => cl.user_id === user.id);
      if (!isAssigned) {
        return sendError(
          res,
          'FORBIDDEN',
          'You do not have permission to view this project',
          [],
          403,
        );
      }
    } else if (user.role === Role.INTERNAL_TEAM) {
      const isMember =
        project.members.some((m) => m.user_id === user.id) ||
        project.tasks.some((t) => t.assignee_id === user.id);
      if (!isMember) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You are not assigned to this project.',
          [],
          403,
        );
      }
    }

    const visibleTasks =
      user.role === Role.CLIENT_GUEST
        ? project.tasks.filter((t) => t.client_visible)
        : project.tasks;

    const totalTasks = visibleTasks.length;
    const doneTasks = visibleTasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const percentComplete =
      totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return sendSuccess(res, {
      projectName: project.name,
      percentComplete,
      totalTasks,
      doneTasks,
    });
  } catch (err: any) {
    return sendError(res, 'SUMMARY_ERROR', err.message, [], 500);
  }
});

// GET /projects/:id/standup-summary - Daily Standup Auto-Summary per Project
projectRouter.get('/:id/standup-summary', async (req, res) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;
    const queryDate = req.query.date as string | undefined;
    const targetDateStr = queryDate || new Date().toISOString().split('T')[0]!;

    const project = await prisma.project.findFirst({
      where: { id, deleted_at: null },
      include: {
        members: true,
        tasks: { where: { deleted_at: null }, select: { assignee_id: true } },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
    }

    if (user.role === Role.CLIENT_GUEST) {
      return sendError(
        res,
        'FORBIDDEN',
        'Client guests are not authorized to view internal standup summaries',
        [],
        403,
      );
    } else if (user.role === Role.INTERNAL_TEAM) {
      const isMember =
        project.members.some((m) => m.user_id === user.id) ||
        project.tasks.some((t) => t.assignee_id === user.id);
      if (!isMember) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You are not assigned to this project.',
          [],
          403,
        );
      }
    }

    const targetDate = new Date(targetDateStr);
    const yesterdayStart = new Date(targetDate);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const completedAuditLogs = await prisma.auditLog.findMany({
      where: {
        changed_column: 'status',
        new_value: TaskStatus.DONE,
        created_at: {
          gte: yesterdayStart,
          lte: new Date(),
        },
        task: {
          project_id: id,
          deleted_at: null,
        },
      },
      include: {
        task: true,
        user: { select: { id: true, name: true, department: true } },
      },
    });

    const activeTasks = await prisma.task.findMany({
      where: {
        project_id: id,
        status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        deleted_at: null,
      },
      include: {
        dependencies: {
          where: { deleted_at: null },
          include: {
            prerequisite: {
              select: { id: true, title: true, status: true, department: true },
            },
          },
        },
      },
    });

    const deptMap: Record<
      string,
      {
        completedYesterday: Array<{
          taskId: string;
          title: string;
          completedBy: string;
        }>;
        blockedToday: Array<{
          taskId: string;
          title: string;
          blockedBy: string[];
        }>;
      }
    > = {
      PRODUCT: { completedYesterday: [], blockedToday: [] },
      FRONTEND: { completedYesterday: [], blockedToday: [] },
      BACKEND: { completedYesterday: [], blockedToday: [] },
      UI_UX: { completedYesterday: [], blockedToday: [] },
    };

    completedAuditLogs.forEach((log) => {
      const deptCode = log.task.department;
      if (deptMap[deptCode]) {
        deptMap[deptCode].completedYesterday.push({
          taskId: log.task_id,
          title: log.task.title,
          completedBy: log.user.name,
        });
      }
    });

    activeTasks.forEach((task) => {
      const pendingDeps = task.dependencies.filter(
        (d) => d.prerequisite.status !== TaskStatus.DONE,
      );
      if (pendingDeps.length > 0) {
        const deptCode = task.department;
        if (deptMap[deptCode]) {
          deptMap[deptCode].blockedToday.push({
            taskId: task.id,
            title: task.title,
            blockedBy: pendingDeps.map((d) => d.prerequisite.title),
          });
        }
      }
    });

    const departmentsArray = Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      completedYesterday: data.completedYesterday,
      blockedToday: data.blockedToday,
    }));

    return sendSuccess(res, {
      projectId: id,
      date: targetDateStr,
      departments: departmentsArray,
    });
  } catch (err: any) {
    return sendError(res, 'STANDUP_SUMMARY_ERROR', err.message, [], 500);
  }
});

// GET /projects/:id/board - Kanban Board Data with Computed Dependencies
projectRouter.get('/:id/board', async (req, res) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id, deleted_at: null },
      include: {
        clients: true,
        members: true,
        tasks: {
          where: { deleted_at: null },
          select: { assignee_id: true },
        },
      },
    });

    if (!project) {
      return sendError(res, 'NOT_FOUND', 'Project not found', [], 404);
    }

    if (user.role === Role.CLIENT_GUEST) {
      const isAssigned = project.clients.some((cl) => cl.user_id === user.id);
      if (!isAssigned) {
        return sendError(res, 'FORBIDDEN', 'Access denied', [], 403);
      }
    } else if (user.role === Role.INTERNAL_TEAM) {
      const isMember =
        project.members.some((m) => m.user_id === user.id) ||
        project.tasks.some((t) => t.assignee_id === user.id);
      if (!isMember) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You are not assigned to this project.',
          [],
          403,
        );
      }
    }

    const taskWhere: any = {
      project_id: id,
      deleted_at: null,
    };

    if (user.role === Role.CLIENT_GUEST) {
      taskWhere.client_visible = true;
    }

    const tasks = await prisma.task.findMany({
      where: taskWhere,
      orderBy: { created_at: 'asc' },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            avatar_url: true,
          },
        },
        dependencies: {
          where: { deleted_at: null },
          include: {
            prerequisite: {
              select: { id: true, title: true, status: true, department: true },
            },
          },
        },
      },
    });

    // Compute blocked status and format by Kanban column
    const columns: Record<TaskStatus, any[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };

    tasks.forEach((task) => {
      const pendingPrereqs = task.dependencies.filter(
        (d) => d.prerequisite.status !== TaskStatus.DONE,
      );
      const isBlocked = pendingPrereqs.length > 0;

      const taskData =
        user.role === Role.CLIENT_GUEST
          ? {
              id: task.id,
              project_id: task.project_id,
              title: task.title,
              description: task.description,
              status: task.status,
              due_date: task.due_date,
              isBlocked,
              assignee: {
                name: 'Assigned Specialist',
                avatar_url: null,
              },
            }
          : {
              ...task,
              isBlocked,
              pendingPrerequisites: pendingPrereqs.map((p) => ({
                id: p.prerequisite.id,
                title: p.prerequisite.title,
                status: p.prerequisite.status,
                department: p.prerequisite.department,
              })),
            };

      columns[task.status].push(taskData);
    });

    return sendSuccess(res, {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
      columns,
    });
  } catch (err: any) {
    return sendError(res, 'BOARD_ERROR', err.message, [], 500);
  }
});
