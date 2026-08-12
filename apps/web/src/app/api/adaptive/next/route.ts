import { NextResponse } from 'next/server';

import { fetchAdaptiveNext } from '@/lib/ai/connector';
import { gateAuthenticatedAiRequest, requirePortalSession } from '@/lib/auth/ai-auth-gate';

export async function GET(request: Request) {
  const session = await requirePortalSession();
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  const gate = gateAuthenticatedAiRequest({
    hasSession: true,
    requireCourseId: true,
    courseId,
  });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const result = await fetchAdaptiveNext(courseId!);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result.data);
}
