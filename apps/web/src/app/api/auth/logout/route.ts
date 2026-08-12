import { NextResponse } from 'next/server';

import { logoutUser } from '@/lib/auth/payload-client';
import { clearSessionCookie, getSessionToken } from '@/lib/auth/session';

async function handleLogout(request: Request) {
  const token = await getSessionToken();
  if (token) {
    await logoutUser(token);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return NextResponse.redirect(new URL('/', request.url), 303);
  }

  return response;
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
