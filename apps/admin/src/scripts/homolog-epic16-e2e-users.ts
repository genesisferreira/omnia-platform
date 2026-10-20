/**
 * EPIC 16 — Pre-human smoke for controlled E2E users.
 * Logs status markers only. Never prints tokens/cookies/passwords.
 *
 * Env:
 *   OMNIA_ALLOW_E2E_SEED=1
 *   E2E_*_PASSWORD (same as seed)
 *   E2E_ADMIN_URL (default https://admin.dev.omniafrigo.com.br)
 *   E2E_WEB_URL (default https://dev.omniafrigo.com.br)
 */
export {};

type Account = {
  key: string;
  email: string;
  passwordEnv: string;
  marker: string;
};

const ACCOUNTS: Account[] = [
  {
    key: 'student_a',
    email: 'e2e.student.a@example.invalid',
    passwordEnv: 'E2E_STUDENT_A_PASSWORD',
    marker: 'STUDENT_A_LOGIN_OK',
  },
  {
    key: 'professor_a',
    email: 'e2e.professor.a@example.invalid',
    passwordEnv: 'E2E_PROFESSOR_A_PASSWORD',
    marker: 'PROFESSOR_A_LOGIN_OK',
  },
  {
    key: 'commercial_a',
    email: 'e2e.commercial.a@example.invalid',
    passwordEnv: 'E2E_COMMERCIAL_A_PASSWORD',
    marker: 'COMMERCIAL_A_LOGIN_OK',
  },
  {
    key: 'technical_a',
    email: 'e2e.technical.a@example.invalid',
    passwordEnv: 'E2E_TECHNICAL_A_PASSWORD',
    marker: 'TECHNICAL_A_LOGIN_OK',
  },
  {
    key: 'admin_a',
    email: 'e2e.admin.a@example.invalid',
    passwordEnv: 'E2E_ADMIN_A_PASSWORD',
    marker: 'ADMIN_A_LOGIN_OK',
  },
  {
    key: 'student_b',
    email: 'e2e.student.b@example.invalid',
    passwordEnv: 'E2E_STUDENT_B_PASSWORD',
    marker: 'STUDENT_B_LOGIN_OK',
  },
];

function requirePassword(envName: string): string {
  const value = process.env[envName]?.trim();
  if (!value) throw new Error(`Missing ${envName}`);
  return value;
}

function assertStagingOnly(): void {
  const omniaEnv = String(process.env.OMNIA_ENV || process.env.APP_ENV || '').toLowerCase();
  const target = String(process.env.OMNIA_TARGET || '').toLowerCase();
  const flag = String(process.env.OMNIA_ALLOW_E2E_SEED || '').toLowerCase();
  if (omniaEnv === 'production' || target === 'production') {
    throw new Error('ABORT: homolog-epic16-e2e-users refused on production');
  }
  if (flag !== '1' && flag !== 'true' && flag !== 'yes') {
    throw new Error('ABORT: set OMNIA_ALLOW_E2E_SEED=1');
  }
}

