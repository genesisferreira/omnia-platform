/**
 * Seed Epic 06 — follow-up, explainability, grounding, feedback.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runNeurofrigoAsk, submitAiFeedback } = await import('../services/neurofrigo/ask');
  const { refreshNeurofrigoAiDashboard } = await import('../services/neurofrigo/dashboard');

  const payload = await getPayload({ config });
  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('AI_EXPERIENCE_SEED_REQUIRES_LMS_CORE');

  const first = await runNeurofrigoAsk(payload, {
    question: 'O que é a válvula de expansão termostática?',
    identity: { role: 'student', language: 'pt-BR', profileLabel: 'Aluno' },
    course: {
      courseId: String(course.id),
      courseTitle: String(course.title || ''),
      lessonObjectives: 'Compreender componentes do ciclo',
    },
  });

  const follow = await runNeurofrigoAsk(payload, {
    question: 'Como ela regula o fluxo, passo a passo?',
    sessionId: first.sessionId,
    identity: { role: 'student', language: 'pt-BR', profileLabel: 'Aluno' },
    course: {
      courseId: String(course.id),
      courseTitle: String(course.title || ''),
    },
  });

  await submitAiFeedback(payload, {
    sessionId: follow.sessionId,
    rating: 'up',
    comment: 'Resposta clara com fontes',
  });

  const empty = await runNeurofrigoAsk(payload, {
    question:
      'Qual foi o placar do jogo Flamengo contra Vasco em 12 de março de 2099 segundo o PDF deste curso?',
    identity: { role: 'student', language: 'pt-BR' },
    course: { courseId: String(course.id), courseTitle: String(course.title || '') },
  });

  await refreshNeurofrigoAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'neurofrigo-ai-dashboard',
    overrideAccess: true,
  });

  console.log(
    'AI_EXPERIENCE_SEED',
    JSON.stringify({
      first: {
        status: first.answer.status,
        intent: first.answer.intent,
        grounding: first.answer.grounding?.score,
        sources: first.answer.sources.length,
      },
      follow: {
        sessionId: follow.sessionId,
        status: follow.answer.status,
        intent: follow.answer.intent,
        sameSession: follow.sessionId === first.sessionId,
      },
      notFound: {
        status: empty.answer.status,
        textPreview: empty.answer.text.slice(0, 80),
      },
      dashboard: {
        questionsCount: dash.questionsCount,
        avgGroundingScore: dash.avgGroundingScore,
        feedbackUpCount: dash.feedbackUpCount,
        noContextRate: dash.noContextRate,
      },
    }),
  );

  if (follow.sessionId !== first.sessionId) throw new Error('FOLLOWUP_SESSION_MISMATCH');
  if (empty.answer.status !== 'not_found') throw new Error('EXPECTED_NOT_FOUND');
  if (!first.answer.explainability) throw new Error('MISSING_EXPLAINABILITY');

  console.log('AI_EXPERIENCE_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
