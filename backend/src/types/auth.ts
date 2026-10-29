import type { Department, Role } from '@prisma/client';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: Department;
  avatar_url: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}
