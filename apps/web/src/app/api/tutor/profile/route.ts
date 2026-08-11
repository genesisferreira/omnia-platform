import { NextResponse } from 'next/server';

import { fetchTutorProfile } from '@/lib/ai/connector';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId');
  if (!courseId) {
    return NextResponse.json({ ok: false, error: 'courseId is required' }, { status: 400 });
  }
  const result = await fetchTutorProfile(courseId);
  return NextResponse.json(
    result.ok ? result.data : { ok: false, error: result.error, data: result.data },
    {
      status: result.ok ? 200 : result.status,
    },
  );
}
