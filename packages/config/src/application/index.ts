import { z } from 'zod';

export const applicationConfigSchema = z.object({
  version: z.string().default('0.3.0'),
  publicUrl: z.string().url().default('http://localhost:3000'),
  adminUrl: z.string().url().default('http://localhost:3001'),
});

export type ApplicationConfig = z.infer<typeof applicationConfigSchema>;

export function loadApplicationConfig(
  env: Record<string, string | undefined> = process.env,
): ApplicationConfig {
  return applicationConfigSchema.parse({
    version: env.APP_VERSION,
    publicUrl: env.NEXT_PUBLIC_APP_URL,
    adminUrl: env.NEXT_PUBLIC_ADMIN_URL,
  });
}
