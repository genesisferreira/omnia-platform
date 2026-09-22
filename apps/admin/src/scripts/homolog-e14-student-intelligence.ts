/**
 * Homolog EPIC 14 — Student Intelligence Platform.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { recalculateSipProfile, getSipAssistantContext, updateSipMotivation } =
    await import('../services/sip/profile');
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
  if (!course) throw new Error('E14_HOMOLOG_REQUIRES_LMS_CORE');
  const courseId = String(course.id);
  const userKey = 'e14-homolog-student';

  await runTutorAsk(payload, {
    question: 'Quais os fundamentos de eletricidade em HVAC?',
    userId: userKey,
    role: 'student',
    courseId,
    courseTitle: String(course.title || ''),
  });

  const first = await recalculateSipProfile(payload, { userKey, courseId });
  const second = await recalculateSipProfile(payload, { userKey, courseId });
  if (second.twin.version < 1) throw new Error('E14_EXPECTED_RECALC');

  await updateSipMotivation(payload, {
    userKey,
    courseId,
    goals: ['hvac', 'emprego'],
    notes: 'Meta profissional declarada',
  });

  const ctx = await getSipAssistantContext(payload, {
    userKey,
    courseId,
    ensureFresh: false,
  });
  if (!ctx?.summaryText.includes('SIP_STUDENT_CONTEXT')) {
    throw new Error('E14_EXPECTED_CONTEXT');
  }

  const tutor = await runTutorAsk(payload, {
    question: 'Monte um plano de estudo para automação',
    userId: userKey,
    role: 'student',
    courseId,
    courseTitle: String(course.title || ''),
    requestStudyPlan: true,
  });
  if (!tutor.recommendations) throw new Error('E14_EXPECTED_TUTOR_RECS');

  const eng = await runNeurofrigoAsk(payload, {
    question: 'Diagnóstico de falha: alarme de alta pressão',
    assistantId: 'engineering',
    identity: { userId: userKey, role: 'admin', language: 'pt-BR' },
    course: { courseId, courseTitle: String(course.title || '') },
  });
  if (eng.assistantKey !== 'engineering') throw new Error('E14_ENGINEERING_KEY');

  // ACL: student não lê dashboard admin via staff — audit existe
  const audits = await payload.find({
    collection: 'sip-audit-events',
    where: { userKey: { equals: userKey } },
    limit: 10,
    overrideAccess: true,
  });
  if (audits.totalDocs < 1) throw new Error('E14_EXPECTED_AUDIT');

  await refreshSipDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'sip-dashboard',
    overrideAccess: true,
  });

  const summary = {
    competencies: first.twin.competencies.length,
    recommendations: second.twin.recommendations.length,
    insightsImt: second.twin.insights.imt,
    portalHideImt: !('imt' in second.portal),
    auditCount: audits.totalDocs,
    tutorLevel: tutor.level,
    engineeringTs: Boolean(eng.troubleshootingMarkdown),
    dashProfiles: dash.profilesCount,
    studentsAtRisk: dash.studentsAtRisk,
    avgImt: dash.avgImt,
  };
  console.log('E14_HOMOLOG', JSON.stringify(summary));
  console.log('E14_HOMOLOG_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
