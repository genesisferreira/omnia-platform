import { NextResponse } from 'next/server';

import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared';

import { loginUser } from '@/lib/auth/payload-client';
import { getSessionToken, setSessionCookie } from '@/lib/auth/session';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 20;

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

  const ip = clientIpFromHeaders(request.headers);
  const rate = await checkRateLimit({
    scope: 'login-bff',
    subjects: [{ value: `ip:${ip}` }, { value: email, hash: true }],
    max: LOGIN_MAX,
    windowMs: LOGIN_WINDOW_MS,
    onRedisUnavailable: 'fail-closed',
  });

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error:
          rate.reason === 'redis_unavailable'
            ? 'Serviço temporariamente indisponível. Tente novamente em instantes.'
            : 'Muitas tentativas. Aguarde e tente novamente.',
      },
      { status: rate.reason === 'redis_unavailable' ? 503 : 429 },
    );
  }

  const result = await loginUser(email, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.data.user.accountStatus === 'blocked') {
    return NextResponse.json(
      { error: 'Esta conta está bloqueada. Entre em contato com o suporte.' },
      { status: 403 },
    );
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
