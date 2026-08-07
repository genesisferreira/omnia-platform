/**
 * Seed Epic 08 — Enterprise AI Platform (5 assistentes + prompts + modelos + políticas).
 */
// @ts-nocheck — collections enterprise ainda não estão no payload-types gerado.
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { refreshEnterpriseAiDashboard } = await import('../services/enterprise/dashboard');
  const { listAllowedAssistants } = await import('../services/enterprise/resolve');

  const payload = await getPayload({ config });

  async function upsertByKey(
    collection: 'ai-models' | 'ai-assistants' | 'ai-policies',
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
  }> = [
    {
      key: 'tutor',
      name: 'Tutor IA',
      category: 'tutor',
      description: 'Tutor de aprendizagem ancorado no material do curso.',
      capabilities: ['rag', 'citations', 'study_plan'],
      defaultContext: 'Foque em educação técnica e progressão do aluno.',
    },
    {
      key: 'commercial',
      name: 'Comercial IA',
      category: 'commercial',
      description: 'Assistente comercial para propostas e posicionamento técnico-comercial.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em benefícios, escopo e clareza comercial sem inventar preços.',
    },
    {
      key: 'engineering',
      name: 'Engenharia IA',
      category: 'engineering',
      description: 'Assistente de engenharia para parâmetros e boas práticas técnicas.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em precisão técnica, parâmetros e segurança operacional.',
    },
    {
      key: 'support',
      name: 'Suporte IA',
      category: 'support',
      description: 'Assistente de suporte para troubleshooting com fontes autorizadas.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em diagnóstico passo a passo e resolução de incidentes.',
    },
    {
      key: 'command',
      name: 'Command IA',
      category: 'command',
      description: 'Assistente operacional para orientações de comando e procedimento.',
      capabilities: ['rag', 'citations'],
      defaultContext: 'Foque em checklists operacionais e conformidade com o material.',
    },
  ];

  const assistantIds = new Map<string, string | number>();
  for (const a of assistants) {
    const id = await upsertByKey('ai-assistants', 'key', a.key, {
      key: a.key,
      name: a.name,
      description: a.description,
      category: a.category,
      version: '1.0.0',
      status: 'active',
      icon: a.key,
      language: 'pt-BR',
      allowedModels: [modelId],
      defaultContext: a.defaultContext,
      capabilities: a.capabilities,
      config: {
        defaultModel: modelId,
        temperature: 0.2,
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
        changelog: 'seed enterprise-ai v1',
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

  const allAssistantIds = [...assistantIds.values()];
  const studentAssistants = [assistantIds.get('tutor')!, assistantIds.get('support')!];

  await upsertByKey('ai-policies', 'name', 'Student default assistants', {
    name: 'Student default assistants',
    assistants: studentAssistants,
    roles: ['student'],
    allowedModels: [modelId],
    priority: 20,
    enabled: true,
  });

  await upsertByKey('ai-policies', 'name', 'Staff all assistants', {
    name: 'Staff all assistants',
    assistants: allAssistantIds,
    roles: ['admin', 'teacher', 'super_admin', 'publisher'],
    allowedModels: [modelId],
    priority: 50,
    enabled: true,
  });

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

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'teste política',
      assistantId: 'commercial',
      identity: { userId: 'enterprise-student', role: 'student', language: 'pt-BR' },
      course: { courseId: String(course.id), courseTitle: String(course.title || '') },
    });
  } catch (err) {
    forbiddenOk =
      err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }

  const allowedStudent = await listAllowedAssistants(payload, { role: 'student' });
  const allowedAdmin = await listAllowedAssistants(payload, { role: 'admin' });

  await refreshEnterpriseAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'enterprise-ai-dashboard',
    overrideAccess: true,
  });

  const assistantCount = (
    await payload.find({ collection: 'ai-assistants', limit: 20, overrideAccess: true })
  ).totalDocs;
  const promptCount = (
    await payload.find({ collection: 'ai-prompts', limit: 100, overrideAccess: true })
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
      studentAllowed: allowedStudent.allowedAssistants.map((a) => a.key),
      adminAllowed: allowedAdmin.allowedAssistants.map((a) => a.key),
      forbiddenOk,
      dashboardSessions: dash.sessionsCount,
    }),
  );

  if (assistantCount < 5) throw new Error('EXPECTED_5_ASSISTANTS');
  if (promptCount < 20) throw new Error('EXPECTED_VERSIONED_PROMPTS');
  if (!forbiddenOk) throw new Error('EXPECTED_POLICY_FORBIDDEN_COMMERCIAL_FOR_STUDENT');
  if (!allowedStudent.allowedAssistants.some((a) => a.key === 'tutor')) {
    throw new Error('EXPECTED_STUDENT_TUTOR');
  }
  if (allowedStudent.allowedAssistants.some((a) => a.key === 'commercial')) {
    throw new Error('UNEXPECTED_STUDENT_COMMERCIAL');
  }
  if (allowedAdmin.allowedAssistants.length < 5) {
    throw new Error('EXPECTED_ADMIN_ALL_ASSISTANTS');
  }
  if (tutorAsk.assistantKey !== 'tutor') throw new Error('EXPECTED_TUTOR_KEY');
  if (engineeringAsk.assistantKey !== 'engineering') {
    throw new Error('EXPECTED_ENGINEERING_KEY');
  }

  console.log('ENTERPRISE_AI_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
