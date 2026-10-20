import { NextResponse } from 'next/server';

import { browserRedirect } from '@/lib/auth/browser-redirect';
import { logoutUser } from '@/lib/auth/payload-client';
import { clearSessionCookie, getSessionToken } from '@/lib/auth/session';

async function handleLogout(request: Request) {
  const token = await getSessionToken();
  if (token) {
    await logoutUser(token);
  }

  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    const response = browserRedirect('/', 303, '/');
    clearSessionCookie(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
