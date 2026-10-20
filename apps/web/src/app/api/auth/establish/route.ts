import { resolveEstablishDestination } from '@omnia/shared';

import { browserRedirect } from '@/lib/auth/browser-redirect';
import { establishStudentDevice } from '@/lib/auth/device-login';
import { fetchMe } from '@/lib/auth/payload-client';
import { setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Establish Portal session cookie from a Payload JWT obtained on Admin login.
 * Used as a top-level form POST from admin.dev → portal (navigational, sets cookie).
 * Never logs the token.
 *
 * Location MUST be a relative path. `new URL(next, request.url)` leaks
 * HOSTNAME=0.0.0.0:3000 to the browser behind Traefik.
 */
export async function POST(request: Request) {
  let token = '';
  let requestedNext = '';

  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { token?: string; next?: string };
      token = typeof body.token === 'string' ? body.token.trim() : '';
      requestedNext = typeof body.next === 'string' ? body.next : '';
    } else {
      const form = await request.formData();
      token = String(form.get('token') || '').trim();
      requestedNext = String(form.get('next') || '');
    }
  } catch {
    return Response.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  if (!token) {
    return Response.json({ ok: false, error: 'token required' }, { status: 400 });
  }

  const me = await fetchMe(token);
  if (!me.ok) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (me.data.accountStatus === 'blocked') {
    return Response.json({ ok: false, error: 'BLOCKED' }, { status: 403 });
  }

  const nextPath = resolveEstablishDestination(me.data.role, requestedNext);
  // Device Access Control: registra/reconhece o navegador do aluno (OFF ⇒ no-op).
  const device = await establishStudentDevice(
    me.data.role,
    token,
    request.headers.get('user-agent'),
    nextPath,
  );
  const response = browserRedirect(device.redirectTo ?? nextPath, 303, '/ia');
  setSessionCookie(response, token);
  device.apply(response);
  return response;
}
