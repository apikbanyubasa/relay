import { Role } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
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

export const auditRouter = Router();

auditRouter.use(authMiddleware);

// PM, Super Admin, and Internal Team can access audit logs. Client Guest is forbidden.
auditRouter.use(
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER, Role.INTERNAL_TEAM),
);

// GET /audit-logs - List audit logs with ezfilter query contract
auditRouter.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const rawQuery = req.query as Record<string, any>;

    // Internal Team only sees audit logs for tasks in projects they participate in
    const additionalWhere: any = {};
    if (user.role === Role.INTERNAL_TEAM) {
      additionalWhere.task = {
        project: {
          OR: [
            { members: { some: { user_id: user.id } } },
            { tasks: { some: { assignee_id: user.id, deleted_at: null } } },
          ],
        },
      };
    }

    const prismaQuery = buildPrismaQuery(rawQuery, additionalWhere, {
      userRole: user.role,
      includeDeleted:
        rawQuery.includeDeleted === 'true' || rawQuery.includeDeleted === '1',
    });

    const totalRows = await prisma.auditLog.count({
      where: prismaQuery.where,
    });

    const logs = await prisma.auditLog.findMany({
      where: prismaQuery.where,
      orderBy: prismaQuery.orderBy || { created_at: 'desc' },
      take: prismaQuery.take,
      skip: prismaQuery.skip,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
          },
        },
        task: {
          select: { id: true, title: true, department: true, project_id: true },
        },
      },
    });

    const parsedQuery = parseQueryContract(rawQuery);
    const page = parsedQuery.page || 1;
    const rows = parsedQuery.rows || 10;
    const paginationMeta = buildPaginationMeta(page, rows, totalRows);

    return sendSuccess(res, logs, paginationMeta);
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
    return sendError(res, 'AUDIT_QUERY_ERROR', err.message, [], 500);
  }
});
