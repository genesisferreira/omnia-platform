import { NextResponse } from 'next/server';

import { buildUserAiContext } from '@/lib/ai/user-ai-context';
import { fetchMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const me = await fetchMe(token);
  if (!me.ok) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = new URL(request.url);
  const route = url.searchParams.get('route');
  const area = url.searchParams.get('area');

  const context = buildUserAiContext(me.data, {
    currentRoute: route,
    currentPortalArea: area,
  });

  return NextResponse.json(
    { ok: true, data: context },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
