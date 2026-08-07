/**
 * Seed Epic 07 — Tutor IA (beginner, advanced, plan, recommendations).
 */
export {};

async function main() {
  process.env.NEUROFRIGO_LLM_PROVIDER = process.env.NEUROFRIGO_LLM_PROVIDER || 'grounded';

  const { getPayload } = await import('payload');
  const { default: config } = await import('../../payload.config');
  const { runTutorAsk } = await import('../services/tutor/ask');
  const { refreshTutorDashboard } = await import('../services/tutor/dashboard');
  const { syncStudentProfile } = await import('../services/tutor/profiles');

  const payload = await getPayload({ config });
  const courses = await payload.find({
    collection: 'courses',
    where: { slug: { equals: 'fundamentos-refrigeracao-industrial' } },
    limit: 1,
    overrideAccess: true,
  });
  const course = courses.docs[0];
  if (!course) throw new Error('TUTOR_SEED_REQUIRES_LMS_CORE');

  const courseId = String(course.id);

  const beginner = await runTutorAsk(payload, {
    question: 'O que é o ciclo de compressão e quais as boas práticas de segurança?',
    userId: 'tutor-beginner',
    role: 'student',
    language: 'pt-BR',
    courseId,
    courseTitle: String(course.title || ''),
  });

  const advancedStudent = await syncStudentProfile(payload, {
    userId: 'tutor-advanced',
    courseId,
    language: 'pt-BR',
  });
  // Marca quase todo o curso como concluído para nível avançado/especialista
  const catalogLessons = (
    await payload.find({
      collection: 'lessons',
      limit: 50,
      overrideAccess: true,
    })
  ).docs.map((l) => String(l.id));
  await payload.update({
    collection: 'student-profiles',
    id: (
      await payload.find({
        collection: 'student-profiles',
        where: {
          and: [
            { userKey: { equals: 'tutor-advanced' } },
            { course: { equals: courseId } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]!.id,
    data: {
      progressPercent: 90,
      completedLessonIds: catalogLessons,
      studyTimeMinutes: 240,
    },
    overrideAccess: true,
  });

  const advanced = await runTutorAsk(payload, {
    question: 'Detalhe parâmetros e boas práticas do ciclo de compressão.',
    userId: 'tutor-advanced',
    role: 'student',
    language: 'pt-BR',
    courseId,
    courseTitle: String(course.title || ''),
  });

  const plan = await runTutorAsk(payload, {
    question: 'Quero aprender refrigeração industrial',
    userId: 'tutor-beginner',
    role: 'student',
    courseId,
    courseTitle: String(course.title || ''),
    requestStudyPlan: true,
    objective: 'Quero aprender refrigeração industrial',
  });

  await refreshTutorDashboard(payload);
  const dash = await payload.findGlobal({
    slug: 'neurofrigo-tutor-dashboard',
    overrideAccess: true,
  });

  console.log(
    'TUTOR_IA_SEED',
    JSON.stringify({
      beginner: {
        level: beginner.level,
        status: beginner.answer.status,
        recs: beginner.recommendations.length,
        progress: beginner.student.progressPercent,
      },
      advanced: {
        level: advanced.level,
        status: advanced.answer.status,
        profileLabelHint: advanced.personalizedHint,
      },
      plan: {
        steps: plan.studyPlan?.steps.length ?? 0,
        sameRuntime: Boolean(plan.sessionId),
      },
      dashboard: {
        tutorAskCount: dash.tutorAskCount,
        studyPlansCount: dash.studyPlansCount,
        studentProfilesCount: dash.studentProfilesCount,
      },
      baselineProgress: advancedStudent.progressPercent,
    }),
  );

  if (!beginner.recommendations.length) throw new Error('EXPECTED_RECOMMENDATIONS');
  if ((plan.studyPlan?.steps.length ?? 0) < 1) throw new Error('EXPECTED_STUDY_PLAN');
  if (beginner.answer.status !== 'ok' && beginner.answer.status !== 'not_found') {
    throw new Error(`EXPECTED_RUNTIME_OK got=${beginner.answer.status} code=${beginner.answer.errorCode}`);
  }
  if (!beginner.student.courseId) throw new Error('MISSING_STUDENT_PROFILE');
  if (!beginner.learning.userId) throw new Error('MISSING_LEARNING_PROFILE');

  console.log('TUTOR_IA_SEED_OK');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