async function login(adminUrl: string, email: string, password: string): Promise<string> {
  const res = await fetch(`${adminUrl}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json().catch(() => null)) as { token?: string } | null;
  if (!res.ok || !json?.token) {
    throw new Error(`LOGIN_FAIL:${email}:${res.status}`);
  }
  return json.token;
}

async function main() {
  assertStagingOnly();

  const adminUrl = (process.env.E2E_ADMIN_URL || 'https://admin.dev.omniafrigo.com.br').replace(
    /\/$/,
    '',
  );
  const webUrl = (process.env.E2E_WEB_URL || 'https://dev.omniafrigo.com.br').replace(/\/$/, '');

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { listAllowedAssistants } = await import('../services/enterprise/resolve');

  /** Mirrors portal mapPortalRoleToAiRole / connector capability roles. */
  function mapRole(role: string | null | undefined): string {
    if (role === 'super_admin' || role === 'admin') return 'admin';
    if (role === 'editor' || role === 'publisher') return 'manager';
    if (role === 'instructor') return 'teacher';
    if (role === 'partner') return 'partner';
    if (role === 'client') return 'client';
    return 'student';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  const roles: Record<string, string> = {};

  for (const account of ACCOUNTS) {
    const password = requirePassword(account.passwordEnv);
    const token = await login(adminUrl, account.email, password);
    tokens[account.key] = token;
    console.log(account.marker);

    const me = await fetch(`${adminUrl}/api/users/me`, {
      headers: { Authorization: `JWT ${token}`, Accept: 'application/json' },
    });
    const meJson = (await me.json().catch(() => null)) as {
      user?: { id?: string | number; role?: string };
    } | null;
    if (!me.ok || meJson?.user?.id == null) throw new Error(`ME_FAIL:${account.key}`);
    userIds[account.key] = String(meJson.user.id);
    roles[account.key] = String(meJson.user.role || '');
  }

  // Assistant matrix from live policies (AI capability role).
  const matrix: Record<string, string[]> = {};
  for (const account of ACCOUNTS) {
    const aiRole = mapRole(roles[account.key]);
    const allowed = await listAllowedAssistants(payload, { role: aiRole });
    matrix[account.key] = (allowed.allowedAssistants || []).map((a: { key: string }) => a.key);
  }
  console.log('AI_ASSISTANT_MATRIX_OK');
  console.log(
    'MATRIX',
    JSON.stringify(
      Object.fromEntries(
        Object.entries(matrix).map(([k, keys]) => [
          k,
          {
            portalRole: roles[k],
            aiRole: mapRole(roles[k]),
            assistants: keys,
            tutor: keys.includes('tutor'),
            concierge: keys.includes('concierge'),
            commercial: keys.includes('commercial'),
            engineering: keys.includes('engineering'),
          },
        ]),
      ),
    ),
  );

  // Portal BFF context/sessions with cookie session via web login BFF.
  async function portalLogin(email: string, password: string): Promise<string[]> {
    const res = await fetch(`${webUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
      redirect: 'manual',
    });
    const setCookie = res.headers.getSetCookie?.() || [];
    if (!res.ok && res.status !== 200) {
      // Some stacks return 200 JSON + Set-Cookie
      const alt = [...(res.headers as Headers).entries()]
        .filter(([k]) => k.toLowerCase() === 'set-cookie')
        .map(([, v]) => v);
      if (alt.length === 0) throw new Error(`PORTAL_LOGIN_FAIL:${email}:${res.status}`);
      return alt;
    }
    if (setCookie.length === 0) {
      const alt = [...(res.headers as Headers).entries()]
        .filter(([k]) => k.toLowerCase() === 'set-cookie')
        .map(([, v]) => v);
      if (alt.length === 0) throw new Error(`PORTAL_COOKIE_MISSING:${email}`);
      return alt;
    }
    return setCookie;
  }

  function cookieHeader(setCookies: string[]): string {
    return setCookies.map((c) => c.split(';')[0]).join('; ');
  }

  const studentACookies = await portalLogin(
    'e2e.student.a@example.invalid',
    requirePassword('E2E_STUDENT_A_PASSWORD'),
  );
  const studentBCookies = await portalLogin(
    'e2e.student.b@example.invalid',
    requirePassword('E2E_STUDENT_B_PASSWORD'),
  );

  const ctxA = await fetch(`${webUrl}/api/ai/context?route=/ia&area=ai_command_center`, {
    headers: { Cookie: cookieHeader(studentACookies), Accept: 'application/json' },
  });
  const ctxAJson = (await ctxA.json().catch(() => null)) as {
    ok?: boolean;
    data?: { role?: string; userId?: string };
  } | null;
  if (!ctxA.ok || !ctxAJson?.ok) {
    throw new Error(`AI_CONTEXT_FAIL_A:${ctxA.status}`);
  }
  const ctxRole = String(ctxAJson.data?.role || '');
  if (ctxRole !== 'student') {
    throw new Error(`AI_CONTEXT_ROLE_FAIL_A:${ctxRole}`);
  }
  console.log('AI_CONTEXT_OK');

  // Create a chat session as Student A via Admin JWT (identity headers would require internal key);
  // use Admin chat with Payload cookie/JWT path if available, else create session row via payload.
  const sessionA = await payload.create({
    collection: 'ai-sessions',
    data: {
      question: 'E2E ownership probe A',
      answerText: 'probe',
      status: 'ok',
      provider: 'grounded',
      model: 'grounded-extractive-v1',
      tookMs: 1,
      user: Number(userIds.student_a),
      tenant: (
        await payload.find({
          collection: 'tenants',
          where: { slug: { equals: 'e16-tenant-a' } },
          limit: 1,
          overrideAccess: true,
        })
      ).docs[0]?.id,
    },
    overrideAccess: true,
  });
  const sessionB = await payload.create({
    collection: 'ai-sessions',
    data: {
      question: 'E2E ownership probe B',
      answerText: 'probe',
      status: 'ok',
      provider: 'grounded',
      model: 'grounded-extractive-v1',
      tookMs: 1,
      user: Number(userIds.student_b),
      tenant: (
        await payload.find({
          collection: 'tenants',
          where: { slug: { equals: 'e16-tenant-b' } },
          limit: 1,
          overrideAccess: true,
        })
      ).docs[0]?.id,
    },
    overrideAccess: true,
  });

  const ownA = await fetch(`${webUrl}/api/ai/sessions/${sessionA.id}`, {
    headers: { Cookie: cookieHeader(studentACookies), Accept: 'application/json' },
  });
  const crossAB = await fetch(`${webUrl}/api/ai/sessions/${sessionB.id}`, {
    headers: { Cookie: cookieHeader(studentACookies), Accept: 'application/json' },
  });
  const ownB = await fetch(`${webUrl}/api/ai/sessions/${sessionB.id}`, {
    headers: { Cookie: cookieHeader(studentBCookies), Accept: 'application/json' },
  });
  const crossBA = await fetch(`${webUrl}/api/ai/sessions/${sessionA.id}`, {
    headers: { Cookie: cookieHeader(studentBCookies), Accept: 'application/json' },
  });

  if (ownA.status !== 200) throw new Error(`SESSION_OWN_A_FAIL:${ownA.status}`);
  if (ownB.status !== 200) throw new Error(`SESSION_OWN_B_FAIL:${ownB.status}`);
  if (![403, 404].includes(crossAB.status)) {
    throw new Error(`CROSS_AB_FAIL:${crossAB.status}`);
  }
  if (![403, 404].includes(crossBA.status)) {
    throw new Error(`CROSS_BA_FAIL:${crossBA.status}`);
  }
  console.log('AI_SESSION_OWNERSHIP_OK');
  console.log('AI_CROSS_TENANT_OK');

  // Cleanup probe sessions
  await payload.delete({ collection: 'ai-sessions', id: sessionA.id, overrideAccess: true });
  await payload.delete({ collection: 'ai-sessions', id: sessionB.id, overrideAccess: true });

  console.log('EPIC16_E2E_HOMOLOG_OK');
  console.log(
    JSON.stringify({
      webUrl,
      adminUrl,
      userIds: Object.fromEntries(Object.keys(userIds).map((k) => [k, userIds[k]])),
      roles,
    }),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
