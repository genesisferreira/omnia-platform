import { NextResponse } from 'next/server';

import { loginUser } from '@/lib/auth/payload-client';
import { getSessionToken, setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };

  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const result = await loginUser(email, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ user: result.data.user });
  setSessionCookie(response, result.data.token);
  return response;
}

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
