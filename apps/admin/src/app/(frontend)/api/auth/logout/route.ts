import { browserRedirect } from '@/lib/browser-redirect';

/**
 * Logout server-side via Payload REST.
 * Invalida o cookie HttpOnly sem expor tokens no cliente.
 * Internal fetch may use request.url (container bind). Browser Location is relative.
 */
export async function POST(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';

  await fetch(new URL('/api/users/logout', request.url), {
    method: 'POST',
    headers: {
      cookie,
      'Content-Type': 'application/json',
    },
  }).catch(() => undefined);

  const response = browserRedirect('/login', 303, '/login');
  response.cookies.set('payload-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  return POST(request);
}
