/**
 * Homolog EPIC 15 — Adaptive Learning Engine.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { recalculateSipProfile } = await import('../services/sip/profile');
  const { runAdaptiveDecide } = await import('../services/adaptive/decide');
  const { runTutorAsk } = await import('../services/tutor/ask');
  const { refreshAdaptiveDashboard } = await import('../services/adaptive/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('E15_HOMOLOG_REQUIRES_LMS_CORE');
  const courseId = String(course.id);

  const scenarios: Array<{ id: string; userKey: string; question: string }> = [
    { id: 'A', userKey: 'e15-new', question: 'Por onde começo no curso?' },
    { id: 'B', userKey: 'e15-mid', question: 'Continuei 25% — o que vem agora?' },
    { id: 'E', userKey: 'e15-review', question: 'Estou com dificuldade em comandos elétricos' },
    { id: 'I', userKey: 'e15-tutor', question: 'O que devo estudar agora?' },
  ];

  const results: Array<Record<string, unknown>> = [];
  for (const s of scenarios) {
    await runTutorAsk(payload, {
      question: s.question,
      userId: s.userKey,
      role: 'student',
      courseId,
      courseTitle: String(course.title || ''),
    });
    await recalculateSipProfile(payload, { userKey: s.userKey, courseId });
    const decide = await runAdaptiveDecide(payload, { userKey: s.userKey, courseId });
    results.push({
      id: s.id,
      actionType: decide.nextBest?.actionType || null,
      hasFriendly: Boolean(decide.nextBest?.reasonFriendly),
      factors: decide.nextBest?.factors?.map((f) => f.key) || [],
      decideMs: decide.decideMs,
      planSteps: decide.plan.steps.length,
    });
    if (!decide.nextBest) throw new Error(`E15_NO_ACTION_${s.id}`);
  }

  // J: isolamento — student A não vê decisão de B via userKey mismatch (endpoint logic tested by direct call with wrong key assertion in service layer)
  const a = await runAdaptiveDecide(payload, { userKey: 'e15-new', courseId });
  const b = await runAdaptiveDecide(payload, { userKey: 'e15-mid', courseId });
  if (a.nextBest && b.nextBest && a.plan.userKey === b.plan.userKey) {
    throw new Error('E15_ISOLATION_USERKEY');
  }
  if (a.plan.userKey !== 'e15-new' || b.plan.userKey !== 'e15-mid') {
    throw new Error('E15_ISOLATION_MISMATCH');
  }

  // H: recalcular após nova evidência
  const before = await runAdaptiveDecide(payload, { userKey: 'e15-review', courseId });
  await runTutorAsk(payload, {
    question: 'Agora entendi comandos — explique termodinâmica do evaporador',
    userId: 'e15-review',
    role: 'student',
    courseId,
    courseTitle: String(course.title || ''),
  });
  await recalculateSipProfile(payload, { userKey: 'e15-review', courseId });
  const after = await runAdaptiveDecide(payload, { userKey: 'e15-review', courseId });

  await refreshAdaptiveDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'adaptive-learning-dashboard',
    overrideAccess: true,
  });
  const audits = await payload.find({
    collection: 'adaptive-decisions',
    limit: 1,
    overrideAccess: true,
  });

  const summary = {
    results,
    isolationOk: true,
    beforeAction: before.nextBest?.actionType,
    afterAction: after.nextBest?.actionType,
    dashDecisions: dash.decisionsCount,
    avgDecideMs: dash.avgDecideMs,
    auditTotal: audits.totalDocs,
  };
  console.log('E15_HOMOLOG', JSON.stringify(summary));
  if (audits.totalDocs < 1) throw new Error('E15_EXPECTED_AUDIT');
  console.log('E15_HOMOLOG_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
