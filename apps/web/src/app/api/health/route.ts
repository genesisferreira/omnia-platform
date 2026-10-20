import { checkDatabaseConnection } from '@omnia/database';
import { NextResponse } from 'next/server';

export async function GET() {
  const dbHealthy = await checkDatabaseConnection();

  const status = dbHealthy ? 'healthy' : 'degraded';
  const httpStatus = dbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      service: '@omnia/web',
      timestamp: new Date().toISOString(),
      gitSha: process.env.GIT_SHA || process.env.APP_VERSION || null,
      checks: {
        database: dbHealthy ? 'up' : 'down',
      },
    },
    { status: httpStatus },
  );
}
