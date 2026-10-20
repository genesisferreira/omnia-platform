import { NextResponse } from 'next/server';

import { fetchAiSession } from '@/lib/ai/connector';
import { requirePortalSession } from '@/lib/auth/ai-auth-gate';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requirePortalSession();
  if (!session.ok) return session.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'session id required' }, { status: 400 });
  }

  const result = await fetchAiSession(id);
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
