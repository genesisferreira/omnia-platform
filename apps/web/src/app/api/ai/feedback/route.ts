import { NextResponse } from 'next/server';

import { fetchAiFeedback } from '@/lib/ai/connector';
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
    requireFeedback: true,
    sessionId: jsonValid ? (body.sessionId as string | number | null) : null,
    rating: jsonValid ? String(body.rating || '') : null,
  });
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const result = await fetchAiFeedback({
    sessionId: body.sessionId as string | number,
    rating: String(body.rating) as 'up' | 'down',
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
