import { Department, Role, TaskStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
import { TaskService, TaskServiceError } from '../services/task.service.js';
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

export const taskRouter = Router();

taskRouter.use(authMiddleware);

const createTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  department: z.nativeEnum(Department),
  assignee_id: z.string().uuid().optional().nullable(),
  client_visible: z.boolean().default(false),
  due_date: z.string().datetime().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  client_visible: z.boolean().optional(),
  due_date: z.string().datetime().optional().nullable(),
  version: z
    .number()
    .int()
    .min(1, 'Version is required for concurrency control'),
});

const addDependencySchema = z.object({
  prerequisite_id: z.string().uuid(),
});

// GET /tasks - List tasks with Relay ezfilter
taskRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const rawQuery = req.query as Record<string, any>;

    // Additional where condition based on role and project
    const additionalWhere: any = {};

    // Client guest isolation
    if (user.role === Role.CLIENT_GUEST) {
      additionalWhere.client_visible = true;
      // Must belong to projects assigned to client
      additionalWhere.project = {
        clients: {
          some: { user_id: user.id },
        },
      };
    } else if (user.role === Role.INTERNAL_TEAM) {
      // Internal team only sees tasks in projects assigned to them
      additionalWhere.project = {
        OR: [
          { members: { some: { user_id: user.id } } },
          { tasks: { some: { assignee_id: user.id, deleted_at: null } } },
        ],
      };
    }

    // Build Prisma query via ezfilter helper
    const prismaQuery = buildPrismaQuery(rawQuery, additionalWhere, {
      userRole: user.role,
      includeDeleted:
        rawQuery.includeDeleted === 'true' || rawQuery.includeDeleted === '1',
    });

    // Fetch total rows for pagination metadata
    const totalRows = await prisma.task.count({
      where: prismaQuery.where,
    });

    const tasks = await prisma.task.findMany({
      where: prismaQuery.where,
      orderBy: prismaQuery.orderBy || { created_at: 'desc' },
      take: prismaQuery.take,
      skip: prismaQuery.skip,
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
        project: {
          select: { id: true, name: true },
        },
        dependencies: {
          where: { deleted_at: null },
          include: {
            prerequisite: {
              select: { id: true, title: true, status: true, department: true },
            },
          },
        },
        prerequisites: {
          where: { deleted_at: null },
          include: {
            task: {
              select: { id: true, title: true, status: true, department: true },
            },
          },
        },
      },
    });

    // Post-process tasks: compute isBlocked & mask for Client Guest
    const processedTasks = tasks.map((task) => {
      const pendingDeps = task.dependencies.filter(
        (d) => d.prerequisite.status !== TaskStatus.DONE,
      );
      const isBlocked = pendingDeps.length > 0;

      if (user.role === Role.CLIENT_GUEST) {
        return {
          ...TaskService.maskTaskForClient(task),
          isBlocked,
        };
      }

      return {
        ...task,
        isBlocked,
        pendingDependencies: pendingDeps.map((d) => ({
          id: d.prerequisite.id,
          title: d.prerequisite.title,
          status: d.prerequisite.status,
          department: d.prerequisite.department,
        })),
      };
    });

    const parsedQuery = parseQueryContract(rawQuery);
    const page = parsedQuery.page || 1;
    const rows = parsedQuery.rows || 10;
    const paginationMeta = buildPaginationMeta(page, rows, totalRows);

    return sendSuccess(res, processedTasks, paginationMeta);
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
    return sendError(
      res,
      'QUERY_ERROR',
      err.message || 'Failed to list tasks',
      [],
      500,
    );
  }
});

