import { NextResponse } from 'next/server';

import { changePassword, fetchMe, updateMe } from '@/lib/auth/payload-client';
import { clearSessionCookie, getSessionToken } from '@/lib/auth/session';
import type { ChangePasswordBody, UpdateProfileBody } from '@/lib/auth/types';
import { PASSWORD_POLICY_HINT, validatePasswordPolicy } from '@omnia/constants';

function unauthorized(message = 'Sessão não encontrada.') {
  const response = NextResponse.json({ error: message }, { status: 401 });
  clearSessionCookie(response);
  return response;
}

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return unauthorized();
  }

  const result = await fetchMe(token);
  if (!result.ok) {
    // Token inválido/expirado ou upstream 401 → sempre 401 (nunca 5xx por ausência de auth).
    if (result.status === 401 || result.status === 403 || result.status === 502) {
      return unauthorized(result.error);
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.data.accountStatus === 'blocked') {
    return unauthorized('Esta conta está bloqueada.');
  }

  return NextResponse.json({ user: result.data });
}

export async function PATCH(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return unauthorized();
  }

  const current = await fetchMe(token);
  if (!current.ok) {
    if (current.status === 401 || current.status === 403 || current.status === 502) {
      return unauthorized(current.error);
    }
    return NextResponse.json({ error: current.error }, { status: current.status });
  }

  if (current.data.accountStatus === 'blocked') {
    return unauthorized('Esta conta está bloqueada.');
  }

  let body: Partial<UpdateProfileBody & ChangePasswordBody>;
  try {
    body = (await request.json()) as Partial<UpdateProfileBody & ChangePasswordBody>;
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  if (typeof body.password === 'string' && body.password.length > 0) {
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!currentPassword) {
      return NextResponse.json({ error: 'Informe a senha atual.' }, { status: 400 });
    }

    if (body.password !== confirmPassword) {
      return NextResponse.json(
        { error: 'A confirmação da nova senha não confere.' },
        { status: 400 },
      );
    }

    const policy = validatePasswordPolicy(body.password);
    if (!policy.ok) {
      return NextResponse.json({ error: policy.error }, { status: 400 });
    }

    // Valida senha atual via login Payload (sem criar sessão no BFF).
    const { loginUser } = await import('@/lib/auth/payload-client');
    const verify = await loginUser(current.data.email, currentPassword);
    if (!verify.ok) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
    }

    const passwordResult = await changePassword(token, current.data.id, {
      password: body.password,
    });

    if (!passwordResult.ok) {
      return NextResponse.json({ error: passwordResult.error }, { status: passwordResult.status });
    }

    // Invalida sessão anterior: novo login obrigatório com a senha nova.
    const response = NextResponse.json({
      user: passwordResult.data,
      message: 'Senha alterada. Faça login novamente.',
      policyHint: PASSWORD_POLICY_HINT,
    });
    clearSessionCookie(response);
    return response;
  }

  // Impede mass-assignment de campos administrativos via BFF.
  const {
    firstName,
    lastName,
    phone,
    whatsapp,
    cpf,
    employerName,
    jobTitle,
    segment,
    country,
    state,
    city,
    interestAreas,
    groupOrganizations,
  } = body;

  const profileResult = await updateMe(token, current.data.id, {
    firstName,
    lastName,
    phone,
    whatsapp,
    cpf,
    employerName,
    jobTitle,
    segment,
    country,
    state,
    city,
    interestAreas,
    groupOrganizations,
  });

  if (!profileResult.ok) {
    return NextResponse.json({ error: profileResult.error }, { status: profileResult.status });
  }

  return NextResponse.json({ user: profileResult.data });
}
