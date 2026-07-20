import { NextResponse } from 'next/server';

import { changePassword, fetchMe, updateMe } from '@/lib/auth/payload-client';
import { getSessionToken } from '@/lib/auth/session';
import type { ChangePasswordBody, UpdateProfileBody } from '@/lib/auth/types';

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 401 });
  }

  const result = await fetchMe(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: result.data });
}

export async function PATCH(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 401 });
  }

  const current = await fetchMe(token);
  if (!current.ok) {
    return NextResponse.json({ error: current.error }, { status: current.status });
  }

  let body: Partial<UpdateProfileBody & ChangePasswordBody>;
  try {
    body = (await request.json()) as Partial<UpdateProfileBody & ChangePasswordBody>;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  if (typeof body.password === 'string' && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres.' },
        { status: 400 },
      );
    }

    const passwordResult = await changePassword(token, current.data.id, {
      password: body.password,
    });

    if (!passwordResult.ok) {
      return NextResponse.json({ error: passwordResult.error }, { status: passwordResult.status });
    }

    const profileFields = { ...body };
    delete profileFields.password;

    if (Object.keys(profileFields).length === 0) {
      return NextResponse.json({ user: passwordResult.data });
    }

    const profileResult = await updateMe(token, current.data.id, profileFields);
    if (!profileResult.ok) {
      return NextResponse.json({ error: profileResult.error }, { status: profileResult.status });
    }

    return NextResponse.json({ user: profileResult.data });
  }

  const profileResult = await updateMe(token, current.data.id, body);
  if (!profileResult.ok) {
    return NextResponse.json({ error: profileResult.error }, { status: profileResult.status });
  }

  return NextResponse.json({ user: profileResult.data });
}
