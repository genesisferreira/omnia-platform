import { NextResponse } from 'next/server';

import { fetchDeviceStatus } from '@/lib/auth/device';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionToken();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  const status = await fetchDeviceStatus(session);
  if (!status)
    return NextResponse.json({ ok: false, error: 'DEVICE_SERVICE_UNAVAILABLE' }, { status: 503 });
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
