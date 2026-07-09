import { z } from 'zod';

export const environmentSchema = z.enum(['development', 'staging', 'production']);

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function parseEnvironment(value: string | undefined): AppEnvironment {
  const parsed = environmentSchema.safeParse(value);
  return parsed.success ? parsed.data : 'development';
}

export function isProduction(env: AppEnvironment): boolean {
  return env === 'production';
}

export function isDevelopment(env: AppEnvironment): boolean {
  return env === 'development';
}
