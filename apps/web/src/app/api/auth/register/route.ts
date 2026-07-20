import { NextResponse } from 'next/server';

import { loginUser, registerUser } from '@/lib/auth/payload-client';
import { setSessionCookie } from '@/lib/auth/session';
import type { RegisterBody } from '@/lib/auth/types';

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
