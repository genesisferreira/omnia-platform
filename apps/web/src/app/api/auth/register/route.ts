import { NextResponse } from 'next/server';

import { PASSWORD_POLICY_HINT, validatePasswordPolicy } from '@omnia/constants';
import { checkRateLimit, clientIpFromHeaders } from '@omnia/shared/rate-limit';

import { loginUser, registerUser } from '@/lib/auth/payload-client';
import { setSessionCookie } from '@/lib/auth/session';
import type { RegisterBody } from '@/lib/auth/types';

const REGISTER_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_MAX = 10;

export async function POST(request: Request) {
  let body: Partial<RegisterBody>;

  try {
    body = (await request.json()) as Partial<RegisterBody>;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
  const lgpdAccepted = body.lgpdAccepted === true;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json(
      { error: 'Preencha nome, sobrenome, e-mail e senha.' },
      { status: 400 },
    );
  }

  if (!lgpdAccepted) {
    return NextResponse.json(
      { error: 'É necessário aceitar a política de privacidade.' },
      { status: 400 },
    );
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    return NextResponse.json(
      { error: policy.error, policyHint: PASSWORD_POLICY_HINT },
      { status: 400 },
    );
  }

  const ip = clientIpFromHeaders(request.headers);
  const rate = await checkRateLimit({
    scope: 'register',
    subjects: [{ value: `ip:${ip}` }, { value: email, hash: true }],
    max: REGISTER_MAX,
    windowMs: REGISTER_WINDOW_MS,
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

  const registerResult = await registerUser({
    email,
    password,
    firstName,
    lastName,
    phone,
    lgpdAccepted,
  });

  if (!registerResult.ok) {
    return NextResponse.json({ error: registerResult.error }, { status: registerResult.status });
  }

  const loginResult = await loginUser(email, password);
  if (!loginResult.ok) {
    return NextResponse.json(
      {
        user: registerResult.data,
        message: 'Cadastro realizado. Faça login para continuar.',
      },
      { status: 201 },
    );
  }

  const response = NextResponse.json({ user: loginResult.data.user }, { status: 201 });
  setSessionCookie(response, loginResult.data.token);
  return response;
}
