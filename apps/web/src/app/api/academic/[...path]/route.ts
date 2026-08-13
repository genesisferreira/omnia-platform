import { NextResponse } from 'next/server';

import { fetchAcademic } from '@/lib/academic/client';

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
  const result = await fetchAcademic(joined, {
    method,
    body,
    search: url.search,
  });
  return NextResponse.json(result.ok ? result.data : (result.data ?? { ok: false }), {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
