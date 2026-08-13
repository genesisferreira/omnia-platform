/**
 * ILS V1.1 — staging fixtures (idempotent).
 *
 * Fred + CTE: companies, cursos distintos, turmas, professores, alunos NOVOS (NOT_STARTED).
 * Senhas SOMENTE via env. Nunca loga plaintext.
 *
 *   OMNIA_ALLOW_E2E_SEED=1 \
 *   E2E_FRED_STUDENT_NEW_PASSWORD=... E2E_FRED_PROFESSOR_PASSWORD=... \
 *   E2E_CTE_STUDENT_NEW_PASSWORD=... E2E_CTE_PROFESSOR_PASSWORD=... \
 *   E2E_ADMIN_A_PASSWORD=... \
 *   pnpm --filter @omnia/admin seed:ils-v11-fixtures
 */
export {};

type PlatformRole = 'student' | 'instructor' | 'admin';

type SeedUserSpec = {
  key: string;
  email: string;
  role: PlatformRole;
  school: 'fred-do-frio' | 'cte' | 'holding';
  firstName: string;
  lastName: string;
  passwordEnv: string;
};

const FRED_COURSE_SLUG = 'fundamentos-refrigeracao-industrial';
const CTE_COURSE_SLUG = 'cte-normas-eletricas-industriais';
const FRED_CLASS_NAME = 'Turma Fred Homologação ILS V1.1';
const CTE_CLASS_NAME = 'Turma CTE Homologação ILS V1.1';

const USERS: SeedUserSpec[] = [
  {
    key: 'fred_student_new',
    email: 'e2e.fred.student.new@example.invalid',
    role: 'student',
    school: 'fred-do-frio',
    firstName: 'Fred',
    lastName: 'Aluno Novo',
    passwordEnv: 'E2E_FRED_STUDENT_NEW_PASSWORD',
  },
  {
    key: 'fred_professor',
    email: 'e2e.fred.professor@example.invalid',
    role: 'instructor',
    school: 'fred-do-frio',
    firstName: 'Fred',
    lastName: 'Professor',
    passwordEnv: 'E2E_FRED_PROFESSOR_PASSWORD',
  },
  {
    key: 'cte_student_new',
    email: 'e2e.cte.student.new@example.invalid',
    role: 'student',
    school: 'cte',
    firstName: 'Cte',
    lastName: 'Aluno Novo',
    passwordEnv: 'E2E_CTE_STUDENT_NEW_PASSWORD',
  },
  {
    key: 'cte_professor',
    email: 'e2e.cte.professor@example.invalid',
    role: 'instructor',
    school: 'cte',
    firstName: 'Cte',
    lastName: 'Professor',
    passwordEnv: 'E2E_CTE_PROFESSOR_PASSWORD',
  },
  {
    key: 'admin_a',
    email: 'e2e.admin.a@example.invalid',
    role: 'admin',
    school: 'holding',
    firstName: 'E2E',
    lastName: 'Admin A',
    passwordEnv: 'E2E_ADMIN_A_PASSWORD',
  },
];

