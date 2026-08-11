import { NextResponse } from 'next/server';

import { fetchAdaptiveNext } from '@/lib/ai/connector';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 });
  }
  const result = await fetchAdaptiveNext(courseId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 502 });
  }
  return NextResponse.json(result.data);
}
