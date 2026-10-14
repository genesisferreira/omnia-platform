import { NextResponse } from 'next/server';

import { requestDeviceAccess } from '@/lib/auth/device';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Solicitação de liberação do dispositivo atual (com justificativa). */
export async function POST(request: Request) {
  const session = await getSessionToken();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  try {
    const r = await requestDeviceAccess(session, body?.reason);
    return NextResponse.json(r.data ?? { ok: false }, {
      status: r.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'DEVICE_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
