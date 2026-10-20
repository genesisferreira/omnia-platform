/**
 * Homolog EPIC 13 — Engenharia IA.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { listAllowedAssistants } = await import('../services/enterprise/resolve');
  const { refreshEngineeringAiDashboard } = await import('../services/engineering/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('E13_HOMOLOG_REQUIRES_LMS_CORE');
  const courseCtx = {
    courseId: String(course.id),
    courseTitle: String(course.title || ''),
  };

  const cases = [
    {
      id: 'concept',
      question: 'Explique o conceito de compressão em sistemas de refrigeração',
      expectTs: false,
      expectCmp: false,
    },
    {
      id: 'compare',
      question: 'Compare válvula eletrônica versus termostática',
      expectTs: false,
      expectCmp: true,
    },
    {
      id: 'troubleshooting',
      question: 'Diagnóstico de falha: alarme de baixa pressão no evaporador',
      expectTs: true,
      expectCmp: false,
    },
    {
      id: 'courses',
      question: 'Quais cursos ou materiais relacionados a manutenção posso recomendar?',
      expectTs: false,
      expectCmp: false,
    },
  ];

  const results: Array<Record<string, unknown>> = [];
  for (const c of cases) {
    const ask = await runNeurofrigoAsk(payload, {
      question: c.question,
      assistantId: 'engineering',
      identity: { userId: 'e13-admin', role: 'admin', language: 'pt-BR' },
      course: courseCtx,
    });
    results.push({
      id: c.id,
      assistantKey: ask.assistantKey,
      status: ask.answer.status,
      sourceCount: ask.answer.sources.length,
      hasTroubleshooting: Boolean(ask.troubleshootingMarkdown),
      hasComparison: Boolean(ask.comparisonMarkdown),
      grounding: ask.answer.grounding?.score ?? null,
      hasExplainability: Boolean(ask.answer.explainability),
    });
    if (ask.assistantKey !== 'engineering') throw new Error(`E13_KEY_${c.id}`);
    if (c.expectTs && !ask.troubleshootingMarkdown) throw new Error(`E13_EXPECTED_TS_${c.id}`);
    if (c.expectCmp && !ask.comparisonMarkdown) throw new Error(`E13_EXPECTED_CMP_${c.id}`);
  }

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'diagnóstico',
      assistantId: 'engineering',
      orchestrate: false,
      identity: { userId: 'e13-student', role: 'student', language: 'pt-BR' },
      course: courseCtx,
    });
  } catch (err) {
    forbiddenOk = err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }
  if (!forbiddenOk) throw new Error('E13_EXPECTED_FORBIDDEN');

  const student = await listAllowedAssistants(payload, { role: 'student' });
  if (student.allowedAssistants.some((a: { key: string }) => a.key === 'engineering')) {
    throw new Error('E13_UNEXPECTED_STUDENT_ENGINEERING');
  }

  await refreshEngineeringAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'engineering-ai-dashboard',
    overrideAccess: true,
  });

  const summary = {
    results,
    forbiddenOk,
    consultationsCount: dash.consultationsCount,
    troubleshootingCount: dash.troubleshootingCount,
    comparisonsCount: dash.comparisonsCount,
    avgGroundingScore: dash.avgGroundingScore,
    avgTookMs: dash.avgTookMs,
  };
  console.log('E13_HOMOLOG', JSON.stringify(summary));
  console.log('E13_HOMOLOG_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
