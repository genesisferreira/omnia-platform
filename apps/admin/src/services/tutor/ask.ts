import type { Payload } from 'payload';
import { TutorService } from '@omnia/neurofrigo-tutor';

import { runNeurofrigoAsk } from '../neurofrigo/ask';
import { getSipAssistantContext, recalculateSipProfile } from '../sip/profile';
import { loadCourseCatalog } from './catalog';
import {
  recordLearningUsage,
  syncLearningProfile,
  syncStudentProfile,
} from './profiles';
import { refreshTutorDashboard } from './dashboard';

export async function createTutorService(payload: Payload): Promise<TutorService> {
  return new TutorService({
    runtime: {
      ask: (request) => runNeurofrigoAsk(payload, request),
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
            and: [
              { rating: { equals: 'down' } },
              { aiSession: { in: ids } },
            ],
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
  },
) {
  const userKey = body.userId || 'anonymous';
  let sipBlock = '';
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
  }

  const tutor = await createTutorService(payload);
  const baseObjectives = body.lessonObjectives || '';
  const result = await tutor.ask({
    question: body.question,
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
    lessonObjectives: [baseObjectives, sipBlock].filter(Boolean).join('\n\n'),
    ownerCompanyId: body.ownerCompanyId,
    requestStudyPlan: body.requestStudyPlan,
    objective: body.objective,
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
        course: Number(result.studyPlan.courseId) || result.studyPlan.courseId,
        steps: result.studyPlan.steps,
        estimatedLessons: result.studyPlan.estimatedLessons,
      },
      overrideAccess: true,
    });
  }

  const lp = await payload.find({
    collection: 'learning-profiles',
    where: {
      and: [
        { userKey: { equals: userKey } },
        { course: { equals: String(body.courseId) } },
      ],
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
  return result;
}
