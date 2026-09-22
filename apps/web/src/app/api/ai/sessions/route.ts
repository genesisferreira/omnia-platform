import { NextResponse } from 'next/server';

import { fetchAiSessions } from '@/lib/ai/connector';
import { requirePortalSession } from '@/lib/auth/ai-auth-gate';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requirePortalSession();
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const limit = url.searchParams.get('limit');
  const result = await fetchAiSessions(limit != null ? Number(limit) : 30);
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
