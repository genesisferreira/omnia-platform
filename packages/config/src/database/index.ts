import { z } from 'zod';

export const databaseConfigSchema = z.object({
  url: z
    .string()
    .min(1)
    .default('postgresql://omnia:omnia_dev_password@localhost:5432/omnia_platform'),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

export function loadDatabaseConfig(
  env: Record<string, string | undefined> = process.env,
): DatabaseConfig {
  return databaseConfigSchema.parse({
    url: env.DATABASE_URL,
  });
}
