import { Department, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { sendError, sendSuccess } from '../utils/response.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name is required'),
  role: z.nativeEnum(Role),
  department: z.nativeEnum(Department),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /register
authRouter.post('/register', async (req, res) => {
  try {
    const validated = registerSchema.safeParse(req.body);

    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid registration payload',
        validated.error.issues,
        400,
      );
    }

    const { email, password, name, role, department } = validated.data;

    const existingUser = await prisma.user.findFirst({
      where: { email, deleted_at: null },
    });

    if (existingUser) {
      return sendError(
        res,
        'EMAIL_EXISTS',
        'Email is already registered',
        [],
        400,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        department,
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

    return sendSuccess(res, user, undefined, 201);
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error during registration',
      [],
      500,
    );
  }
});

// POST /login
authRouter.post('/login', async (req, res) => {
  try {
    const validated = loginSchema.safeParse(req.body);

    if (!validated.success) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Invalid login payload',
        validated.error.issues,
        400,
      );
    }

    const { email, password } = validated.data;

    const user = await prisma.user.findFirst({
      where: { email, deleted_at: null },
    });

    if (!user) {
      return sendError(
        res,
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        [],
        401,
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(
        res,
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        [],
        401,
      );
    }

    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as any,
    };

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      env.JWT_SECRET,
      signOptions,
    );

    // Set secure HttpOnly cookie (cross-site compatible in production)
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      avatar_url: user.avatar_url,
    };

    return sendSuccess(res, {
      user: userPayload,
      token,
    });
  } catch (err: any) {
    return sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      err.message || 'Error during login',
      [],
      500,
    );
  }
});

// GET /me
authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = req.user;
  return sendSuccess(res, user);
});

// POST /logout
authRouter.post('/logout', async (_req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('auth_token', {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
  return sendSuccess(res, { message: 'Logged out successfully' });
});