// GET /tasks/:id - Get single task
taskRouter.get('/:id', async (req, res) => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const task = await prisma.task.findFirst({
      where: { id, deleted_at: null },
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
        project: {
          include: {
            clients: true,
            members: true,
            tasks: {
              where: { deleted_at: null },
              select: { assignee_id: true },
            },
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
        prerequisites: {
          where: { deleted_at: null },
          include: {
            task: {
              select: { id: true, title: true, status: true, department: true },
            },
          },
        },
        attachments: {
          where: { deleted_at: null },
        },
        audit_logs: {
          orderBy: { created_at: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!task) {
      return sendError(res, 'NOT_FOUND', 'Task not found', [], 404);
    }

    // Client guest isolation check (IDOR Protection)
    if (user.role === Role.CLIENT_GUEST) {
      if (!task.client_visible) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access to this task is restricted',
          [],
          403,
        );
      }
      const isClientAssigned = task.project?.clients.some(
        (cl) => cl.user_id === user.id,
      );
      if (!isClientAssigned) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You do not have access to tasks in this project.',
          [],
          403,
        );
      }
      return sendSuccess(res, TaskService.maskTaskForClient(task));
    }

    // Internal Team Project Check
    if (user.role === Role.INTERNAL_TEAM) {
      const isAssigned =
        task.project?.members.some((m) => m.user_id === user.id) ||
        task.project?.tasks.some((t) => t.assignee_id === user.id);
      if (!isAssigned) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You are not assigned to this project.',
          [],
          403,
        );
      }
    }

    const depCheck = await TaskService.checkDependencies(task.id);

    return sendSuccess(res, {
      ...task,
      isBlocked: depCheck.isBlocked,
      pendingDependencies: depCheck.pendingPrerequisites,
    });
  } catch (err: any) {
    return sendError(res, 'SERVER_ERROR', err.message, [], 500);
  }
});

// POST /tasks - Create task (PM & Super Admin)
taskRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const validated = createTaskSchema.safeParse(req.body);

      if (!validated.success) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid task payload',
          validated.error.issues,
          400,
        );
      }

      const {
        project_id,
        title,
        description,
        department,
        assignee_id,
        client_visible,
        due_date,
      } = validated.data;

      const task = await prisma.task.create({
        data: {
          project_id,
          title,
          description,
          department,
          assignee_id,
          client_visible,
          due_date: due_date ? new Date(due_date) : null,
        },
        include: {
          assignee: { select: { id: true, name: true, department: true } },
        },
      });

      return sendSuccess(res, task, undefined, 201);
    } catch (err: any) {
      return sendError(res, 'CREATE_ERROR', err.message, [], 500);
    }
  },
);

// PATCH /tasks/:id - Update task (Optimistic locking + State-Based RBAC + Audit Log)
taskRouter.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    const validated = updateTaskSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid update payload',
        validated.error.issues,
        400,
      );
    }

    const updatedTask = await TaskService.updateTask(id, user, {
      ...validated.data,
      due_date: validated.data.due_date
        ? new Date(validated.data.due_date)
        : validated.data.due_date === null
          ? null
          : undefined,
    });

    return sendSuccess(res, updatedTask);
  } catch (err: any) {
    if (err instanceof TaskServiceError) {
      return sendError(
        res,
        err.code,
        err.message,
        err.details || [],
        err.statusCode as any,
      );
    }
    return sendError(res, 'UPDATE_ERROR', err.message, [], 500);
  }
});

// PATCH /tasks/:id/status - Dedicated status update endpoint
taskRouter.patch('/:id/status', async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    const updateStatusSchema = z.object({
      status: z.nativeEnum(TaskStatus),
      version: z
        .number()
        .int()
        .min(1, 'Version is required for concurrency control'),
    });

    const validated = updateStatusSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid status update payload',
        validated.error.issues,
        400,
      );
    }

    const updatedTask = await TaskService.updateTask(id, user, {
      status: validated.data.status,
      version: validated.data.version,
    });

    return sendSuccess(res, updatedTask);
  } catch (err: any) {
    if (err instanceof TaskServiceError) {
      return sendError(
        res,
        err.code,
        err.message,
        err.details || [],
        err.statusCode as any,
      );
    }
    return sendError(res, 'UPDATE_STATUS_ERROR', err.message, [], 500);
  }
});

