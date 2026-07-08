import { getPlatformStatus } from '@omnia/monitoring';
import { NextResponse } from 'next/server';

export async function GET() {
  const platform = await getPlatformStatus({ includePayload: false });

  const response = {
    status: platform.status === 'ok' ? 'ok' : 'degraded',
    version: platform.version,
    environment: platform.environment,
    database: platform.database,
    redis: platform.redis,
    storage: platform.storage,
    payload: 'not_applicable',
    n8n: platform.n8n,
    service: '@omnia/web',
    timestamp: platform.timestamp,
  };

  return NextResponse.json(response, {
    status: platform.status === 'ok' ? 200 : 503,
  });
}
