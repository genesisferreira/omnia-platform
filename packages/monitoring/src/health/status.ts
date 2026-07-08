import { checkDatabaseConnection } from '@omnia/database';
import { createConnection } from 'node:net';

export type ServiceStatus = 'connected' | 'ready' | 'pending' | 'not_applicable';

export interface PlatformStatus {
  status: 'ok' | 'degraded';
  version: string;
  environment: string;
  database: ServiceStatus;
  redis: ServiceStatus;
  storage: ServiceStatus;
  payload: ServiceStatus;
  n8n: ServiceStatus;
  timestamp: string;
}

export interface StatusOptions {
  version?: string;
  includePayload?: boolean;
}

const DEFAULT_VERSION = '0.2.0';

async function checkRedis(): Promise<ServiceStatus> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  try {
    const parsed = new URL(redisUrl.replace('redis://', 'http://'));
    const host = parsed.hostname || 'localhost';
    const port = Number(parsed.port) || 6379;

    return await new Promise<ServiceStatus>((resolve) => {
      const socket = createConnection({ host, port }, () => {
        socket.end();
        resolve('connected');
      });

      socket.setTimeout(3000, () => {
        socket.destroy();
        resolve('pending');
      });

      socket.on('error', () => resolve('pending'));
    });
  } catch {
    return 'pending';
  }
}

async function checkHttp(url: string): Promise<ServiceStatus> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok ? 'connected' : 'pending';
  } catch {
    return 'pending';
  }
}

async function checkStorage(): Promise<ServiceStatus> {
  const endpoint = process.env.MINIO_ENDPOINT ?? 'localhost';
  const port = process.env.MINIO_PORT ?? '9000';
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  return checkHttp(`${protocol}://${endpoint}:${port}/minio/health/live`);
}

async function checkN8n(): Promise<ServiceStatus> {
  const host = process.env.N8N_HOST ?? 'localhost';
  const port = process.env.N8N_PORT ?? '5678';
  const protocol = process.env.N8N_PROTOCOL ?? 'http';
  const result = await checkHttp(`${protocol}://${host}:${port}/healthz`);
  return result === 'connected' ? 'ready' : 'pending';
}

async function checkPayload(): Promise<ServiceStatus> {
  const hasSecret = Boolean(process.env.PAYLOAD_SECRET && process.env.PAYLOAD_SECRET.length >= 32);
  const dbConnected = await checkDatabaseConnection();
  return hasSecret && dbConnected ? 'ready' : 'pending';
}

/**
 * Coleta status global da plataforma.
 * Portal (web) deve usar `includePayload: false`.
 * Admin deve usar `includePayload: true`.
 */
export async function getPlatformStatus(options: StatusOptions = {}): Promise<PlatformStatus> {
  const version = options.version ?? process.env.APP_VERSION ?? DEFAULT_VERSION;
  const environment = process.env.NODE_ENV ?? 'development';
  const includePayload = options.includePayload ?? false;

  const [database, redis, storage, n8n, payload] = await Promise.all([
    checkDatabaseConnection().then((ok) => (ok ? 'connected' : 'pending') as ServiceStatus),
    checkRedis(),
    checkStorage(),
    checkN8n(),
    includePayload ? checkPayload() : Promise.resolve('not_applicable' as ServiceStatus),
  ]);

  const payloadStatus: ServiceStatus = includePayload ? payload : 'not_applicable';

  const allCriticalUp =
    database === 'connected' &&
    redis === 'connected' &&
    storage === 'connected' &&
    (!includePayload || payloadStatus === 'ready');

  return {
    status: allCriticalUp ? 'ok' : 'degraded',
    version,
    environment,
    database,
    redis,
    storage,
    payload: payloadStatus,
    n8n: n8n === 'connected' ? 'ready' : 'pending',
    timestamp: new Date().toISOString(),
  };
}
