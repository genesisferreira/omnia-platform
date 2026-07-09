import { z } from 'zod';

export const payloadConfigSchema = z.object({
  secret: z.string().min(16).default('development-secret-change-in-production'),
});

export type PayloadConfig = z.infer<typeof payloadConfigSchema>;

export function loadPayloadConfig(
  env: Record<string, string | undefined> = process.env,
): PayloadConfig {
  return payloadConfigSchema.parse({
    secret: env.PAYLOAD_SECRET,
  });
}
