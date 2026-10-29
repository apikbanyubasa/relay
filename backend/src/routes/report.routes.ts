import { Department, Role, TaskStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
import { sendError, sendSuccess } from '../utils/response.js';

export const reportRouter = Router();

reportRouter.use(authMiddleware);
reportRouter.use(
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER, Role.INTERNAL_TEAM),
);

// GET /reports/standup-summary?project_id=...&date=YYYY-MM-DD
reportRouter.get('/standup-summary', async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const queryDate = req.query.date as string | undefined;
    const targetDateStr = queryDate || new Date().toISOString().split('T')[0]!;

    const targetDate = new Date(targetDateStr);
    const yesterdayStart = new Date(targetDate);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    // 1. Audit logs: status changed to DONE yesterday
    const completedAuditLogs = await prisma.auditLog.findMany({
      where: {
        changed_column: 'status',
        new_value: TaskStatus.DONE,
        created_at: {
          gte: yesterdayStart,
          lte: new Date(), // Up to now
        },
        task: {
          ...(projectId ? { project_id: projectId } : {}),
          deleted_at: null,
        },
      },
      include: {
        task: true,
        user: { select: { id: true, name: true, department: true } },
      },
    });

    // 2. Find currently blocked tasks
    const activeTasks = await prisma.task.findMany({
      where: {
        status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        deleted_at: null,
        ...(projectId ? { project_id: projectId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true } },
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

    const departmentsList = [
      Department.PRODUCT,
      Department.UI_UX,
      Department.FRONTEND,
      Department.BACKEND,
    ];

    const departmentsReport: Record<
      string,
      {
        completed_yesterday: Array<{
          taskId: string;
          title: string;
          completedBy: string;
          completedAt: Date;
        }>;
        blocked_today: Array<{
          taskId: string;
          title: string;
          assignee: string | null;
          blockedBy: string[];
        }>;
      }
    > = {};

    departmentsList.forEach((dep) => {
      departmentsReport[dep] = {
        completed_yesterday: [],
        blocked_today: [],
      };
    });

    // Populate completed
    completedAuditLogs.forEach((log) => {
      const dep = log.task.department;
      if (departmentsReport[dep]) {
        departmentsReport[dep].completed_yesterday.push({
          taskId: log.task_id,
          title: log.task.title,
          completedBy: log.user.name,
          completedAt: log.created_at,
        });
      }
    });

    // Populate blocked
    activeTasks.forEach((task) => {
      const pendingDeps = task.dependencies.filter(
        (d) => d.prerequisite.status !== TaskStatus.DONE,
      );
      if (pendingDeps.length > 0) {
        const dep = task.department;
        if (departmentsReport[dep]) {
          departmentsReport[dep].blocked_today.push({
            taskId: task.id,
            title: task.title,
            assignee: task.assignee?.name || null,
            blockedBy: pendingDeps.map(
              (d) => `${d.prerequisite.title} (${d.prerequisite.status})`,
            ),
          });
        }
      }
    });

    return sendSuccess(res, {
      date: targetDateStr,
      project_id: projectId || 'ALL_PROJECTS',
      summary: departmentsReport,
    });
  } catch (err: any) {
    return sendError(res, 'REPORT_ERROR', err.message, [], 500);
  }
});
