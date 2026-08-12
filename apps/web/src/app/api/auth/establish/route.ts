import { NextResponse } from 'next/server';

import { fetchMe } from '@/lib/auth/payload-client';
import { setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Establish Portal session cookie from a Payload JWT obtained on Admin login.
 * Used as a top-level form POST from admin.dev → portal (navigational, sets cookie).
 * Never logs the token.
 */
function safeNext(candidate: string | null | undefined): string {
  if (!candidate || typeof candidate !== 'string') return '/ia';
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/ia';
  }
  if (trimmed.startsWith('/login') || trimmed.startsWith('/api/') || trimmed.startsWith('/admin')) {
    return '/ia';
  }
  // Admin placeholder areas → Portal Command Center
  if (trimmed.startsWith('/area/')) return '/ia';
  return trimmed;
}

export async function POST(request: Request) {
  let token = '';
  let nextPath = '/ia';

  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { token?: string; next?: string };
      token = typeof body.token === 'string' ? body.token.trim() : '';
      nextPath = safeNext(body.next);
    } else {
      const form = await request.formData();
      token = String(form.get('token') || '').trim();
      nextPath = safeNext(String(form.get('next') || ''));
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: 'token required' }, { status: 400 });
  }

  const me = await fetchMe(token);
  if (!me.ok) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (me.data.accountStatus === 'blocked') {
    return NextResponse.json({ ok: false, error: 'BLOCKED' }, { status: 403 });
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  setSessionCookie(response, token);
  return response;
}
