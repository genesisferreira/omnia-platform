import type { Payload } from 'payload';
import { TutorService } from '@omnia/neurofrigo-tutor';

import { asPayloadJson, requirePayloadRelationId } from '../../lib/payload-relation-id';
import { runAdaptiveDecide } from '../adaptive/decide';
import { runNeurofrigoAsk } from '../neurofrigo/ask';
import { getSipAssistantContext, recalculateSipProfile } from '../sip/profile';
import { loadCourseCatalog } from './catalog';
import { recordLearningUsage, syncLearningProfile, syncStudentProfile } from './profiles';
import { refreshTutorDashboard } from './dashboard';

export async function createTutorService(payload: Payload): Promise<TutorService> {
  return new TutorService({
    runtime: {
      ask: async (request) => {
        const result = await runNeurofrigoAsk(payload, {
          ...request,
          // Tutor surface must stay on Tutor — do not re-route to HVAC/engineering.
          assistantId: request.assistantKey || 'tutor',
          orchestrate: true,
        });
        return { answer: result.answer, sessionId: result.sessionId };
      },
    },
    students: {
      getOrSync: (input) => syncStudentProfile(payload, input),
    },
    learning: {
      getOrSync: (input) => syncLearningProfile(payload, input),
      recordUsage: (input) => recordLearningUsage(payload, input),
    },
    catalog: {
      load: (courseId) => loadCourseCatalog(payload, courseId),
    },
    signals: {
      async listRecentQuestions({ userId, courseId, limit = 30 }) {
        const userNumeric =
          userId && userId !== 'anonymous' && /^\d+$/.test(userId) ? Number(userId) : null;
        const sessions = await payload.find({
          collection: 'ai-sessions',
          where: {
            and: [
              { course: { equals: courseId } },
              ...(userNumeric != null ? [{ user: { equals: userNumeric } }] : []),
            ],
          },
          limit,
          sort: '-updatedAt',
          overrideAccess: true,
        });
        return sessions.docs.map((d) => ({
          question: String(d.question || ''),
          groundingScore: Number(d.groundingScore || 0),
          status: String(d.status || 'ok'),
        }));
      },
      async countNegativeFeedback({ userId, courseId }) {
        const userNumeric =
          userId && userId !== 'anonymous' && /^\d+$/.test(userId) ? Number(userId) : null;
        const sessions = await payload.find({
          collection: 'ai-sessions',
          where: {
            and: [
              { course: { equals: courseId } },
              ...(userNumeric != null ? [{ user: { equals: userNumeric } }] : []),
            ],
          },
          limit: 100,
          overrideAccess: true,
        });
        const ids = sessions.docs.map((d) => d.id);
        if (!ids.length) return 0;
        const feedback = await payload.find({
          collection: 'ai-feedback',
          where: {
            and: [{ rating: { equals: 'down' } }, { aiSession: { in: ids } }],
          },
          limit: 1,
          overrideAccess: true,
        });
        return feedback.totalDocs;
      },
    },
  });
}

