/**
 * EPIC 16 — Controlled STAGING E2E users (idempotent).
 *
 * Passwords: ONLY via env (E2E_*_PASSWORD). Never log plaintext passwords.
 * Abort if NODE_ENV=production or OMNIA_ENV=production.
 *
 * Usage:
 *   E2E_STUDENT_A_PASSWORD=... E2E_PROFESSOR_A_PASSWORD=... \
 *   E2E_COMMERCIAL_A_PASSWORD=... E2E_TECHNICAL_A_PASSWORD=... \
 *   E2E_ADMIN_A_PASSWORD=... E2E_STUDENT_B_PASSWORD=... \
 *   pnpm --filter @omnia/admin seed:epic16-e2e-users
 */
export {};

type PlatformRole =
  | 'student'
  | 'instructor'
  | 'admin'
  | 'client'
  | 'editor'
  | 'super_admin'
  | 'neurofrigo_admin'
  | 'technical_reviewer'
  | 'partner';

type SeedUserSpec = {
  key: string;
  email: string;
  role: PlatformRole;
  tenant: 'A' | 'B';
  company: 'A' | 'B' | 'holding';
  firstName: string;
  lastName: string;
  passwordEnv: string;
};

const USERS: SeedUserSpec[] = [
  {
    key: 'student_a',
    email: 'e2e.student.a@example.invalid',
    role: 'student',
    tenant: 'A',
    company: 'A',
    firstName: 'E2E',
    lastName: 'Student A',
    passwordEnv: 'E2E_STUDENT_A_PASSWORD',
  },
  {
    key: 'professor_a',
    email: 'e2e.professor.a@example.invalid',
    role: 'instructor',
    tenant: 'A',
    company: 'A',
    firstName: 'E2E',
    lastName: 'Professor A',
    passwordEnv: 'E2E_PROFESSOR_A_PASSWORD',
  },
  {
    key: 'commercial_a',
    email: 'e2e.commercial.a@example.invalid',
    // Staff policy roles that unlock Commercial: admin | teacher | super_admin | publisher
    // Payload has no "commercial" role — admin is the real role that unlocks Commercial IA.
    role: 'admin',
    tenant: 'A',
    company: 'holding',
    firstName: 'E2E',
    lastName: 'Commercial A',
    passwordEnv: 'E2E_COMMERCIAL_A_PASSWORD',
  },
  {
    key: 'technical_a',
    email: 'e2e.technical.a@example.invalid',
    // Same staff policy gate for Engineering; admin unlocks Engineering IA under current policies.
    role: 'admin',
    tenant: 'A',
    company: 'holding',
    firstName: 'E2E',
    lastName: 'Technical A',
    passwordEnv: 'E2E_TECHNICAL_A_PASSWORD',
  },
  {
    key: 'admin_a',
    email: 'e2e.admin.a@example.invalid',
    role: 'admin',
    tenant: 'A',
    company: 'holding',
    firstName: 'E2E',
    lastName: 'Admin A',
    passwordEnv: 'E2E_ADMIN_A_PASSWORD',
  },
  {
    key: 'student_b',
    email: 'e2e.student.b@example.invalid',
    role: 'student',
    tenant: 'B',
    company: 'B',
    firstName: 'E2E',
    lastName: 'Student B',
    passwordEnv: 'E2E_STUDENT_B_PASSWORD',
  },
];

function assertStagingOnly(): void {
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  const omniaEnv = String(process.env.OMNIA_ENV || process.env.APP_ENV || '').toLowerCase();
  const flag = String(process.env.OMNIA_ALLOW_E2E_SEED || '').toLowerCase();
  if (nodeEnv === 'production' || omniaEnv === 'production') {
    throw new Error('ABORT: epic16-e2e-users refused on production environment');
  }
  if (flag !== '1' && flag !== 'true' && flag !== 'yes') {
    throw new Error('ABORT: set OMNIA_ALLOW_E2E_SEED=1 to run epic16-e2e-users (staging/dev only)');
  }
}

function requirePassword(envName: string): string {
  const value = process.env[envName]?.trim();
  if (!value) {
    throw new Error(`Missing required password env: ${envName}`);
  }
  return value;
}

