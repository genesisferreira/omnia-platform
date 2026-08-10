/**
 * Seed Epic 12 — Comercial IA (profile + prompts + smoke).
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { refreshCommercialAiDashboard } = await import('../services/commercial/dashboard');
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
        defaultTemperature: 0.5,
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
    collection: 'commercial-profiles',
    where: { key: { equals: 'omnia-frigo-holding' } },
    limit: 1,
    overrideAccess: true,
  });
  const profileData = {
    key: 'omnia-frigo-holding',
    name: 'Omnia Frigo Holding — Comercial',
    company: holding?.id,
    companyName: String(holding?.name || 'Omnia Frigo Holding'),
    segment: 'refrigeracao-industrial',
    region: 'BR',
    language: 'pt-BR',
    allowedCatalog: [
      'Neurofrigo',
      'Omnia Platform',
      'Omnia LMS',
      'Treinamentos técnicos',
      'Consultoria de implantação',
    ],
    businessLines: [
      'Controle CO2',
      'Plataforma Omnia',
      'Formação técnica',
      'Suporte e implantação',
    ],
    commercialPolicy:
      'Não inventar preços, prazos ou SLAs. Usar somente documentos publicados e autorizados para vendas (institucionais/comerciais/técnicos liberados). Nunca citar INTERNAL_RESTRICTED.',
    allowedModels: [modelId],
    status: 'active',
  };
  if (existingProfile.docs[0]) {
    await payload.update({
      collection: 'commercial-profiles',
      id: existingProfile.docs[0].id,
      data: profileData,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'commercial-profiles',
      data: profileData,
      overrideAccess: true,
    });
  }

  const assistants = await payload.find({
    collection: 'ai-assistants',
    where: { key: { equals: 'commercial' } },
    limit: 1,
    overrideAccess: true,
  });
  let commercialId = assistants.docs[0]?.id;
  if (!commercialId) {
    const created = await payload.create({
      collection: 'ai-assistants',
      data: {
        key: 'commercial',
        slug: 'commercial',
        name: 'Comercial IA',
        category: 'commercial',
        version: '1.2.0',
        status: 'active',
        visibility: 'internal',
        temperature: undefined,
        language: 'pt-BR',
        promptVersion: '2',
        modelProfile: 'grounded-default',
        allowedModels: [modelId],
        defaultContext:
          'Foque em benefícios, escopo e clareza comercial sem inventar preços.',
        capabilities: ['rag', 'citations', 'proposal'],
        config: {
          defaultModel: modelId,
          temperature: 0.5,
          maxContextChunks: 8,
          requireCitations: true,
          fallbackBehavior: 'not_found',
        },
      },
      overrideAccess: true,
    });
    commercialId = created.id;
  } else {
    await payload.update({
      collection: 'ai-assistants',
      id: commercialId,
      data: {
        promptVersion: '2',
        capabilities: ['rag', 'citations', 'proposal'],
        config: {
          ...(assistants.docs[0].config || {}),
          temperature: 0.5,
          defaultModel: modelId,
          requireCitations: true,
        },
      },
      overrideAccess: true,
    });
  }

  const promptBodies = {
    system:
      'Você é o Comercial IA da Omnia Frigo Holding. Apoie pré-venda com linguagem executiva e consultiva, sempre fundamentado nas FONTES.',
    security:
      'Nunca invente produtos, preços, prazos ou SLAs. Não use documentos internos restritos. Se não houver fonte, diga que não encontrou.',
    style:
      'Tom profissional, objetivo, sem exageros. Estruture comparações e propostas com clareza.',
    domain:
      'Domínio: portfólio Omnia/Neurofrigo, implantação, formação técnica e argumentação comercial ancorada no Knowledge Hub.',
  };

  for (const [kind, body] of Object.entries(promptBodies)) {
    const existing = await payload.find({
      collection: 'ai-prompts',
      where: {
        and: [
          { assistant: { equals: commercialId } },
          { kind: { equals: kind } },
          { version: { equals: 2 } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    const data = {
      title: `commercial:${kind}:v2`,
      assistant: commercialId,
      kind,
      version: 2,
      body,
      active: true,
      status: 'active',
      author: 'seed-commercial-ia',
      changelog: 'EPIC 12 commercial prompts v2',
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
    // retire v1 if present
    const v1 = await payload.find({
      collection: 'ai-prompts',
      where: {
        and: [
          { assistant: { equals: commercialId } },
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
  if (!course) throw new Error('COMMERCIAL_SEED_REQUIRES_LMS_CORE');

  const productAsk = await runNeurofrigoAsk(payload, {
    question: 'Quais soluções a Omnia ofereceere para implantação da plataforma?',
    assistantId: 'commercial',
    identity: { userId: 'commercial-admin', role: 'admin', language: 'pt-BR' },
    course: { courseId: String(course.id), courseTitle: String(course.title || '') },
  });

  const proposalAsk = await runNeurofrigoAsk(payload, {
    question: 'Gere uma proposta comercial para implantação da Omnia Platform Fase 1',
    assistantId: 'commercial',
    identity: { userId: 'commercial-admin', role: 'admin', language: 'pt-BR' },
    course: { courseId: String(course.id), courseTitle: String(course.title || '') },
  });

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'proposta teste',
      assistantId: 'commercial',
      orchestrate: false,
      identity: { userId: 'commercial-student', role: 'student', language: 'pt-BR' },
      course: { courseId: String(course.id), courseTitle: String(course.title || '') },
    });
  } catch (err) {
    forbiddenOk =
      err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }

  const allowedStudent = await listAllowedAssistants(payload, { role: 'student' });
  const allowedAdmin = await listAllowedAssistants(payload, { role: 'admin' });

  await refreshCommercialAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'commercial-ai-dashboard',
    overrideAccess: true,
  });

  const profileCount = (
    await payload.find({
      collection: 'commercial-profiles',
      where: { status: { equals: 'active' } },
      limit: 10,
      overrideAccess: true,
    })
  ).totalDocs;

  console.log(
    'COMMERCIAL_IA_SEED',
    JSON.stringify({
      profiles: profileCount,
      productStatus: productAsk.answer.status,
      productKey: productAsk.assistantKey,
      proposalStatus: proposalAsk.answer.status,
      hasProposal: Boolean(proposalAsk.proposalMarkdown),
      forbiddenOk,
      studentHasCommercial: allowedStudent.allowedAssistants.some(
        (a: { key: string }) => a.key === 'commercial',
      ),
      adminHasCommercial: allowedAdmin.allowedAssistants.some(
        (a: { key: string }) => a.key === 'commercial',
      ),
      consultations: dash.consultationsCount,
      proposalsGenerated: dash.proposalsGenerated,
    }),
  );

  if (profileCount < 1) throw new Error('EXPECTED_COMMERCIAL_PROFILE');
  if (productAsk.assistantKey !== 'commercial') throw new Error('EXPECTED_COMMERCIAL_KEY');
  if (!proposalAsk.proposalMarkdown) throw new Error('EXPECTED_PROPOSAL_MARKDOWN');
  if (!forbiddenOk) throw new Error('EXPECTED_STUDENT_FORBIDDEN_COMMERCIAL');
  if (allowedStudent.allowedAssistants.some((a: { key: string }) => a.key === 'commercial')) {
    throw new Error('UNEXPECTED_STUDENT_COMMERCIAL');
  }
  if (!allowedAdmin.allowedAssistants.some((a: { key: string }) => a.key === 'commercial')) {
    throw new Error('EXPECTED_ADMIN_COMMERCIAL');
  }

  console.log('COMMERCIAL_IA_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
