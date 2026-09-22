import { NextResponse } from 'next/server';

import { fetchTutorChat } from '@/lib/ai/connector';
import { gateAuthenticatedAiRequest, requirePortalSession } from '@/lib/auth/ai-auth-gate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await requirePortalSession();
  if (!session.ok) return session.response;

  let body: Record<string, unknown>;
  let jsonValid = true;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    jsonValid = false;
    body = {};
  }

  const gate = gateAuthenticatedAiRequest({
    hasSession: true,
    jsonValid,
    requireQuestion: true,
    question: jsonValid ? String(body.question || '') : null,
    requireCourseId: true,
    courseId: jsonValid ? (body.courseId as string | number | null) : null,
  });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const result = await fetchTutorChat({
    question: String(body.question || '').trim(),
    sessionId: (body.sessionId as string | number | null) ?? null,
    courseId: body.courseId as string | number,
    courseTitle: (body.courseTitle as string | null) ?? null,
    moduleId: (body.moduleId as string | number | null) ?? null,
    moduleTitle: (body.moduleTitle as string | null) ?? null,
    lessonId: (body.lessonId as string | number | null) ?? null,
    lessonTitle: (body.lessonTitle as string | null) ?? null,
    lessonObjectives: (body.lessonObjectives as string | null) ?? null,
    ownerCompanyId: (body.ownerCompanyId as string | number | null) ?? null,
    language: (body.language as string | null) ?? 'pt-BR',
    requestStudyPlan: Boolean(body.requestStudyPlan),
    objective: (body.objective as string | null) ?? null,
    schoolKey: typeof body.schoolKey === 'string' ? body.schoolKey : null,
    officialAssessmentActive: body.officialAssessmentActive === true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, data: result.data },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
