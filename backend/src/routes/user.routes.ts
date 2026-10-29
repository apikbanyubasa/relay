import { Department, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware.js';
import {
  buildPaginationMeta,
  sendError,
  sendSuccess,
} from '../utils/response.js';

export const userRouter = Router();

// Validation Schemas
const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  avatar_url: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().trim().min(2, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(Role),
  department: z.nativeEnum(Department),
  avatar_url: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.nativeEnum(Role).optional(),
  department: z.nativeEnum(Department).optional(),
  avatar_url: z
    .string()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
});

const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// All user routes require authentication
userRouter.use(authMiddleware);

// ==========================================
// 1. SELF-SERVICE PROFILE SETTINGS (All Users)
// ==========================================

// GET /api/users/profile - Get current user profile
userRouter.get('/profile', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user!.id, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return sendError(
        res,
        'USER_NOT_FOUND',
        'User profile not found',
        [],
        404,
      );
    }

    return sendSuccess(res, user);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error fetching user profile',
      [],
      500,
    );
  }
});

// PATCH /api/users/profile - Update current user profile (name, avatar)
userRouter.patch('/profile', async (req, res) => {
  try {
    const validated = updateProfileSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid profile data',
        validated.error.issues,
        400,
      );
    }

    const { name, avatar_url } = validated.data;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name,
        avatar_url: avatar_url === '' ? null : avatar_url,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar_url: true,
        updated_at: true,
      },
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error updating profile',
      [],
      500,
    );
  }
});

// PUT /api/users/change-password - Change current user password
userRouter.put('/change-password', async (req, res) => {
  try {
    const validated = changePasswordSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid password payload',
        validated.error.issues,
        400,
      );
    }

    const { oldPassword, newPassword } = validated.data;

    const user = await prisma.user.findFirst({
      where: { id: req.user!.id, deleted_at: null },
    });

    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User not found', [], 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return sendError(
        res,
        'INVALID_PASSWORD',
        'Current password does not match',
        [],
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return sendSuccess(res, {
      message: 'Password successfully updated',
    });
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error changing password',
      [],
      500,
    );
  }
});

// ==========================================
// 2. ASSIGNEES & USER MANAGEMENT CRUD
// ==========================================

// GET /api/users/assignees - List eligible assignees (PM, Super Admin, and Internal Team)
userRouter.get(
  '/assignees',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER, Role.INTERNAL_TEAM),
  async (req, res) => {
    try {
      const department = req.query.department as Department | undefined;
      const where: any = {
        deleted_at: null,
        role: {
          in: [Role.INTERNAL_TEAM, Role.PRODUCT_MANAGER, Role.SUPER_ADMIN],
        },
      };

      if (department && Object.values(Department).includes(department)) {
        where.department = department;
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          avatar_url: true,
        },
      });

      return sendSuccess(res, users);
    } catch (err: any) {
      return sendError(
        res,
        'INTERNAL_SERVER_ERROR',
        err.message || 'Error fetching assignees',
        [],
        500,
      );
    }
  },
);

// GET /api/users/clients - List eligible Client Guests (PM & Super Admin)
userRouter.get(
  '/clients',
  requireRole(Role.SUPER_ADMIN, Role.PRODUCT_MANAGER),
  async (_req, res) => {
    try {
      const clients = await prisma.user.findMany({
        where: {
          role: Role.CLIENT_GUEST,
          deleted_at: null,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          avatar_url: true,
        },
      });

      return sendSuccess(res, clients);
    } catch (err: any) {
      return sendError(
        res,
        'INTERNAL_SERVER_ERROR',
        err.message || 'Error fetching client guests',
        [],
        500,
      );
    }
  },
);

// GET /api/users - List all users with filtering and pagination
userRouter.get('/', requireRole(Role.SUPER_ADMIN), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 10),
    );
    const skip = (page - 1) * limit;

    const search = (req.query.search as string)?.trim();
    const role = req.query.role as Role | undefined;
    const department = req.query.department as Department | undefined;

    const where: any = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && Object.values(Role).includes(role)) {
      where.role = role;
    }

    if (department && Object.values(Department).includes(department)) {
      where.department = department;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          avatar_url: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              assigned_tasks: true,
              member_projects: true,
              client_projects: true,
            },
          },
        },
      }),
    ]);

    const meta = buildPaginationMeta(page, limit, total);
    return sendSuccess(res, users, meta);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error listing users',
      [],
      500,
    );
  }
});

