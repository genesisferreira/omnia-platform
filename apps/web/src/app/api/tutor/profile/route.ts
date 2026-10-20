import { NextResponse } from 'next/server';

import { fetchTutorProfile } from '@/lib/ai/connector';
import { gateAuthenticatedAiRequest, requirePortalSession } from '@/lib/auth/ai-auth-gate';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requirePortalSession();
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId');
  const gate = gateAuthenticatedAiRequest({
    hasSession: true,
    requireCourseId: true,
    courseId,
  });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const result = await fetchTutorProfile(courseId!);
  return NextResponse.json(
    result.ok ? result.data : { ok: false, error: result.error, data: result.data },
    {
      status: result.ok ? 200 : result.status,
    },
  );
}
