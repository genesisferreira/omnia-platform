import { NextResponse } from 'next/server';

/**
 * Logout server-side via Payload REST.
 * Invalida o cookie HttpOnly sem expor tokens no cliente.
 */
export async function POST(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';
  const origin = new URL(request.url).origin;

  await fetch(`${origin}/api/users/logout`, {
    method: 'POST',
    headers: {
      cookie,
      'Content-Type': 'application/json',
    },
  }).catch(() => undefined);

  const response = NextResponse.redirect(new URL('/login', origin), 303);
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