function assertStagingOnly(): void {
  const omniaEnv = String(process.env.OMNIA_ENV || process.env.APP_ENV || '').toLowerCase();
  const target = String(process.env.OMNIA_TARGET || '').toLowerCase();
  const flag = String(process.env.OMNIA_ALLOW_E2E_SEED || '').toLowerCase();
  if (omniaEnv === 'production' || target === 'production') {
    throw new Error('ABORT: ils-v11-fixtures refused on production environment');
  }
  if (flag !== '1' && flag !== 'true' && flag !== 'yes') {
    throw new Error('ABORT: set OMNIA_ALLOW_E2E_SEED=1 to run ils-v11-fixtures (staging/dev only)');
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
  const { validatePasswordPolicy } = await import('@omnia/constants');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const actor = {
    id: 0,
    collection: 'users' as const,
    email: 'ils.v11.seed.actor@example.invalid',
    role: 'super_admin' as const,
  };

  async function findCompany(slug: string) {
    const found = await payload.find({
      collection: 'companies',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    });
    return found.docs[0] ?? null;
  }

  async function ensureSchoolCompany(
    slug: string,
    data: Record<string, unknown>,
  ): Promise<{ id: string | number; slug: string }> {
    const existing = await findCompany(slug);
    if (existing) {
      await payload.update({
        collection: 'companies',
        id: existing.id,
        data: { schoolKey: data.schoolKey, brandTheme: data.brandTheme, status: 'active' },
        overrideAccess: true,
      });
      return { id: existing.id, slug };
    }
    const tenantFound = await payload.find({
      collection: 'tenants',
      limit: 1,
      overrideAccess: true,
    });
    const tenantId = tenantFound.docs[0]?.id;
    const created = await payload.create({
      collection: 'companies',
      data: { ...data, tenant: tenantId ?? undefined, status: 'active' },
      overrideAccess: true,
    });
    return { id: created.id, slug };
  }

  async function ensureUser(
    spec: SeedUserSpec,
    tenantId: string | number | null,
    companyId: string | number,
  ) {
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
      tenant: tenantId ? Number(tenantId) : undefined,
      company: Number(companyId),
      firstName: spec.firstName,
      lastName: spec.lastName,
    };
    if (found.docs[0]) {
      await payload.update({
        collection: 'users',
        id: found.docs[0].id,
        data,
        user: actor,
        overrideAccess: true,
      });
      return { id: found.docs[0].id, created: false };
    }
    const doc = await payload.create({
      collection: 'users',
      data,
      user: actor,
      overrideAccess: true,
    });
    return { id: doc.id, created: true };
  }

  async function ensureFredCourse(companyId: string | number, instructorId: string | number) {
    const found = await payload.find({
      collection: 'courses',
      where: { slug: { equals: FRED_COURSE_SLUG } },
      limit: 1,
      overrideAccess: true,
    });
    if (!found.docs[0]) {
      throw new Error('ILS_V11_REQUIRES_LMS_CORE_FRED_COURSE');
    }
    await payload.update({
      collection: 'courses',
      id: found.docs[0].id,
      data: {
        schoolKey: 'fred-do-frio',
        ownerCompany: Number(companyId),
        instructor: Number(instructorId),
        status: 'published',
        visibility: 'public',
        certificateEnabled: true,
      },
      overrideAccess: true,
    });
    return found.docs[0];
  }

  async function ensureCteCourse(companyId: string | number, instructorId: string | number) {
    const found = await payload.find({
      collection: 'courses',
      where: { slug: { equals: CTE_COURSE_SLUG } },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      title: 'CTE — Normas Elétricas Industriais (staging fixture)',
      slug: CTE_COURSE_SLUG,
      shortDescription:
        'STAGING FIXTURE CTE. Conteúdo mínimo de homologação — não é catálogo Fred.',
      category: 'Elétrica industrial',
      level: 'beginner',
      language: 'pt-BR',
      estimatedHours: 6,
      status: 'published',
      publishedAt: new Date().toISOString(),
      featured: false,
      visibility: 'company',
      schoolKey: 'cte',
      ownerCompany: Number(companyId),
      instructor: Number(instructorId),
      certificateEnabled: true,
      passingScore: 70,
      tags: [{ tag: 'cte-staging-fixture' }, { tag: 'eletrica' }],
    };
    if (found.docs[0]) {
      await payload.update({
        collection: 'courses',
        id: found.docs[0].id,
        data,
        overrideAccess: true,
      });
      return found.docs[0];
    }
    return payload.create({ collection: 'courses', data, overrideAccess: true });
  }

  async function ensureCteLessons(courseId: string | number) {
    const modules = await payload.find({
      collection: 'course-modules',
      where: { course: { equals: courseId } },
      limit: 5,
      overrideAccess: true,
    });
    let moduleId = modules.docs[0]?.id;
    if (!moduleId) {
      const created = await payload.create({
        collection: 'course-modules',
        data: {
          title: 'NR e comandos (staging fixture CTE)',
          slug: 'cte-nr-comandos',
          description: 'STAGING FIXTURE CTE — módulo de homologação.',
          order: 1,
          course: courseId,
          published: true,
        },
        overrideAccess: true,
      });
      moduleId = created.id;
    }
    const lessons = await payload.find({
      collection: 'lessons',
      where: { module: { equals: moduleId } },
      limit: 10,
      overrideAccess: true,
    });
    if (lessons.docs.length === 0) {
      await payload.create({
        collection: 'lessons',
        data: {
          title: 'NR-10 no contexto de câmara fria (CTE fixture)',
          slug: 'cte-nr10-camara',
          summary: 'STAGING FIXTURE CTE. Texto mínimo de segurança elétrica.',
          type: 'text',
          duration: 20,
          order: 1,
          published: true,
          module: moduleId,
        },
        overrideAccess: true,
      });
      await payload.create({
        collection: 'lessons',
        data: {
          title: 'Disjuntor motor e proteção térmica (CTE fixture)',
          slug: 'cte-disjuntor-motor',
          summary: 'STAGING FIXTURE CTE. Aula distinta do catálogo Fred.',
          type: 'text',
          duration: 15,
          order: 2,
          published: true,
          module: moduleId,
        },
        overrideAccess: true,
      });
    }
    return moduleId;
  }

  async function ensureClass(
    name: string,
    courseId: string | number,
    instructorId: string | number,
    schoolKey: 'fred-do-frio' | 'cte',
    companyId: string | number,
  ) {
    const found = await payload.find({
      collection: 'lms-classes',
      where: { name: { equals: name } },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      name,
      course: Number(courseId),
      instructor: Number(instructorId),
      ownerCompany: Number(companyId),
      schoolKey,
      status: 'open',
      modality: 'online',
    };
    if (found.docs[0]) {
      await payload.update({
        collection: 'lms-classes',
        id: found.docs[0].id,
        data,
        overrideAccess: true,
      });
      return found.docs[0];
    }
    return payload.create({ collection: 'lms-classes', data, overrideAccess: true });
  }

  async function ensureEnrollment(
    studentId: string | number,
    courseId: string | number,
    classId: string | number,
    instructorId: string | number,
    schoolKey: 'fred-do-frio' | 'cte',
    companyId: string | number,
  ) {
    const found = await payload.find({
      collection: 'lms-enrollments',
      where: {
        and: [{ student: { equals: studentId } }, { course: { equals: courseId } }],
      },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      student: Number(studentId),
      course: Number(courseId),
      classRef: Number(classId),
      instructor: Number(instructorId),
      ownerCompany: Number(companyId),
      schoolKey,
      status: 'active',
      progressPercent: 0,
      lastLessonId: null,
      startedAt: new Date().toISOString(),
    };
    if (found.docs[0]) {
      await payload.update({
        collection: 'lms-enrollments',
        id: found.docs[0].id,
        data,
        overrideAccess: true,
      });
      return found.docs[0];
    }
    return payload.create({ collection: 'lms-enrollments', data, overrideAccess: true });
  }

  async function ensureOnboardingNotStarted(
    studentId: string | number,
    schoolKey: 'fred-do-frio' | 'cte',
  ) {
    const found = await payload.find({
      collection: 'ils-onboarding',
      where: { student: { equals: studentId } },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      student: Number(studentId),
      schoolKey,
      status: 'NOT_STARTED',
      currentStep: 'explanation',
      exemptedBy: null,
      exemptedReason: null,
      exemptedAt: null,
    };
    if (found.docs[0]) {
      await payload.update({
        collection: 'ils-onboarding',
        id: found.docs[0].id,
        data,
        overrideAccess: true,
      });
      return found.docs[0];
    }
    return payload.create({ collection: 'ils-onboarding', data, overrideAccess: true });
  }

  const fredCompany = await ensureSchoolCompany('fred-do-frio-academy', {
    name: 'Fred do Frio',
    slug: 'fred-do-frio-academy',
    portalSlug: 'fred-do-frio',
    shortDescription: 'Educação moderna e especialização em refrigeração.',
    ecosystemRole: 'Educação',
    brandTheme: 'fred',
    schoolKey: 'fred-do-frio',
    isHolding: false,
  });
  const cteCompany = await ensureSchoolCompany('cte', {
    name: 'CTE',
    slug: 'cte',
    portalSlug: 'cte',
    shortDescription: 'CTE STAGING BRAND PLACEHOLDER — formação técnica.',
    ecosystemRole: 'Formação Técnica',
    brandTheme: 'cte',
    schoolKey: 'cte',
    isHolding: false,
  });
  const holding =
    (await findCompany('omnia-frigo-holding')) || (await findCompany('omnia-frigo')) || fredCompany;

  const tenantFound = await payload.find({
    collection: 'tenants',
    limit: 1,
    overrideAccess: true,
  });
  const tenantId = tenantFound.docs[0]?.id ?? null;

  const createdUsers: Record<string, { id: string | number; email: string; created: boolean }> = {};
  for (const spec of USERS) {
    const companyId =
      spec.school === 'fred-do-frio'
        ? fredCompany.id
        : spec.school === 'cte'
          ? cteCompany.id
          : holding.id;
    const user = await ensureUser(spec, tenantId, companyId);
    createdUsers[spec.key] = { id: user.id, email: spec.email, created: user.created };
  }

  const mustUser = (key: string) => {
    const row = createdUsers[key];
    if (!row) throw new Error(`missing seeded user ${key}`);
    return row;
  };
  const fredProfessor = mustUser('fred_professor');
  const cteProfessor = mustUser('cte_professor');
  const fredStudent = mustUser('fred_student_new');
  const cteStudent = mustUser('cte_student_new');

  const fredCourse = await ensureFredCourse(fredCompany.id, fredProfessor.id);
  const cteCourse = await ensureCteCourse(cteCompany.id, cteProfessor.id);
  await ensureCteLessons(cteCourse.id);

  const fredClass = await ensureClass(
    FRED_CLASS_NAME,
    fredCourse.id,
    fredProfessor.id,
    'fred-do-frio',
    fredCompany.id,
  );
  const cteClass = await ensureClass(
    CTE_CLASS_NAME,
    cteCourse.id,
    cteProfessor.id,
    'cte',
    cteCompany.id,
  );

  await ensureEnrollment(
    fredStudent.id,
    fredCourse.id,
    fredClass.id,
    fredProfessor.id,
    'fred-do-frio',
    fredCompany.id,
  );
  await ensureEnrollment(
    cteStudent.id,
    cteCourse.id,
    cteClass.id,
    cteProfessor.id,
    'cte',
    cteCompany.id,
  );

  await ensureOnboardingNotStarted(fredStudent.id, 'fred-do-frio');
  await ensureOnboardingNotStarted(cteStudent.id, 'cte');

  console.log('ILS_V11_FIXTURES_SEED_OK');
  console.log(
    JSON.stringify({
      fredCompanyId: fredCompany.id,
      cteCompanyId: cteCompany.id,
      fredCourse: { id: fredCourse.id, slug: FRED_COURSE_SLUG },
      cteCourse: { id: cteCourse.id, slug: CTE_COURSE_SLUG },
      fredClassId: fredClass.id,
      cteClassId: cteClass.id,
      users: createdUsers,
      note: 'New students forced NOT_STARTED. Passwords not logged.',
    }),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
