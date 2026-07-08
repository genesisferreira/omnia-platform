import { checkDatabaseConnection } from '@omnia/database';
import { NextResponse } from 'next/server';

export async function GET() {
  const dbHealthy = await checkDatabaseConnection();

  const status = dbHealthy ? 'healthy' : 'degraded';
  const httpStatus = dbHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      service: '@omnia/admin',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'up' : 'down',
        payload: 'configured',
      },
    },
    { status: httpStatus },
  );
}
