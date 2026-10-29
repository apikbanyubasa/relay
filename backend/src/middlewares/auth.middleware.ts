import type { Department, Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import type { AuthUser } from '../types/auth.js';
import { sendError } from '../utils/response.js';

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: Role;
  department: Department;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let token: string | undefined;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Check cookie if not in header
    if (!token && req.cookies) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return sendError(
        res,
        'UNAUTHORIZED',
        'Authentication token missing or invalid',
        [],
        401,
      );
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar_url: true,
      },
    });

    if (!user) {
      return sendError(
        res,
        'USER_NOT_FOUND',
        'User account does not exist or has been disabled',
        [],
        401,
      );
    }

    req.user = user as AuthUser;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return sendError(
        res,
        'TOKEN_EXPIRED',
        'Authentication token has expired',
        [],
        401,
      );
    }
    return sendError(
      res,
      'INVALID_TOKEN',
      'Failed to authenticate token',
      [],
      401,
    );
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required', [], 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return sendError(
        res,
        'FORBIDDEN',
        `Access denied. Role ${user.role} does not have required permissions.`,
        [],
        403,
      );
    }

    next();
  };
}