// DELETE /tasks/:id - Soft delete (PM & Super Admin)
taskRouter.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const task = await prisma.task.findFirst({
        where: { id, deleted_at: null },
      });

      if (!task) {
        return sendError(res, 'NOT_FOUND', 'Task not found', [], 404);
      }

      await prisma.task.update({
        where: { id },
        data: { deleted_at: new Date() },
      });

      return sendSuccess(res, { message: 'Task soft deleted successfully' });
    } catch (err: any) {
      return sendError(res, 'DELETE_ERROR', err.message, [], 500);
    }
  },
);

// POST /tasks/:id/dependencies - Add dependency (PM & Super Admin)
taskRouter.post(
  '/:id/dependencies',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      if (!id) {
        return sendError(res, 'VALIDATION_ERROR', 'Task ID required', [], 400);
      }

      const validated = addDependencySchema.safeParse(req.body);

      if (!validated.success) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid prerequisite ID',
          validated.error.issues,
          400,
        );
      }

      const dep = await TaskService.addDependency(
        id,
        validated.data.prerequisite_id,
        user.id,
      );
      return sendSuccess(res, dep, undefined, 201);
    } catch (err: any) {
      if (err instanceof TaskServiceError) {
        return sendError(
          res,
          err.code,
          err.message,
          err.details || [],
          err.statusCode as any,
        );
      }
      return sendError(res, 'DEPENDENCY_ERROR', err.message, [], 500);
    }
  },
);

// DELETE /tasks/:id/dependencies/:prerequisite_id - Remove dependency (PM & Super Admin)
taskRouter.delete(
  '/:id/dependencies/:prerequisite_id',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const user = req.user!;
      const prerequisite_id = req.params.prerequisite_id as string;

      if (!id || !prerequisite_id) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Task ID and Prerequisite ID required',
          [],
          400,
        );
      }

      await TaskService.removeDependency(id, prerequisite_id, user.id);
      return sendSuccess(res, { message: 'Dependency removed successfully' });
    } catch (err: any) {
      return sendError(res, 'DELETE_DEPENDENCY_ERROR', err.message, [], 500);
    }
  },
);

// POST /tasks/:id/attachments - Upload attachment (Internal team / PM)
taskRouter.post('/:id/attachments', async (req, res) => {
  try {
    const id = req.params.id as string;
    const user = req.user!;

    if (user.role === Role.CLIENT_GUEST) {
      return sendError(
        res,
        'FORBIDDEN',
        'Client Guests cannot upload attachments',
        [],
        403,
      );
    }

    const task = await prisma.task.findFirst({
      where: { id, deleted_at: null },
      include: {
        project: {
          include: { members: true },
        },
      },
    });

    if (!task) {
      return sendError(res, 'NOT_FOUND', 'Task not found', [], 404);
    }

    if (user.role === Role.INTERNAL_TEAM) {
      const isAssignee = task.assignee_id === user.id;
      const isMember = task.project?.members.some((m) => m.user_id === user.id);
      if (!isAssignee && !isMember) {
        return sendError(
          res,
          'FORBIDDEN',
          'Access denied. You can only upload attachments to your assigned projects or tasks.',
          [],
          403,
        );
      }
    }

    const attachmentSchema = z.object({
      file_url: z.string().url(),
      file_name: z.string().min(1),
      file_size: z.number().int().positive(),
    });

    const validated = attachmentSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid attachment metadata',
        validated.error.issues,
        400,
      );
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        task_id: id,
        file_url: validated.data.file_url,
        file_name: validated.data.file_name,
        file_size: validated.data.file_size,
        uploaded_by: user.name,
      },
    });

    return sendSuccess(res, attachment, undefined, 201);
  } catch (err: any) {
    return sendError(res, 'ATTACHMENT_ERROR', err.message, [], 500);
  }
});
