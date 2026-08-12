/**
 * Homolog EPIC 12 — Comercial IA.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { listAllowedAssistants } = await import('../services/enterprise/resolve');
  const { refreshCommercialAiDashboard } = await import('../services/commercial/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('E12_HOMOLOG_REQUIRES_LMS_CORE');
  const courseCtx = {
    courseId: String(course.id),
    courseTitle: String(course.title || ''),
  };

  const cases = [
    {
      id: 'product',
      question: 'Explique o portfólio Omnia Platform para o time comercial',
    },
    {
      id: 'compare',
      question: 'Compare a abordagem de implantação da Omnia com foco em benefícios para o cliente',
    },
    {
      id: 'proposal',
      question: 'Monte uma proposta comercial para a Fase 1 da Omnia Platform',
    },
    {
      id: 'courses',
      question: 'Quais treinamentos ou cursos relacionados posso recomendar na pré-venda?',
    },
  ];

  const results: Array<Record<string, unknown>> = [];
  for (const c of cases) {
    const ask = await runNeurofrigoAsk(payload, {
      question: c.question,
      assistantId: 'commercial',
      identity: { userId: 'e12-admin', role: 'admin', language: 'pt-BR' },
      course: courseCtx,
    });
    results.push({
      id: c.id,
      assistantKey: ask.assistantKey,
      status: ask.answer.status,
      sourceCount: ask.answer.sources.length,
      hasProposal: Boolean(ask.proposalMarkdown),
      grounding: ask.answer.grounding?.score ?? null,
      hasExplainability: Boolean(ask.answer.explainability),
    });
    if (ask.assistantKey !== 'commercial') throw new Error(`E12_KEY_${c.id}`);
  }

  if (!results.find((r) => r.id === 'proposal' && r.hasProposal)) {
    throw new Error('E12_EXPECTED_PROPOSAL');
  }

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'proposta',
      assistantId: 'commercial',
      orchestrate: false,
      identity: { userId: 'e12-student', role: 'student', language: 'pt-BR' },
      course: courseCtx,
    });
  } catch (err) {
    forbiddenOk = err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }
  if (!forbiddenOk) throw new Error('E12_EXPECTED_FORBIDDEN');

  const student = await listAllowedAssistants(payload, { role: 'student' });
  if (student.allowedAssistants.some((a: { key: string }) => a.key === 'commercial')) {
    throw new Error('E12_UNEXPECTED_STUDENT_COMMERCIAL');
  }

  await refreshCommercialAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'commercial-ai-dashboard',
    overrideAccess: true,
  });

  const summary = {
    results,
    forbiddenOk,
    consultationsCount: dash.consultationsCount,
    proposalsGenerated: dash.proposalsGenerated,
    avgGroundingScore: dash.avgGroundingScore,
    avgTookMs: dash.avgTookMs,
  };
  console.log('E12_HOMOLOG', JSON.stringify(summary));
  console.log('E12_HOMOLOG_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
