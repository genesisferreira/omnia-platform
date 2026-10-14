import { NextResponse } from 'next/server';

import { isWellFormedDeviceToken } from '@omnia/shared';

import { registerDeviceForSession, setDeviceCookie } from '@/lib/auth/device';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Registra (ou reconhece) este navegador após autenticação válida. Token nunca é logado. */
export async function POST(request: Request) {
  const session = await getSessionToken();
  if (!session) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const r = await registerDeviceForSession(session, request.headers.get('user-agent'));
    const data = r.data ?? {};
    const response = NextResponse.json(
      {
        ok: r.status === 200,
        state: data.state ?? null,
        error: r.status === 200 ? undefined : data.error,
      },
      { status: r.status, headers: { 'Cache-Control': 'no-store' } },
    );
    if (isWellFormedDeviceToken(data.deviceToken)) setDeviceCookie(response, data.deviceToken);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'DEVICE_SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
