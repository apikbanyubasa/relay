import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z
    .union([z.string(), z.number()])
    .default('4000')
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10))),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn(
    '⚠️ [WARNING] Some environment variables are missing or invalid:',
  );
  console.warn(JSON.stringify(parsed.error.format(), null, 2));
}

export const env = parsed.success
  ? parsed.data
  : {
      PORT: 4000,
      DATABASE_URL: process.env.DATABASE_URL || '',
      JWT_SECRET:
        process.env.JWT_SECRET || 'fallback-secret-for-diagnostics-relay-2026',
      JWT_EXPIRES_IN: '7d',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    };

export const isEnvValid = parsed.success;
export const envErrors = parsed.success ? null : parsed.error.format();
