import type { Payload } from 'payload';
import type { LearningProfile, StudentProfile, LearningLevel } from '@omnia/neurofrigo-tutor';

import {
  asPayloadJson,
  requirePayloadRelationId,
  toPayloadRelationId,
} from '../../lib/payload-relation-id';
import { loadCourseCatalog } from './catalog';

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

function numericUserId(userId: string): number | null {
  if (!userId || userId === 'anonymous') return null;
  if (!/^\d+$/.test(userId)) return null;
  const n = Number(userId);
  return Number.isFinite(n) ? n : null;
}

/**
 * Deriva StudentProfile do LMS Core + sinais de AI sessions do curso.
 * Progresso = aulas com atividade de IA ou marcadas; sem inventar matrícula Moodle.
 */
export async function syncStudentProfile(
  payload: Payload,
  input: {
    userId: string;
    tenantId?: string | null;
    courseId: string;
    language?: string | null;
  },
): Promise<StudentProfile> {
  const catalog = await loadCourseCatalog(payload, input.courseId);
  if (!catalog) {
    return {
      userId: input.userId,
      tenantId: input.tenantId ?? null,
      enrolledCourseIds: [input.courseId],
      progressPercent: 0,
      completedModuleIds: [],
      completedLessonIds: [],
      lastActivityAt: null,
      studyTimeMinutes: 0,
      language: input.language || 'pt-BR',
      courseId: input.courseId,
    };
  }

  const userNumeric = numericUserId(input.userId);
  const sessions = await payload.find({
    collection: 'ai-sessions',
    where: {
      and: [
        { course: { equals: catalog.courseId } },
        ...(userNumeric != null ? [{ user: { equals: userNumeric } }] : []),
      ],
    },
    limit: 200,
    sort: '-updatedAt',
    overrideAccess: true,
  });

  const lessonHits = new Set<string>();
  let studyMs = 0;
  let lastActivityAt: string | null = null;
  for (const s of sessions.docs) {
    const lessonRel = s.lesson;
    if (lessonRel != null) {
      const id =
        typeof lessonRel === 'object' && lessonRel && 'id' in lessonRel
          ? String((lessonRel as { id: string | number }).id)
          : String(lessonRel);
      lessonHits.add(id);
    }
    studyMs += Number(s.tookMs || 0);
    if (!lastActivityAt && s.updatedAt) lastActivityAt = String(s.updatedAt);
  }

  const existing = await payload.find({
    collection: 'student-profiles',
    where: {
      and: [{ userKey: { equals: input.userId } }, { course: { equals: catalog.courseId } }],
    },
    limit: 1,
    overrideAccess: true,
  });

  const existingCompleted = asStringArray(existing.docs[0]?.completedLessonIds);
  // Preserva progresso explícito (ex.: aluno avançado) se já for maior que o derivado.
  let completedLessonIds = [...lessonHits];
  if (existingCompleted.length > completedLessonIds.length) {
    completedLessonIds = existingCompleted;
  } else if (completedLessonIds.length === 0 && catalog.lessons[0]) {
    completedLessonIds = [catalog.lessons[0].id];
  }

  const completedModuleIds = catalog.modules
    .filter((m) => m.lessons.every((l) => completedLessonIds.includes(l.id)))
    .map((m) => m.id);

  const progressPercent =
    catalog.lessons.length === 0
      ? 0
      : Math.round((completedLessonIds.length / catalog.lessons.length) * 100);

  const data = {
    userKey: input.userId,
    user: numericUserId(input.userId) ?? undefined,
    tenant: toPayloadRelationId(input.tenantId),
    course: requirePayloadRelationId(catalog.courseId),
    enrolledCourseIds: asPayloadJson([catalog.courseId]),
    progressPercent,
    completedModuleIds: asPayloadJson(completedModuleIds),
    completedLessonIds: asPayloadJson(completedLessonIds),
    lastActivityAt: lastActivityAt || new Date().toISOString(),
    studyTimeMinutes: Math.max(1, Math.round(studyMs / 60_000)),
    language: input.language || 'pt-BR',
    source: 'lms-derived',
  };

  if (existing.docs[0]) {
    await payload.update({
      collection: 'student-profiles',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'student-profiles',
      data,
      overrideAccess: true,
    });
  }

  return {
    userId: input.userId,
    tenantId: input.tenantId ?? null,
    enrolledCourseIds: [catalog.courseId],
    progressPercent,
    completedModuleIds,
    completedLessonIds,
    lastActivityAt: data.lastActivityAt,
    studyTimeMinutes: data.studyTimeMinutes,
    language: data.language,
    courseId: catalog.courseId,
  };
}