export async function runTutorAsk(
  payload: Payload,
  body: {
    question: string;
    userId?: string | null;
    tenantId?: string | null;
    language?: string | null;
    role?: string | null;
    sessionId?: string | number | null;
    courseId: string;
    courseTitle?: string | null;
    moduleId?: string | null;
    moduleTitle?: string | null;
    lessonId?: string | null;
    lessonTitle?: string | null;
    lessonObjectives?: string | null;
    ownerCompanyId?: string | null;
    requestStudyPlan?: boolean;
    objective?: string | null;
    officialAssessmentActive?: boolean;
    schoolKey?: string | null;
  },
) {
  const userKey = body.userId || 'anonymous';
  let sipBlock = '';
  let adaptiveBlock = '';
  let guard = {
    blocked: false,
    reason: null as string | null,
    safeQuestion: body.question,
    systemPolicy: '',
    schoolPolicy: '',
  };
  try {
    const { tutorGuardForAsk } = await import('../ils/engine');
    const { isSchoolKey } = await import('@omnia/intelligent-learning');
    const schoolKey = isSchoolKey(body.schoolKey) ? body.schoolKey : null;
    guard = tutorGuardForAsk({
      question: body.question,
      officialAssessmentActive: body.officialAssessmentActive === true,
      schoolKey,
    });
  } catch {
    /* ILS guard opcional — Tutor EPIC 16 permanece operacional. */
  }

  // Assessment answer-seeking: never synthesize from lesson/session — return guard only.
  if (guard.blocked) {
    const text =
      'Durante uma avaliação oficial não posso fornecer a resposta, o gabarito ou a alternativa correta. Posso ajudar com o conceito geral da disciplina, sem resolver o item.';
    return {
      answer: {
        text,
        formattedText: text,
        sources: [],
        confidence: 1,
        tookMs: 0,
        model: 'assessment-guard',
        provider: 'tutor-guard',
        promptTokens: 0,
        completionTokens: Math.ceil(text.length / 4),
        totalTokens: Math.ceil(text.length / 4),
        estimatedCostUsd: 0,
        status: 'not_found' as const,
        intent: 'explanation' as const,
        grounding: null,
        explainability: {
          sourceCount: 0,
          avgScore: 0,
          confidence: 1,
          documents: [],
          retrievalTookMs: 0,
          llmTookMs: 0,
          intent: 'explanation',
          justification: 'Assessment Guard blocked answer-seeking during official assessment.',
        },
        dialogueIntent: 'assessment_guard',
      },
      sessionId: body.sessionId ?? `assessment-guard-${Date.now()}`,
      level: 'beginner' as const,
      levelLabel: 'Iniciante',
      student: {
        userId: userKey,
        tenantId: body.tenantId ?? null,
        enrolledCourseIds: [String(body.courseId)],
        progressPercent: 0,
        completedModuleIds: [],
        completedLessonIds: [],
        lastActivityAt: null,
        studyTimeMinutes: 0,
        language: body.language || 'pt-BR',
        courseId: String(body.courseId),
      },
      learning: {
        userId: userKey,
        courseId: String(body.courseId),
        level: 'beginner' as const,
        masteredTopics: [],
        pendingTopics: [],
        reviewedTopics: [],
        difficultyTopics: [],
        aiUsageCount: 0,
        avgGrounding: 0,
        negativeFeedbackCount: 0,
        repeatedQuestions: [],
      },
      recommendations: [],
      studyPlan: null,
      gaps: [],
      encouragement: '',
      personalizedHint: '',
      assessmentGuard: {
        blocked: true,
        reason: guard.reason,
      },
    };
  }

  if (userKey !== 'anonymous') {
    try {
      const ctx = await getSipAssistantContext(payload, {
        userKey,
        courseId: String(body.courseId),
        ensureFresh: true,
      });
      if (ctx?.summaryText) sipBlock = ctx.summaryText;
    } catch {
      /* SIP opcional no primeiro contato */
    }
    try {
      const adaptive = await runAdaptiveDecide(payload, {
        userKey,
        courseId: String(body.courseId),
      });
      adaptiveBlock = adaptive.tutorHint;
    } catch {
      /* Adaptive opcional */
    }
  }

  const tutor = await createTutorService(payload);
  const baseObjectives = body.lessonObjectives || '';

  let authorizedPassages: import('@omnia/neurofrigo-runtime').AuthorizedPassage[] = [];
  try {
    const { loadAuthorizedLessonPassages } = await import('./lesson-context');
    authorizedPassages = await loadAuthorizedLessonPassages(payload, {
      courseId: body.courseId,
      lessonId: body.lessonId,
      userId: body.userId,
      schoolKey: body.schoolKey ?? null,
    });
  } catch {
    authorizedPassages = [];
  }

  const result = await tutor.ask({
    question: guard.safeQuestion,
    userId: body.userId,
    tenantId: body.tenantId,
    language: body.language,
    role: body.role,
    sessionId: body.sessionId,
    courseId: String(body.courseId),
    courseTitle: body.courseTitle,
    moduleId: body.moduleId,
    moduleTitle: body.moduleTitle,
    lessonId: body.lessonId,
    lessonTitle: body.lessonTitle,
    lessonObjectives: [
      guard.systemPolicy,
      guard.schoolPolicy,
      baseObjectives,
      guard.blocked ? '' : sipBlock,
      guard.blocked ? '' : adaptiveBlock,
    ]
      .filter(Boolean)
      .join('\n\n'),
    ownerCompanyId: body.ownerCompanyId,
    requestStudyPlan: body.requestStudyPlan,
    objective: body.objective,
    assistantKey: 'tutor',
    domainContext: {
      authorizedPassages: authorizedPassages.length ? authorizedPassages : null,
    },
  });

  if (result.studyPlan) {
    await payload.create({
      collection: 'tutor-study-plans',
      data: {
        objective: result.studyPlan.objective,
        userKey,
        user:
          body.userId && body.userId !== 'anonymous' && /^\d+$/.test(body.userId)
            ? Number(body.userId)
            : undefined,
        course: requirePayloadRelationId(result.studyPlan.courseId),
        steps: asPayloadJson(result.studyPlan.steps),
        estimatedLessons: result.studyPlan.estimatedLessons,
      },
      overrideAccess: true,
    });
  }

  const lp = await payload.find({
    collection: 'learning-profiles',
    where: {
      and: [{ userKey: { equals: userKey } }, { course: { equals: String(body.courseId) } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  if (lp.docs[0]) {
    await payload.update({
      collection: 'learning-profiles',
      id: lp.docs[0].id,
      data: {
        level: result.level,
        gaps: result.gaps,
        repeatedQuestions: result.learning.repeatedQuestions,
        difficultyTopics: result.learning.difficultyTopics,
        avgGrounding: result.learning.avgGrounding,
        negativeFeedbackCount: result.learning.negativeFeedbackCount,
      },
      overrideAccess: true,
    });
  }

  if (userKey !== 'anonymous') {
    await recalculateSipProfile(payload, {
      userKey,
      courseId: String(body.courseId),
    }).catch(() => undefined);
  }

  await refreshTutorDashboard(payload).catch(() => undefined);
  return {
    ...result,
    assessmentGuard: {
      blocked: guard.blocked,
      reason: guard.reason,
    },
  };
}
