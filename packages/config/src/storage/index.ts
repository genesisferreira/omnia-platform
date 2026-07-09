import { z } from 'zod';

export const storageConfigSchema = z.object({
  endpoint: z.string().default('localhost'),
  port: z.coerce.number().default(9000),
  accessKey: z.string().default('omnia_minio'),
  secretKey: z.string().default('omnia_minio_secret'),
  bucket: z.string().default('omnia-media'),
  useSsl: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => v === true || v === 'true')
    .default(false),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;

export function loadStorageConfig(
  env: Record<string, string | undefined> = process.env,
): StorageConfig {
  return storageConfigSchema.parse({
    endpoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    bucket: env.MINIO_BUCKET,
    useSsl: env.MINIO_USE_SSL,
  });
}

/** URL base do MinIO para integracao futura com Payload S3 adapter */
export function getMinioEndpoint(config: StorageConfig): string {
  const protocol = config.useSsl ? 'https' : 'http';
  return `${protocol}://${config.endpoint}:${config.port}`;
}
