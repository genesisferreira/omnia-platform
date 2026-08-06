/**
 * Seed Neurofrigo AI MVP — pergunta → runtime → retrieval → resposta + citações.
 * Uso: pnpm --filter @omnia/admin seed:neurofrigo-ai
 * Pré-requisito: seed:retrieval (vetores indexados).
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { refreshNeurofrigoAiDashboard } = await import('../services/neurofrigo/dashboard');

  const payload = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('NEUROFRIGO_AI_SEED_REQUIRES_LMS_CORE');

  const { answer, sessionId } = await runNeurofrigoAsk(payload, {
    question: 'Como funciona a válvula de expansão no ciclo de refrigeração?',
    identity: { userId: null, role: 'student', language: 'pt-BR' },
    course: {
      courseId: String(course.id),
      courseTitle: String(course.title || ''),
    },
  });

  console.log(
    'NEUROFRIGO_AI_ASK',
    JSON.stringify({
      sessionId,
      status: answer.status,
      tookMs: answer.tookMs,
      provider: answer.provider,
      model: answer.model,
      sources: answer.sources.length,
      confidence: answer.confidence,
      textPreview: answer.text.slice(0, 160),
    }),
  );

  await refreshNeurofrigoAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'neurofrigo-ai-dashboard',
    overrideAccess: true,
  });
  console.log(
    'NEUROFRIGO_AI_DASHBOARD',
    JSON.stringify({
      questionsCount: dash.questionsCount,
      avgTookMs: dash.avgTookMs,
      totalTokens: dash.totalTokens,
      errorCount: dash.errorCount,
    }),
  );

  if (answer.status === 'error') throw new Error('NEUROFRIGO_AI_SEED_FAILED');
  if (answer.status === 'ok' && answer.sources.length < 1) {
    throw new Error('NEUROFRIGO_AI_SEED_NO_SOURCES');
  }

  console.log('NEUROFRIGO_AI_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
