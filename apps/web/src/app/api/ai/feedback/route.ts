import { NextResponse } from 'next/server';

import { fetchAiFeedback } from '@/lib/ai/connector';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const sessionId = body.sessionId as string | number | undefined;
  const rating = String(body.rating || '');
  if (sessionId == null || (rating !== 'up' && rating !== 'down')) {
    return NextResponse.json(
      { ok: false, error: 'sessionId and rating(up|down) required' },
      { status: 400 },
    );
  }

  const result = await fetchAiFeedback({
    sessionId,
    rating,
    comment: body.comment != null ? String(body.comment) : undefined,
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
