import { NextResponse } from 'next/server';

import { fetchAiChat } from '@/lib/ai/connector';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const question = String(body.question || '').trim();
  if (!question) {
    return NextResponse.json({ ok: false, error: 'question is required' }, { status: 400 });
  }

  const result = await fetchAiChat({
    question,
    courseId: (body.courseId as string | number | null) ?? null,
    courseTitle: (body.courseTitle as string | null) ?? null,
    moduleId: (body.moduleId as string | number | null) ?? null,
    moduleTitle: (body.moduleTitle as string | null) ?? null,
    lessonId: (body.lessonId as string | number | null) ?? null,
    lessonTitle: (body.lessonTitle as string | null) ?? null,
    ownerCompanyId: (body.ownerCompanyId as string | number | null) ?? null,
    language: (body.language as string | null) ?? 'pt-BR',
    topK: body.topK != null ? Number(body.topK) : undefined,
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
