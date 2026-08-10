/**
 * Homolog EPIC 11 — troca dinâmica, ACL, policy audit, dashboard.
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { planPromptRollback } = await import('@omnia/enterprise-ai');
  const { runNeurofrigoAsk } = await import('../services/neurofrigo/ask');
  const { listAllowedAssistants, resolveAssistantForAsk } = await import(
    '../services/enterprise/resolve'
  );
  const { loadPrompts } = await import('../services/enterprise/registry');
  const { refreshEnterpriseAiDashboard } = await import('../services/enterprise/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = await getPayload({ config });

  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('E11_HOMOLOG_REQUIRES_LMS_CORE');

  const courseCtx = {
    courseId: String(course.id),
    courseTitle: String(course.title || ''),
  };

  const switches: Array<{ id: string; role: string; assistantId: string }> = [
    { id: 'tutor', role: 'student', assistantId: 'tutor' },
    { id: 'support', role: 'student', assistantId: 'support' },
    { id: 'concierge', role: 'student', assistantId: 'concierge' },
    { id: 'engineering', role: 'admin', assistantId: 'engineering' },
    { id: 'commercial', role: 'admin', assistantId: 'commercial' },
    { id: 'evaluator', role: 'admin', assistantId: 'evaluator' },
    { id: 'command', role: 'admin', assistantId: 'command' },
  ];

  const results: Array<Record<string, unknown>> = [];
  for (const row of switches) {
    const ask = await runNeurofrigoAsk(payload, {
      question: `Homolog EPIC11 ${row.id}: o que é o ciclo de compressão?`,
      assistantId: row.assistantId,
      identity: {
        userId: `e11-${row.role}`,
        role: row.role,
        language: 'pt-BR',
      },
      course: courseCtx,
    });
    results.push({
      id: row.id,
      assistantKey: ask.assistantKey,
      modelKey: ask.modelKey,
      status: ask.answer.status,
      policyAllowed: ask.policyDecision?.allowed ?? null,
      policyReason: ask.policyDecision?.reason ?? null,
      grounding: ask.policyDecision?.requireGrounding ?? null,
    });
    if (ask.assistantKey !== row.assistantId) {
      throw new Error(`E11_SWITCH_MISMATCH:${row.id}`);
    }
  }

  let forbiddenOk = false;
  try {
    await runNeurofrigoAsk(payload, {
      question: 'forbidden commercial',
      assistantId: 'commercial',
      orchestrate: false,
      identity: { userId: 'e11-student', role: 'student', language: 'pt-BR' },
      course: courseCtx,
    });
  } catch (err) {
    forbiddenOk =
      err instanceof Error && err.message.startsWith('ASSISTANT_FORBIDDEN');
  }
  if (!forbiddenOk) throw new Error('E11_EXPECTED_FORBIDDEN_COMMERCIAL');

  const student = await listAllowedAssistants(payload, { role: 'student' });
  const admin = await listAllowedAssistants(payload, { role: 'admin' });

  const resolvedTutor = await resolveAssistantForAsk(payload, {
    assistantId: 'tutor',
    subject: { role: 'student', courseId: courseCtx.courseId },
  });

  const prompts = await loadPrompts(payload);
  const rollback = planPromptRollback({
    prompts,
    assistantKey: 'tutor',
    kind: 'system',
  });

  await refreshEnterpriseAiDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'enterprise-ai-dashboard',
    overrideAccess: true,
  });

  const assistantCount = (
    await payload.find({
      collection: 'ai-assistants',
      where: { status: { equals: 'active' } },
      limit: 50,
      overrideAccess: true,
    })
  ).totalDocs;

  const summary = {
    switches: results,
    forbiddenOk,
    studentAllowed: student.allowedAssistants.map((a: { key: string }) => a.key),
    adminAllowed: admin.allowedAssistants.map((a: { key: string }) => a.key),
    tutorTemperature: resolvedTutor.temperature,
    tutorModel: resolvedTutor.model?.key ?? null,
    rollback,
    activeAssistantsCount: dash.activeAssistantsCount ?? assistantCount,
    sessionsCount: dash.sessionsCount,
    usageByProvider: dash.usageByProvider,
    satisfactionScore: dash.satisfactionScore,
  };

  console.log('E11_HOMOLOG', JSON.stringify(summary));

  if (assistantCount < 7) throw new Error('E11_EXPECTED_7_ACTIVE');
  if (!student.allowedAssistants.some((a: { key: string }) => a.key === 'concierge')) {
    throw new Error('E11_EXPECTED_STUDENT_CONCIERGE');
  }
  if (admin.allowedAssistants.length < 7) throw new Error('E11_EXPECTED_ADMIN_ALL');
  if (!admin.allowedAssistants.some((a: { key: string }) => a.key === 'evaluator')) {
    throw new Error('E11_EXPECTED_ADMIN_EVALUATOR');
  }
  const studentKeys = new Set(student.allowedAssistants.map((a: { key: string }) => a.key));
  if (studentKeys.has('commercial')) throw new Error('E11_UNEXPECTED_STUDENT_COMMERCIAL');
  if (![...studentKeys].every((k) => ['tutor', 'support', 'concierge'].includes(k))) {
    throw new Error(`E11_UNEXPECTED_STUDENT_SET:${[...studentKeys].join(',')}`);
  }
  if (resolvedTutor.temperature !== 0.2) throw new Error('E11_EXPECTED_TUTOR_TEMP');
  if (!resolvedTutor.policyDecision?.allowed) throw new Error('E11_EXPECTED_POLICY_AUDIT');

  console.log('E11_HOMOLOG_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
