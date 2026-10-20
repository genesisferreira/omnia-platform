/**
 * Seed Epic 13 — Engenharia IA (profile + prompts + smoke).
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { refreshEngineeringAiDashboard } = await import('../services/engineering/dashboard');
  const { listAllowedAssistants } = await import('../services/enterprise/resolve');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const models = await payload.find({
    collection: 'ai-models',
    where: { key: { equals: 'grounded-default' } },
    limit: 1,
    overrideAccess: true,
  });
  let modelId = models.docs[0]?.id;
  if (!modelId) {
    const created = await payload.create({
      collection: 'ai-models',
      data: {
        key: 'grounded-default',
        provider: 'grounded',
        model: 'grounded-extractive-v1',
        status: 'active',
        priority: 100,
        defaultTemperature: 0.2,
      },
      overrideAccess: true,
    });
    modelId = created.id;
  }

  const companies = await payload.find({
    collection: 'companies',
    limit: 5,
    overrideAccess: true,
  });
  const holding =
    companies.docs.find((c: { name?: string; slug?: string }) =>
      /omnia|holding|frigo/i.test(String(c.name || c.slug || '')),
    ) || companies.docs[0];

  const existingProfile = await payload.find({
    collection: 'engineering-profiles',
    where: { key: { equals: 'omnia-frigo-holding-engineering' } },
    limit: 1,
    overrideAccess: true,
  });
  const profileData = {
    key: 'omnia-frigo-holding-engineering',
    name: 'Omnia Frigo Holding — Engenharia',
    company: holding?.id,
    companyName: String(holding?.name || 'Omnia Frigo Holding'),
    technicalArea: 'refrigeracao-industrial',
    specialty: 'HVAC-R',
    language: 'pt-BR',
    permissions: ['published', 'allowAiUse'],
    technologyLines: [
      'CO2',
      'HFC',
      'condensacao-ar',
      'condensacao-agua',
      'valvula-eletronica',
      'valvula-termostatica',
      'automacao',
      'eficiencia-energetica',
    ],
    engineeringPolicy:
      'Nunca inventar normas, dimensionamentos, diagnósticos definitivos ou cálculos de carga. Usar somente documentos publicados e autorizados. Confirmação depende de inspeção técnica em campo. Nunca citar INTERNAL_RESTRICTED.',
    allowedModels: [modelId],
    status: 'active',
  };
  if (existingProfile.docs[0]) {
    await payload.update({
      collection: 'engineering-profiles',
      id: existingProfile.docs[0].id,
      data: profileData,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'engineering-profiles',
      data: profileData,
      overrideAccess: true,
    });
  }

  const assistants = await payload.find({
    collection: 'ai-assistants',
    where: { key: { equals: 'engineering' } },
    limit: 1,
    overrideAccess: true,
  });
  let engineeringId = assistants.docs[0]?.id;
  if (!engineeringId) {
    const created = await payload.create({
      collection: 'ai-assistants',
      data: {
        key: 'engineering',
        slug: 'engineering',
        name: 'Engenharia IA',
        category: 'engineering',
        version: '1.3.0',
        status: 'active',
        visibility: 'internal',
        language: 'pt-BR',
        promptVersion: '2',
        modelProfile: 'grounded-default',
        allowedModels: [modelId],
        defaultContext:
          'Apoie engenharia, instalação, manutenção e troubleshooting com precisão técnica e grounding obrigatório.',
        capabilities: ['rag', 'citations', 'troubleshooting', 'comparison'],
        config: {
          defaultModel: modelId,
          temperature: 0.2,
          maxContextChunks: 10,
          requireCitations: true,
          fallbackBehavior: 'not_found',
        },
      },
      overrideAccess: true,
    });
    engineeringId = created.id;
  } else {
    await payload.update({
      collection: 'ai-assistants',
      id: engineeringId,
      data: {
        promptVersion: '2',
        capabilities: ['rag', 'citations', 'troubleshooting', 'comparison'],
        config: {
          ...(assistants.docs[0].config || {}),
          temperature: 0.2,
          defaultModel: modelId,
          requireCitations: true,
        },
      },
      overrideAccess: true,
    });
  }

  const promptBodies = {
    system:
      'Você é o Engenharia IA da Omnia Frigo Holding. Apoie engenharia, instalação, manutenção, comissionamento, operação, troubleshooting, eficiência energética, automação e HVAC-R com precisão técnica, sempre fundamentado nas FONTES.',
    security:
      'Nunca invente normas, dimensionamentos, diagnósticos definitivos ou cálculos. Não use documentos internos restritos. Se não houver fonte, diga que não encontrou. Sempre indique que a confirmação depende de inspeção técnica.',
    style:
      'Tom profissional, neutro e estruturado. Use seções claras. Evite jargão desnecessário sem deixar de ser técnico.',
    domain:
      'Domínio: refrigeração comercial/industrial, HVAC-R, automação, eficiência energética, procedimentos e documentação técnica autorizada do Knowledge Hub.',
  };

  for (const [kind, body] of Object.entries(promptBodies)) {
    const existing = await payload.find({
      collection: 'ai-prompts',
      where: {
        and: [
          { assistant: { equals: engineeringId } },
          { kind: { equals: kind } },
          { version: { equals: 2 } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      title: `engineering:${kind}:v2`,
      assistant: engineeringId,
      kind,
      version: 2,
      body,
      active: true,
      status: 'active',
      author: 'seed-engineering-ia',
      changelog: 'EPIC 13 engineering prompts v2',
    };
    if (existing.docs[0]) {
      await payload.update({
        collection: 'ai-prompts',
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      });
    } else {
      await payload.create({ collection: 'ai-prompts', data, overrideAccess: true });
    }
    const v1 = await payload.find({
      collection: 'ai-prompts',
      where: {
        and: [
          { assistant: { equals: engineeringId } },
          { kind: { equals: kind } },
          { version: { equals: 1 } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    if (v1.docs[0]) {
      await payload.update({
        collection: 'ai-prompts',
        id: v1.docs[0].id,
        data: { active: false, status: 'retired' },
        overrideAccess: true,
      });
    }
  }

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('ENGINEERING_SEED_REQUIRES_LMS_CORE');

  const conceptAsk = await runNeurofrigoAsk(payload, {
    question: 'Explique o conceito de evaporação em sistemas de refrigeração industrial',
    assistantId: 'engineering',
    identity: { userId: 'engineering-admin', role: 'admin', language: 'pt-BR' },
    course: { courseId: String(course.id), courseTitle: String(course.title || '') },
  });

  const tsAsk = await runNeurofrigoAsk(payload, {
    question: 'Diagnóstico de falha: alarme de alta pressão no compressor',
    assistantId: 'engineering',
    identity: { userId: 'engineering-admin', role: 'admin', language: 'pt-BR' },
    course: { courseId: String(course.id), courseTitle: String(course.title || '') },
  });

  const compareAsk = await runNeurofrigoAsk(payload, {
    question: 'Compare CO2 versus HFC em refrigeração industrial',
    assistantId: 'engineering',
    identity: { userId: 'engineering-admin', role: 'admin', language: 'pt-BR' },
    course: { courseId: String(course.id), courseTitle: String(course.title || '') },
  });

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'diagnóstico teste',
      assistantId: 'engineering',
      orchestrate: false,
      identity: { userId: 'engineering-student', role: 'student', language: 'pt-BR' },
      course: { courseId: String(course.id), courseTitle: String(course.title || '') },
    });
  } catch (err) {
    forbiddenOk = err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }

  const allowedStudent = await listAllowedAssistants(payload, { role: 'student' });
  const allowedAdmin = await listAllowedAssistants(payload, { role: 'admin' });

  await refreshEngineeringAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'engineering-ai-dashboard',
    overrideAccess: true,
  });

  const profileCount = (
    await payload.find({
      collection: 'engineering-profiles',
      where: { status: { equals: 'active' } },
      limit: 10,
      overrideAccess: true,
    })
  ).totalDocs;

  console.log(
    'ENGINEERING_IA_SEED',
    JSON.stringify({
      profiles: profileCount,
      conceptStatus: conceptAsk.answer.status,
      conceptKey: conceptAsk.assistantKey,
      hasTroubleshooting: Boolean(tsAsk.troubleshootingMarkdown),
      hasComparison: Boolean(compareAsk.comparisonMarkdown),
      forbiddenOk,
      studentHasEngineering: allowedStudent.allowedAssistants.some(
        (a: { key: string }) => a.key === 'engineering',
      ),
      adminHasEngineering: allowedAdmin.allowedAssistants.some(
        (a: { key: string }) => a.key === 'engineering',
      ),
      consultations: dash.consultationsCount,
      troubleshootingCount: dash.troubleshootingCount,
      comparisonsCount: dash.comparisonsCount,
    }),
  );

  if (profileCount < 1) throw new Error('EXPECTED_ENGINEERING_PROFILE');
  if (conceptAsk.assistantKey !== 'engineering') throw new Error('EXPECTED_ENGINEERING_KEY');
  if (!tsAsk.troubleshootingMarkdown) throw new Error('EXPECTED_TROUBLESHOOTING_MARKDOWN');
  if (!compareAsk.comparisonMarkdown) throw new Error('EXPECTED_COMPARISON_MARKDOWN');
  if (!forbiddenOk) throw new Error('EXPECTED_STUDENT_FORBIDDEN_ENGINEERING');
  if (allowedStudent.allowedAssistants.some((a: { key: string }) => a.key === 'engineering')) {
    throw new Error('UNEXPECTED_STUDENT_ENGINEERING');
  }
  if (!allowedAdmin.allowedAssistants.some((a: { key: string }) => a.key === 'engineering')) {
    throw new Error('EXPECTED_ADMIN_ENGINEERING');
  }

  console.log('ENGINEERING_IA_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
