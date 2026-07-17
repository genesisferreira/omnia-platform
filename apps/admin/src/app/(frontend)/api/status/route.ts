import { headers as getHeaders } from 'next/headers';
import { getPlatformStatus } from '@omnia/monitoring';
import { getPayload } from 'payload';
import { NextResponse } from 'next/server';

import config from '@payload-config';

import { hasStaffAccess } from '@/access/rbac';

/**
 * Status detalhado — somente para sessão staff autenticada.
 * Visitantes recebem 401 sem detalhes de infraestrutura.
 */
export async function GET() {
  const headersList = await getHeaders();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: headersList });

  if (!hasStaffAccess(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = await getPlatformStatus({ includePayload: true });

  return NextResponse.json(
    {
      status: platform.status === 'ok' ? 'ok' : 'degraded',
      version: platform.version,
      environment: platform.environment,
      database: platform.database,
      redis: platform.redis,
      storage: platform.storage,
      payload: platform.payload,
      n8n: platform.n8n,
      service: '@omnia/admin',
      timestamp: platform.timestamp,
    },
    { status: platform.status === 'ok' ? 200 : 503 },
  );
}
