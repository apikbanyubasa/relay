import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { env } from './config/env.js';
import { auditRouter } from './routes/audit.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { taskRouter } from './routes/task.routes.js';
import { userRouter } from './routes/user.routes.js';
import { sendError, sendSuccess } from './utils/response.js';

export const app = express();

// Global Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost, vercel deployments, or configured CORS_ORIGIN
      if (
        !origin ||
        origin.includes('localhost') ||
        origin.includes('vercel.app') ||
        origin === env.CORS_ORIGIN
      ) {
        callback(null, true);
      } else {
        callback(null, env.CORS_ORIGIN);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length'],
    maxAge: 600,
  }),
);

// Welcome / Root Route
app.get('/', (_req: Request, res: Response) => {
  return sendSuccess(res, {
    name: 'Relay Task Engine API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
    env_status: {
      database_configured: Boolean(process.env.DATABASE_URL),
      jwt_configured: Boolean(process.env.JWT_SECRET),
    },
    available_endpoints: [
      'GET  /health',
      'POST /api/auth/login',
      'GET  /api/projects',
      'GET  /api/tasks',
      'GET  /api/reports/standup-summary',
      'GET  /api/audit-logs',
    ],
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env_status: {
      database_configured: Boolean(process.env.DATABASE_URL),
      jwt_configured: Boolean(process.env.JWT_SECRET),
    },
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/reports', reportRouter);
app.use('/api/users', userRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  return sendError(
    res,
    'NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found`,
    [],
    404,
  );
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    err.message || 'An unexpected error occurred',
    [],
    500,
  );
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(
      `🚀 Relay Task Engine API running on http://localhost:${env.PORT}`,
    );
  });
}

export default app;