async function main() {
  assertStagingOnly();

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { syncStudentProfile, syncLearningProfile } = await import('../services/tutor/profiles');
  const { validatePasswordPolicy } = await import('@omnia/constants');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  async function ensureTenant(name: string, slug: string): Promise<string | number> {
    const found = await payload.find({
      collection: 'tenants',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });
    if (found.docs[0]) return found.docs[0].id;
    const doc = await payload.create({
      collection: 'tenants',
      data: { name, slug, status: 'active' },
      overrideAccess: true,
    });
    return doc.id;
  }

  async function ensureCompany(
    name: string,
    slug: string,
    portalSlug: string,
    tenantId: string | number,
  ): Promise<string | number> {
    const found = await payload.find({
      collection: 'companies',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });
    if (found.docs[0]) {
      await payload.update({
        collection: 'companies',
        id: found.docs[0].id,
        data: { tenant: Number(tenantId), status: 'active', showInEcosystem: false },
        overrideAccess: true,
      });
      return found.docs[0].id;
    }
    const doc = await payload.create({
      collection: 'companies',
      data: {
        name,
        slug,
        portalSlug,
        shortDescription: 'E2E STAGING TEST company — EPIC 16 controlled fixture',
        ecosystemRole: 'Test',
        tenant: Number(tenantId),
        displayOrder: 990,
        status: 'active',
        showInEcosystem: false,
        isHolding: false,
        brandTheme: 'omnia',
      },
      overrideAccess: true,
    });
    return doc.id;
  }

  async function findHoldingCompany(): Promise<string | number | null> {
    const bySlug = await payload.find({
      collection: 'companies',
      where: { slug: { equals: 'omnia-frigo-holding' } },
      limit: 1,
      overrideAccess: true,
    });
    if (bySlug.docs[0]) return bySlug.docs[0].id;
    const any = await payload.find({
      collection: 'companies',
      limit: 20,
      overrideAccess: true,
    });
    const hit = any.docs.find((c: { name?: string; slug?: string; isHolding?: boolean }) => {
      if (c.isHolding) return true;
      return /omnia|holding|frigo/i.test(String(c.name || c.slug || ''));
    });
    return hit?.id ?? null;
  }

  async function ensureUser(
    spec: SeedUserSpec,
    tenantId: string | number,
    companyId: string | number,
  ): Promise<{ id: string | number; created: boolean }> {
    const password = requirePassword(spec.passwordEnv);
    const policy = validatePasswordPolicy(password);
    if (!policy.ok) {
      throw new Error(`${spec.passwordEnv} fails password policy: ${policy.error}`);
    }

    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: spec.email } },
      limit: 1,
      overrideAccess: true,
    });

    const data = {
      email: spec.email,
      password,
      role: spec.role,
      accountStatus: 'active' as const,
      tenant: Number(tenantId),
      company: Number(companyId),
      firstName: spec.firstName,
      lastName: spec.lastName,
    };

    if (found.docs[0]) {
      await payload.update({
        collection: 'users',
        id: found.docs[0].id,
        data,
        overrideAccess: true,
      });
      return { id: found.docs[0].id, created: false };
    }

    const doc = await payload.create({
      collection: 'users',
      data,
      overrideAccess: true,
    });
    return { id: doc.id, created: true };
  }

  async function upsertCommercialProfile(companyId: string | number, companyName: string) {
    const key = 'e16-staging-commercial';
    const existing = await payload.find({
      collection: 'commercial-profiles',
      where: { key: { equals: key } },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      key,
      name: 'E2E Staging Commercial Profile',
      company: companyId,
      companyName,
      segment: 'refrigeracao-industrial',
      region: 'BR',
      language: 'pt-BR',
      allowedCatalog: ['Neurofrigo', 'Omnia Platform', 'Treinamentos técnicos'],
      businessLines: ['Plataforma Omnia', 'Formação técnica'],
      commercialPolicy:
        'E2E STAGING ONLY. Não inventar preços. Usar somente material publicado autorizado.',
      status: 'active',
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: 'commercial-profiles',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      });
      return existing.docs[0].id;
    }
    const created = await payload.create({
      collection: 'commercial-profiles',
      data,
      overrideAccess: true,
    });
    return created.id;
  }

  async function upsertEngineeringProfile(companyId: string | number, companyName: string) {
    const key = 'e16-staging-engineering';
    const existing = await payload.find({
      collection: 'engineering-profiles',
      where: { key: { equals: key } },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      key,
      name: 'E2E Staging Engineering Profile',
      company: companyId,
      companyName,
      technicalArea: 'refrigeracao-industrial',
      specialty: 'HVAC-R',
      language: 'pt-BR',
      permissions: ['published', 'allowAiUse'],
      technologyLines: ['CO2', 'HFC', 'condensacao-ar'],
      engineeringPolicy: 'E2E STAGING ONLY. Nunca inventar normas ou diagnósticos definitivos.',
      status: 'active',
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: 'engineering-profiles',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      });
      return existing.docs[0].id;
    }
    const created = await payload.create({
      collection: 'engineering-profiles',
      data,
      overrideAccess: true,
    });
    return created.id;
  }

  const tenantA = await ensureTenant('E2E Staging Tenant A', 'e16-tenant-a');
  const tenantB = await ensureTenant('E2E Staging Tenant B', 'e16-tenant-b');
  const companyA = await ensureCompany(
    'E2E Staging Company A',
    'e16-company-a',
    'e16-company-a',
    tenantA,
  );
  const companyB = await ensureCompany(
    'E2E Staging Company B',
    'e16-company-b',
    'e16-company-b',
    tenantB,
  );
  const holdingCompany = (await findHoldingCompany()) ?? companyA;

  await upsertCommercialProfile(holdingCompany, 'Omnia Frigo Holding (E2E link)');
  await upsertEngineeringProfile(holdingCompany, 'Omnia Frigo Holding (E2E link)');

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('EPIC16_E2E_REQUIRES_LMS_CORE_COURSE');

  const modules = await payload.find({
    collection: 'course-modules',
    where: { course: { equals: course.id } },
    limit: 10,
    sort: 'order',
    overrideAccess: true,
  });
  const moduleIds = modules.docs.map((m: { id: string | number }) => m.id);
  let firstLesson: { id: string | number; slug?: string } | null = null;
  if (moduleIds.length > 0) {
    const lessons = await payload.find({
      collection: 'lessons',
      where: { module: { in: moduleIds } },
      limit: 5,
      sort: 'order',
      overrideAccess: true,
    });
    firstLesson = lessons.docs[0] || null;
  }

  const results: Record<string, unknown> = {
    tenantA,
    tenantB,
    companyA,
    companyB,
    holdingCompany,
    courseId: course.id,
    courseSlug: course.slug,
    lessonId: firstLesson?.id ?? null,
    lessonSlug: firstLesson?.slug ?? null,
    users: {},
  };

  for (const spec of USERS) {
    const tenantId = spec.tenant === 'A' ? tenantA : tenantB;
    const companyId =
      spec.company === 'holding' ? holdingCompany : spec.company === 'A' ? companyA : companyB;
    const user = await ensureUser(spec, tenantId, companyId);
    (results.users as Record<string, unknown>)[spec.key] = {
      id: user.id,
      email: spec.email,
      role: spec.role,
      created: user.created,
      tenant: spec.tenant,
    };

    if (spec.key === 'student_a' || spec.key === 'student_b') {
      const student = await syncStudentProfile(payload, {
        userId: String(user.id),
        tenantId: String(tenantId),
        courseId: String(course.id),
        language: 'pt-BR',
      });
      await syncLearningProfile(payload, {
        userId: String(user.id),
        courseId: String(course.id),
        student,
      });
    }

    if (spec.key === 'professor_a') {
      await payload.update({
        collection: 'courses',
        id: course.id,
        data: { instructor: Number(user.id) },
        overrideAccess: true,
      });
    }
  }

  // Never include passwords in stdout JSON.
  console.log('EPIC16_E2E_USERS_SEED_OK');
  console.log(JSON.stringify(results));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
