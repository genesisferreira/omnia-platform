/**
 * Seed Epic 08/11 — Enterprise AI Platform (7 assistentes + prompts + modelos + políticas).
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { refreshEnterpriseAiDashboard } = await import('../services/enterprise/dashboard');
  const { listAllowedAssistants } = await import('../services/enterprise/resolve');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- collections enterprise ainda fora do payload-types
  const payload: any = await getPayload({ config });

  async function upsertByKey(
    collection: string,
    whereField: string,
    whereValue: string,
    data: Record<string, unknown>,
  ): Promise<string | number> {
    const existing = await payload.find({
      collection,
      where: { [whereField]: { equals: whereValue } },
      limit: 1,
      overrideAccess: true,
    });
    if (existing.docs[0]) {
      const updated = await payload.update({
        collection,
        id: existing.docs[0].id,
        data,
        overrideAccess: true,
      });
      return updated.id;
    }
    const created = await payload.create({
      collection,
      data,
      overrideAccess: true,
    });
    return created.id;
  }

  const modelId = await upsertByKey('ai-models', 'key', 'grounded-default', {
    key: 'grounded-default',
    provider: 'grounded',
    model: 'grounded-extractive-v1',
    estimatedCostPer1kTokens: 0,
    maxContextTokens: 8000,
    defaultTemperature: 0.2,
    capabilities: ['extractive', 'citations'],
    status: 'active',
    priority: 100,
  });

  const assistants: Array<{
    key: string;
    name: string;
    category: string;
    description: string;
    capabilities: string[];
    defaultContext: string;
    temperature: number;
    color: string;
    visibility: string;
  }> = [
    {
      key: 'tutor',
      name: 'Tutor IA',
      category: 'tutor',
      description: 'Tutor de aprendizagem ancorado no material do curso.',
      capabilities: ['rag', 'citations', 'study_plan'],
      defaultContext: 'Foque em educação técnica e progressão do aluno.',
      temperature: 0.2,
      color: '#0B6E4F',
      visibility: 'public',
    },
    {
      key: 'commercial',
      name: 'Comercial IA',
      category: 'commercial',
      description: 'Assistente comercial para propostas e posicionamento técnico-comercial.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em benefícios, escopo e clareza comercial sem inventar preços.',
      temperature: 0.5,
      color: '#1D4ED8',
      visibility: 'internal',
    },
    {
      key: 'engineering',
      name: 'Engenharia IA',
      category: 'engineering',
      description: 'Assistente de engenharia para parâmetros e boas práticas técnicas.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em precisão técnica, parâmetros e segurança operacional.',
      temperature: 0.15,
      color: '#0F766E',
      visibility: 'internal',
    },
    {
      key: 'support',
      name: 'Suporte IA',
      category: 'support',
      description: 'Assistente de suporte para troubleshooting com fontes autorizadas.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em diagnóstico passo a passo e resolução de incidentes.',
      temperature: 0.25,
      color: '#B45309',
      visibility: 'public',
    },
    {
      key: 'command',
      name: 'Command IA',
      category: 'command',
      description: 'Assistente operacional para orientações de comando e procedimento.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em checklists operacionais e conformidade com o material.',
      temperature: 0.1,
      color: '#7C2D12',
      visibility: 'restricted',
    },
    {
      key: 'concierge',
      name: 'Concierge IA',
      category: 'concierge',
      description: 'Assistente de acolhimento e navegação na plataforma.',
      capabilities: ['rag', 'citations', 'routing'],
      defaultContext: 'Foque em orientar o usuário para o assistente/conteúdo adequado.',
      temperature: 0.35,
      color: '#4338CA',
      visibility: 'public',
    },
    {
      key: 'evaluator',
      name: 'Evaluator IA',
      category: 'evaluator',
      description: 'Assistente de avaliação formativa com base no material autorizado.',
      capabilities: ['rag', 'citations', 'assessment'],
      defaultContext: 'Foque em rubricas, feedback formativo e integridade avaliativa.',
      temperature: 0.15,
      color: '#9D174D',
      visibility: 'internal',
    },
  ];

  const assistantIds = new Map<string, string | number>();
  for (const a of assistants) {
    const id = await upsertByKey('ai-assistants', 'key', a.key, {
      key: a.key,
      slug: a.key,
      name: a.name,
      description: a.description,
      category: a.category,
      version: '1.1.0',
      status: 'active',
      icon: a.key,
      avatar: a.key,
      color: a.color,
      visibility: a.visibility,
      language: 'pt-BR',
      promptVersion: '1',
      modelProfile: 'grounded-default',
      allowedModels: [modelId],
      defaultContext: a.defaultContext,
      capabilities: a.capabilities,
      config: {
        defaultModel: modelId,
        temperature: a.temperature,
        maxContextChunks: 6,
        maxPromptTokens: 3500,
        maxCompletionTokens: 800,
        minSimilarity: 0.35,
        requireCitations: true,
        defaultLanguage: 'pt-BR',
        fallbackBehavior: 'not_found',
      },
    });
    assistantIds.set(a.key, id);
  }

  const promptBodies: Record<string, Record<string, string>> = {
    tutor: {
      system: 'Você é o Tutor IA Omnia. Ensine com clareza, citando fontes do curso.',
      security: 'Nunca invente conteúdo fora das FONTES. Não execute ferramentas.',
      style: 'Tom didático, estruturado em passos curtos.',
      domain: 'Domínio: refrigeração industrial e formação técnica LMS.',
    },
    commercial: {
      system: 'Você é o Comercial IA Omnia. Apoie conversas técnico-comerciais com fontes.',
      security: 'Não invente preços, prazos ou SLAs fora das FONTES.',
      style: 'Tom profissional, objetivo e persuasivo sem exageros.',
      domain: 'Domínio: propostas, escopo e diferenciais Omnia/Neurofrigo.',
    },
    engineering: {
      system: 'Você é o Engenharia IA Omnia. Explique parâmetros e boas práticas técnicas.',
      security: 'Não invente especificações fora das FONTES.',
      style: 'Tom técnico preciso, com listas e precauções.',
      domain: 'Domínio: engenharia de refrigeração e operação segura.',
    },
    support: {
      system: 'Você é o Suporte IA Omnia. Oriente troubleshooting com fontes autorizadas.',
      security: 'Não invente procedimentos fora das FONTES.',
      style: 'Tom calmo, checklist de diagnóstico.',
      domain: 'Domínio: suporte técnico e incidentes de campo.',
    },
    command: {
      system: 'Você é o Command IA Omnia. Oriente procedimentos operacionais com fontes.',
      security: 'Não invente comandos ou políticas fora das FONTES.',
      style: 'Tom operacional, checklist e ordem de execução.',
      domain: 'Domínio: procedimentos e conformidade operacional.',
    },
    concierge: {
      system: 'Você é o Concierge IA Omnia. Acolha e oriente o usuário na plataforma.',
      security: 'Não invente funcionalidades fora das FONTES. Não execute ferramentas.',
      style: 'Tom acolhedor, claro e breve.',
      domain: 'Domínio: navegação, onboarding e encaminhamento a especialistas.',
    },
    evaluator: {
      system: 'Você é o Evaluator IA Omnia. Avalie com rubricas e material autorizado.',
      security: 'Não invente critérios fora das FONTES. Preserve integridade avaliativa.',
      style: 'Tom formativo, objetivo e justo.',
      domain: 'Domínio: avaliação formativa e feedback técnico.',
    },
  };

  for (const [key, bodies] of Object.entries(promptBodies)) {
    const assistantId = assistantIds.get(key);
    if (!assistantId) continue;
    for (const kind of ['system', 'security', 'style', 'domain'] as const) {
      const title = `${key}:${kind}:v1`;
      const existing = await payload.find({
        collection: 'ai-prompts',
        where: {
          and: [
            { assistant: { equals: assistantId } },
            { kind: { equals: kind } },
            { version: { equals: 1 } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      });
      const data = {
        title,
        assistant: assistantId,
        kind,
        version: 1,
        body: bodies[kind],
        active: true,
        status: 'active',
        author: 'seed-enterprise-ai',
        changelog: 'seed enterprise-ai epic11 v1.1',
      };
      if (existing.docs[0]) {
        await payload.update({
          collection: 'ai-prompts',
          id: existing.docs[0].id,
          data,
          overrideAccess: true,
        });
      } else {
        await payload.create({
          collection: 'ai-prompts',
          data,
          overrideAccess: true,
        });
      }
    }
  }

  const studentAssistants = [
    assistantIds.get('tutor')!,
    assistantIds.get('support')!,
    assistantIds.get('concierge')!,
  ];

  const allActiveAssistants = await payload.find({
    collection: 'ai-assistants',
    where: { status: { equals: 'active' } },
    limit: 100,
    overrideAccess: true,
  });
  const allAssistantIds = allActiveAssistants.docs.map((d: { id: string | number }) => d.id);

  await upsertByKey('ai-policies', 'name', 'Student default assistants', {
    name: 'Student default assistants',
    assistants: studentAssistants,
    roles: ['student'],
    allowedModels: [modelId],
    requireGrounding: true,
    requireExplainability: true,
    priority: 100,
    enabled: true,
  });

  await upsertByKey('ai-policies', 'name', 'Staff all assistants', {
    name: 'Staff all assistants',
    assistants: allAssistantIds,
    roles: ['admin', 'teacher', 'super_admin', 'publisher'],
    allowedModels: [modelId],
    requireGrounding: true,
    requireExplainability: true,
    priority: 90,
    enabled: true,
  });

  // Desativa policies legadas de student que liberavam catálogo amplo (DeepSeek seed).
  const legacyStudent = await payload.find({
    collection: 'ai-policies',
    where: {
      and: [{ enabled: { equals: true } }, { name: { not_equals: 'Student default assistants' } }],
    },
    limit: 100,
    overrideAccess: true,
  });
  for (const pol of legacyStudent.docs) {
    const roles = Array.isArray(pol.roles) ? pol.roles.map(String) : [];
    if (!roles.map((r: string) => r.toLowerCase()).includes('student')) continue;
    if (Number(pol.priority || 0) >= 100) continue;
    await payload.update({
      collection: 'ai-policies',
      id: pol.id,
      data: { enabled: false },
      overrideAccess: true,
    });
  }

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('ENTERPRISE_SEED_REQUIRES_LMS_CORE');

  const tutorAsk = await runNeurofrigoAsk(payload, {
    question: 'O que é o ciclo de compressão?',
    assistantId: 'tutor',
    identity: {
      userId: 'enterprise-student',
      role: 'student',
      language: 'pt-BR',
    },
    course: {
      courseId: String(course.id),
      courseTitle: String(course.title || ''),
    },
  });

  const engineeringAsk = await runNeurofrigoAsk(payload, {
    question: 'Quais boas práticas de segurança no ciclo de compressão?',
    assistantId: 'engineering',
    identity: {
      userId: 'enterprise-admin',
      role: 'admin',
      language: 'pt-BR',
    },
    course: {
      courseId: String(course.id),
      courseTitle: String(course.title || ''),
    },
  });

  const conciergeAsk = await runNeurofrigoAsk(payload, {
    question: 'Para quem eu falo sobre proposta comercial?',
    assistantId: 'concierge',
    identity: {
      userId: 'enterprise-student',
      role: 'student',
      language: 'pt-BR',
    },
    course: {
      courseId: String(course.id),
      courseTitle: String(course.title || ''),
    },
  });

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'teste política',
      assistantId: 'commercial',
      orchestrate: false,
      identity: { userId: 'enterprise-student', role: 'student', language: 'pt-BR' },
      course: { courseId: String(course.id), courseTitle: String(course.title || '') },
    });
  } catch (err) {
    forbiddenOk = err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }

  const allowedStudent = await listAllowedAssistants(payload, { role: 'student' });
  const allowedAdmin = await listAllowedAssistants(payload, { role: 'admin' });

  await refreshEnterpriseAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'enterprise-ai-dashboard',
    overrideAccess: true,
  });

  const assistantCount = (
    await payload.find({ collection: 'ai-assistants', limit: 50, overrideAccess: true })
  ).totalDocs;
  const promptCount = (
    await payload.find({ collection: 'ai-prompts', limit: 200, overrideAccess: true })
  ).totalDocs;

  console.log(
    'ENTERPRISE_AI_SEED',
    JSON.stringify({
      assistants: assistantCount,
      prompts: promptCount,
      tutorStatus: tutorAsk.answer.status,
      tutorKey: tutorAsk.assistantKey,
      engineeringStatus: engineeringAsk.answer.status,
      engineeringKey: engineeringAsk.assistantKey,
      conciergeStatus: conciergeAsk.answer.status,
      conciergeKey: conciergeAsk.assistantKey,
      tutorPolicy: tutorAsk.policyDecision?.reason ?? null,
      studentAllowed: allowedStudent.allowedAssistants.map((a: { key: string }) => a.key),
      adminAllowed: allowedAdmin.allowedAssistants.map((a: { key: string }) => a.key),
      forbiddenOk,
      dashboardSessions: dash.sessionsCount,
      activeAssistantsCount: dash.activeAssistantsCount,
    }),
  );

  if (assistantCount < 7) throw new Error('EXPECTED_7_ASSISTANTS');
  if (promptCount < 28) throw new Error('EXPECTED_VERSIONED_PROMPTS');
  if (!forbiddenOk) throw new Error('EXPECTED_POLICY_FORBIDDEN_COMMERCIAL_FOR_STUDENT');
  if (!allowedStudent.allowedAssistants.some((a: { key: string }) => a.key === 'tutor')) {
    throw new Error('EXPECTED_STUDENT_TUTOR');
  }
  if (!allowedStudent.allowedAssistants.some((a: { key: string }) => a.key === 'concierge')) {
    throw new Error('EXPECTED_STUDENT_CONCIERGE');
  }
  if (allowedStudent.allowedAssistants.some((a: { key: string }) => a.key === 'commercial')) {
    throw new Error('UNEXPECTED_STUDENT_COMMERCIAL');
  }
  const studentKeys = new Set(allowedStudent.allowedAssistants.map((a: { key: string }) => a.key));
  if (![...studentKeys].every((k) => ['tutor', 'support', 'concierge'].includes(k))) {
    throw new Error(`UNEXPECTED_STUDENT_SET:${[...studentKeys].join(',')}`);
  }
  if (!allowedAdmin.allowedAssistants.some((a: { key: string }) => a.key === 'evaluator')) {
    throw new Error('EXPECTED_ADMIN_EVALUATOR');
  }
  if (!allowedAdmin.allowedAssistants.some((a: { key: string }) => a.key === 'command')) {
    throw new Error('EXPECTED_ADMIN_COMMAND');
  }
  if (allowedAdmin.allowedAssistants.length < 7) {
    throw new Error('EXPECTED_ADMIN_MIN_7');
  }
  if (tutorAsk.assistantKey !== 'tutor') throw new Error('EXPECTED_TUTOR_KEY');
  if (engineeringAsk.assistantKey !== 'engineering') {
    throw new Error('EXPECTED_ENGINEERING_KEY');
  }
  if (conciergeAsk.assistantKey !== 'concierge') {
    throw new Error('EXPECTED_CONCIERGE_KEY');
  }

  console.log('ENTERPRISE_AI_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