export async function syncLearningProfile(
  payload: Payload,
  input: {
    userId: string;
    courseId: string;
    student: StudentProfile;
  },
): Promise<LearningProfile> {
  const catalog = await loadCourseCatalog(payload, input.courseId);
  const courseId = catalog?.courseId || input.courseId;

  const existing = await payload.find({
    collection: 'learning-profiles',
    where: {
      and: [{ userKey: { equals: input.userId } }, { course: { equals: courseId } }],
    },
    limit: 1,
    overrideAccess: true,
  });

  const masteredTopics =
    catalog?.lessons
      .filter((l) => input.student.completedLessonIds.includes(l.id))
      .map((l) => l.title) ?? asStringArray(existing.docs[0]?.masteredTopics);

  const pendingTopics =
    catalog?.lessons
      .filter((l) => !input.student.completedLessonIds.includes(l.id))
      .map((l) => l.title) ?? asStringArray(existing.docs[0]?.pendingTopics);

  const level = (existing.docs[0]?.level as LearningLevel) || 'beginner';
  const profile: LearningProfile = {
    userId: input.userId,
    courseId,
    level,
    masteredTopics,
    pendingTopics,
    reviewedTopics: asStringArray(existing.docs[0]?.reviewedTopics),
    difficultyTopics: asStringArray(existing.docs[0]?.difficultyTopics),
    aiUsageCount: Number(existing.docs[0]?.aiUsageCount || 0),
    avgGrounding: Number(existing.docs[0]?.avgGrounding || 0),
    negativeFeedbackCount: Number(existing.docs[0]?.negativeFeedbackCount || 0),
    repeatedQuestions: asStringArray(existing.docs[0]?.repeatedQuestions),
  };

  const data = {
    userKey: input.userId,
    user: numericUserId(input.userId) ?? undefined,
    course: requirePayloadRelationId(courseId),
    level: profile.level,
    masteredTopics: profile.masteredTopics,
    pendingTopics: profile.pendingTopics,
    reviewedTopics: profile.reviewedTopics,
    difficultyTopics: profile.difficultyTopics,
    aiUsageCount: profile.aiUsageCount,
    avgGrounding: profile.avgGrounding,
    negativeFeedbackCount: profile.negativeFeedbackCount,
    repeatedQuestions: profile.repeatedQuestions,
  };

  if (existing.docs[0]) {
    await payload.update({
      collection: 'learning-profiles',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'learning-profiles',
      data,
      overrideAccess: true,
    });
  }

  return profile;
}

export async function recordLearningUsage(
  payload: Payload,
  input: {
    userId: string;
    courseId: string;
    question: string;
    groundingScore: number;
    confidence: number;
    status: string;
  },
): Promise<void> {
  const found = await payload.find({
    collection: 'learning-profiles',
    where: {
      and: [{ userKey: { equals: input.userId } }, { course: { equals: input.courseId } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  if (!found.docs[0]) return;

  const prevCount = Number(found.docs[0].aiUsageCount || 0);
  const prevAvg = Number(found.docs[0].avgGrounding || 0);
  const nextCount = prevCount + 1;
  const avgGrounding = Number(
    ((prevAvg * prevCount + input.groundingScore) / nextCount).toFixed(3),
  );

  const difficultyTopics = asStringArray(found.docs[0].difficultyTopics);
  if (input.groundingScore < 0.35 || input.status === 'not_found') {
    difficultyTopics.unshift(input.question.slice(0, 80));
  }

  await payload.update({
    collection: 'learning-profiles',
    id: found.docs[0].id,
    data: {
      aiUsageCount: nextCount,
      avgGrounding,
      difficultyTopics: [...new Set(difficultyTopics)].slice(0, 10),
    },
    overrideAccess: true,
  });
}
