import { NextResponse } from 'next/server';

import { fetchLmsConnector } from '@/lib/lms/connector';
import { scrubMoodleLeakage } from '@/lib/lms/sanitize';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { path = [] } = await context.params;
  const joined = path.join('/');
  if (!joined || joined.includes('..')) {
    return NextResponse.json(
      { ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid path' } },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  let body: unknown;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.json().catch(() => null);
  }

  const result = await fetchLmsConnector(joined, {
    method,
    body,
    search: url.search,
  });

  const payload = scrubMoodleLeakage(result.data ?? { ok: false });

  return NextResponse.json(payload, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
