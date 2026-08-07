import { NextResponse } from 'next/server';

import { fetchTutorChat } from '@/lib/ai/connector';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const question = String(body.question || '').trim();
  const courseId = body.courseId;
  if (!question) {
    return NextResponse.json({ ok: false, error: 'question is required' }, { status: 400 });
  }
  if (courseId == null || courseId === '') {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 });
  }

  const result = await fetchTutorChat({
    question,
    sessionId: (body.sessionId as string | number | null) ?? null,
    courseId: courseId as string | number,
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
