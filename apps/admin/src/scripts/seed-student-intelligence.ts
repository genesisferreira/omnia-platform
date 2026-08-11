/**
 * Seed Epic 14 — Student Intelligence Platform.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { recalculateSipProfile, getSipAssistantContext } = await import(
    '../services/sip/profile'
  );
  const { refreshSipDashboard } = await import('../services/sip/dashboard');
  const { runTutorAsk } = await import('../services/tutor/ask');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('SIP_SEED_REQUIRES_LMS_CORE');
  const courseId = String(course.id);
  const userKey = 'sip-seed-student';

  // Seed learning signal via tutor (gera evidências)
  await runTutorAsk(payload, {
    question: 'Explique termodinâmica do ciclo de refrigeração com CO2',
    userId: userKey,
    role: 'student',
    language: 'pt-BR',
    courseId,
    courseTitle: String(course.title || ''),
  });

  const { twin, portal, context } = await recalculateSipProfile(payload, {
    userKey,
    courseId,
    motivation: {
      goals: ['emprego', 'co2'],
      notes: 'Objetivo: atuação em refrigeração industrial',
      updatedByStudentAt: new Date().toISOString(),
    },
  });

  const audit = await payload.find({
    collection: 'sip-audit-events',
    where: { userKey: { equals: userKey } },
    limit: 5,
    overrideAccess: true,
  });
  const evidence = await payload.find({
    collection: 'sip-evidence',
    where: { userKey: { equals: userKey } },
    limit: 5,
    overrideAccess: true,
  });

  const sipCtx = await getSipAssistantContext(payload, {
    userKey,
    courseId,
    ensureFresh: false,
  });

  // Engenharia consome Profile Service (não altera)
  const eng = await runNeurofrigoAsk(payload, {
    question: 'Compare CO2 versus HFC de forma técnica',
    assistantId: 'engineering',
    identity: { userId: userKey, role: 'admin', language: 'pt-BR' },
    course: { courseId, courseTitle: String(course.title || '') },
  });

  await refreshSipDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'sip-dashboard',
    overrideAccess: true,
  });

  const summary = {
    profiles: twin.competencies.length,
    evidenceCount: evidence.totalDocs,
    auditCount: audit.totalDocs,
    recommendations: twin.recommendations.length,
    hasAssistantContext: Boolean(sipCtx?.summaryText?.includes('SIP_STUDENT_CONTEXT')),
    portalHasCompetencies: (portal.competencies || []).length > 0,
    portalHidesImt: !('imt' in portal),
    engineeringKey: eng.assistantKey,
    dashProfiles: dash.profilesCount,
  };
  console.log('SIP_SEED', JSON.stringify(summary));

  if (twin.competencies.length < 7) throw new Error('EXPECTED_SIP_COMPETENCIES');
  if (evidence.totalDocs < 1) throw new Error('EXPECTED_SIP_EVIDENCE');
  if (audit.totalDocs < 1) throw new Error('EXPECTED_SIP_AUDIT');
  if (!context.summaryText.includes('SIP_STUDENT_CONTEXT')) {
    throw new Error('EXPECTED_SIP_CONTEXT');
  }
  if (!portal.competencies?.length) throw new Error('EXPECTED_PORTAL_VIEW');
  if ('imt' in portal) throw new Error('PORTAL_MUST_HIDE_INTERNAL_METRICS');
  if (eng.assistantKey !== 'engineering') throw new Error('EXPECTED_ENGINEERING_CONSUME');

  console.log('SIP_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
