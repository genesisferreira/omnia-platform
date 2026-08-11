/**
 * Seed Epic 15 — Adaptive Learning Engine.
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

  const existingPolicy = await payload.find({
    collection: 'adaptive-policies',
    where: { key: { equals: 'global-default' } },
    limit: 1,
    overrideAccess: true,
  });
  const policyData = {
    key: 'global-default',
    version: '1.0.0',
    scope: 'global',
    minimumCompetencyScore: 0.45,
    reviewThreshold: 0.4,
    assessmentThreshold: 0.7,
    staleKnowledgeDays: 14,
    maxRecommendations: 5,
    minimumEvidenceCount: 2,
    reviewRiskThreshold: 0.6,
    skillGapThreshold: 0.45,
    status: 'active',
  };
  if (existingPolicy.docs[0]) {
    await payload.update({
      collection: 'adaptive-policies',
      id: existingPolicy.docs[0].id,
      data: policyData,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'adaptive-policies',
      data: policyData,
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
  if (!course) throw new Error('ADAPTIVE_SEED_REQUIRES_LMS_CORE');
  const courseId = String(course.id);
  const userKey = 'adaptive-seed-student';

  await runTutorAsk(payload, {
    question: 'O que devo estudar agora sobre comandos elétricos?',
    userId: userKey,
    role: 'student',
    courseId,
    courseTitle: String(course.title || ''),
  });

  await recalculateSipProfile(payload, { userKey, courseId });
  const decide = await runAdaptiveDecide(payload, { userKey, courseId });

  await refreshAdaptiveDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'adaptive-learning-dashboard',
    overrideAccess: true,
  });
  const decisions = await payload.find({
    collection: 'adaptive-decisions',
    where: { userKey: { equals: userKey } },
    limit: 5,
    overrideAccess: true,
  });

  const summary = {
    hasNextBest: Boolean(decide.nextBest),
    actionType: decide.nextBest?.actionType || null,
    planSteps: decide.plan.steps.length,
    decideMs: decide.decideMs,
    decisionsPersisted: decisions.totalDocs,
    hasTutorHint: decide.tutorHint.includes('ADAPTIVE_NEXT_BEST'),
    dashDecisions: dash.decisionsCount,
    policyVersion: decide.policy.version,
  };
  console.log('ADAPTIVE_LEARNING_SEED', JSON.stringify(summary));

  if (!decide.nextBest) throw new Error('EXPECTED_NEXT_BEST');
  if (!decide.nextBest.factors?.length) throw new Error('EXPECTED_FACTORS');
  if (decisions.totalDocs < 1) throw new Error('EXPECTED_AUDIT_DECISION');
  if (!decide.tutorHint.includes('ADAPTIVE_NEXT_BEST')) throw new Error('EXPECTED_TUTOR_HINT');

  console.log('ADAPTIVE_LEARNING_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
