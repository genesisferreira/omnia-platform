import { NextResponse } from 'next/server';

import { buildUserAiContext } from '@/lib/ai/user-ai-context';
import { fetchAcademic } from '@/lib/academic/client';
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

  let schoolKey: string | null = null;
  let schoolName: string | null = null;
  const academicArea =
    area === 'student' ||
    area === 'teacher' ||
    area === 'onboarding' ||
    (route || '').startsWith('/aluno') ||
    (route || '').startsWith('/professor');
  if (academicArea) {
    const ils = await fetchAcademic<{
      context?: { schoolKey?: string | null; schoolName?: string | null };
    }>('ils/context', { user: me.data });
    if (ils.ok) {
      schoolKey = ils.data.context?.schoolKey ?? null;
      schoolName = ils.data.context?.schoolName ?? null;
    }
  }

  const context = buildUserAiContext(me.data, {
    currentRoute: route,
    currentPortalArea: area,
    schoolKey,
    schoolName,
  });

  return NextResponse.json(
    { ok: true, data: context },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
