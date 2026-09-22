import { NextResponse } from 'next/server';

import { fetchSipMotivation } from '@/lib/ai/connector';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const courseId = body?.courseId;
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 });
  }
  const goals = Array.isArray(body.goals) ? body.goals.map(String) : [];
  const result = await fetchSipMotivation({
    courseId,
    goals,
    notes: body.notes != null ? String(body.notes) : null,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result.data);
}