// POST /api/users - Create new user (Super Admin)
userRouter.post('/', requireRole(Role.SUPER_ADMIN), async (req, res) => {
  try {
    const validated = createUserSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid user creation payload',
        validated.error.issues,
        400,
      );
    }

    const { email, name, password, role, department, avatar_url } =
      validated.data;

    const existingUser = await prisma.user.findFirst({
      where: { email, deleted_at: null },
    });

    if (existingUser) {
      return sendError(
        res,
        'EMAIL_EXISTS',
        'User with this email already exists',
        [],
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
          department,
          avatar_url: avatar_url || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          avatar_url: true,
          created_at: true,
        },
      });

      // Auto-enroll internal engineer to all currently active projects
      if (role === Role.INTERNAL_TEAM) {
        const activeProjects = await tx.project.findMany({
          where: { deleted_at: null },
          select: { id: true },
        });

        if (activeProjects.length > 0) {
          await tx.projectMember.createMany({
            data: activeProjects.map((p) => ({
              project_id: p.id,
              user_id: newUser.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      return newUser;
    });

    return sendSuccess(res, user, undefined, 201);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error creating user',
      [],
      500,
    );
  }
});

// GET /api/users/:id - Get single user details
userRouter.get('/:id', requireRole(Role.SUPER_ADMIN), async (req, res) => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            assigned_tasks: true,
            member_projects: true,
            client_projects: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User not found', [], 404);
    }

    return sendSuccess(res, user);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error fetching user',
      [],
      500,
    );
  }
});

// PATCH /api/users/:id - Update existing user
userRouter.patch('/:id', requireRole(Role.SUPER_ADMIN), async (req, res) => {
  try {
    const id = req.params.id as string;
    const validated = updateUserSchema.safeParse(req.body);
    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid update payload',
        validated.error.issues,
        400,
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!targetUser) {
      return sendError(res, 'USER_NOT_FOUND', 'User not found', [], 404);
    }

    // Guard: Prevent demoting yourself if you are the only Super Admin
    if (
      req.user!.id === id &&
      validated.data.role &&
      validated.data.role !== Role.SUPER_ADMIN
    ) {
      const superAdminCount = await prisma.user.count({
        where: { role: Role.SUPER_ADMIN, deleted_at: null },
      });
      if (superAdminCount <= 1) {
        return sendError(
          res,
          'ACTION_FORBIDDEN',
          'Cannot demote the only remaining Super Admin account',
          [],
          400,
        );
      }
    }

    // Check unique email if email changed
    if (validated.data.email && validated.data.email !== targetUser.email) {
      const emailConflict = await prisma.user.findFirst({
        where: {
          email: validated.data.email,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (emailConflict) {
        return sendError(
          res,
          'EMAIL_EXISTS',
          'Email address is already in use by another user',
          [],
          400,
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(validated.data.name ? { name: validated.data.name } : {}),
        ...(validated.data.email ? { email: validated.data.email } : {}),
        ...(validated.data.role ? { role: validated.data.role } : {}),
        ...(validated.data.department
          ? { department: validated.data.department }
          : {}),
        ...(validated.data.avatar_url !== undefined
          ? {
              avatar_url:
                validated.data.avatar_url === ''
                  ? null
                  : validated.data.avatar_url,
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
      },
    });

    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error updating user',
      [],
      500,
    );
  }
});

// DELETE /api/users/:id - Soft-delete user
userRouter.delete('/:id', requireRole(Role.SUPER_ADMIN), async (req, res) => {
  try {
    const id = req.params.id as string;

    // Guard: Prevent deleting own account
    if (req.user!.id === id) {
      return sendError(
        res,
        'CANNOT_DELETE_SELF',
        'You cannot delete your own Super Admin account',
        [],
        400,
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!targetUser) {
      return sendError(
        res,
        'USER_NOT_FOUND',
        'User not found or already deleted',
        [],
        404,
      );
    }

    // Guard: If deleting a Super Admin, verify there is at least one other active Super Admin
    if (targetUser.role === Role.SUPER_ADMIN) {
      const superAdminCount = await prisma.user.count({
        where: { role: Role.SUPER_ADMIN, deleted_at: null },
      });
      if (superAdminCount <= 1) {
        return sendError(
          res,
          'ACTION_FORBIDDEN',
          'Cannot delete the only remaining Super Admin account',
          [],
          400,
        );
      }
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return sendSuccess(res, {
      message: `User ${targetUser.name} (${targetUser.email}) deactivated successfully`,
    });
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error deleting user',
      [],
      500,
    );
  }
});

// POST /api/users/:id/reset-password - Admin reset password for any user
userRouter.post(
  '/:id/reset-password',
  requireRole(Role.SUPER_ADMIN),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const validated = adminResetPasswordSchema.safeParse(req.body);
      if (!validated.success) {
        return sendError(
          res,
          'VALIDATION_ERROR',
          'Invalid password payload',
          validated.error.issues,
          400,
        );
      }

      const user = await prisma.user.findFirst({
        where: { id, deleted_at: null },
      });

      if (!user) {
        return sendError(res, 'USER_NOT_FOUND', 'User not found', [], 404);
      }

      const hashedPassword = await bcrypt.hash(validated.data.newPassword, 10);

      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      return sendSuccess(res, {
        message: `Password for ${user.name} was successfully reset`,
      });
    } catch (err: any) {
      return sendError(
        res,
        'INTERNAL_SERVER_ERROR',
        err.message || 'Error resetting password',
        [],
        500,
      );
    }
  },
);
