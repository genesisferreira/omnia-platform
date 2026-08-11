import type { Payload } from 'payload';
import {
  recalculateSipTwin,
  toAssistantContext,
  toPortalView,
  type CompetencyState,
  type MotivationProfile,
  type SipAssistantContext,
  type SipDigitalTwin,
  type SipEvidenceInput,
} from '@omnia/student-intelligence';

import { syncLearningProfile, syncStudentProfile } from '../tutor/profiles';
import { loadCourseCatalog } from '../tutor/catalog';
import { refreshSipDashboard } from './dashboard';

function numericUserId(userId: string): number | null {
  if (!userId || userId === 'anonymous') return null;
  if (!/^\d+$/.test(userId)) return null;
  const n = Number(userId);
  return Number.isFinite(n) ? n : null;
}

async function loadSignals(
  payload: Payload,
  input: { userKey: string; courseId: string },
): Promise<SipEvidenceInput> {
  const student = await syncStudentProfile(payload, {
    userId: input.userKey,
    courseId: input.courseId,
  });
  const learning = await syncLearningProfile(payload, {
    userId: input.userKey,
    courseId: input.courseId,
    student,
  });

  const userNumeric = numericUserId(input.userKey);
  const sessions = await payload.find({
    collection: 'ai-sessions',
    where: {
      and: [
        { course: { equals: input.courseId } },
        ...(userNumeric != null ? [{ user: { equals: userNumeric } }] : []),
      ],
    },
    limit: 40,
    sort: '-updatedAt',
    overrideAccess: true,
  });

  const recentQuestions = sessions.docs.slice(0, 20).map((d) => {
    const turns = Array.isArray(d.turns) ? d.turns : [];
    const last = turns[turns.length - 1] as { question?: string } | undefined;
    return {
      question: String(last?.question || d.question || 'sessão tutor'),
      groundingScore: Number(d.groundingScore || 0),
      status: String(d.status || 'ok'),
    };
  });

  let negativeFeedbackCount = 0;
  if (sessions.docs.length) {
    const fb = await payload.find({
      collection: 'ai-feedback',
      where: {
        and: [
          { rating: { equals: 'down' } },
          { aiSession: { in: sessions.docs.map((d) => d.id) } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    negativeFeedbackCount = fb.totalDocs;
  }

  return {
    progressPercent: student.progressPercent,
    studyTimeMinutes: student.studyTimeMinutes,
    completedLessonIds: student.completedLessonIds,
    completedModuleIds: student.completedModuleIds,
    masteredTopics: learning.masteredTopics,
    difficultyTopics: learning.difficultyTopics,
    pendingTopics: learning.pendingTopics,
    aiUsageCount: learning.aiUsageCount || sessions.totalDocs,
    avgGrounding: learning.avgGrounding,
    negativeFeedbackCount,
    recentQuestions,
  };
}

function mapDocToTwin(doc: Record<string, unknown>): SipDigitalTwin {
  const courseRel = doc.course;
  const courseId =
    courseRel == null
      ? null
      : typeof courseRel === 'object' && courseRel && 'id' in courseRel
        ? String((courseRel as { id: unknown }).id)
        : String(courseRel);

  return {
    userKey: String(doc.userKey),
    courseId,
    language: String(doc.language || 'pt-BR'),
    identification: {
      displayName: null,
      technicalLevel: String(doc.technicalLevel || 'beginner'),
      progressPercent: Number(doc.progressPercent || 0),
      studyTimeMinutes: Number(doc.studyTimeMinutes || 0),
    },
    competencies: (Array.isArray(doc.competencies) ? doc.competencies : []) as CompetencyState[],
    objectives: (doc.objectives || {
      goals: [],
      notes: null,
      updatedByStudentAt: null,
    }) as MotivationProfile,
    learningProfile: {
      preferences: (Array.isArray(doc.preferences) ? doc.preferences : []) as SipDigitalTwin['learningProfile']['preferences'],
      recommendedLevel: String(doc.technicalLevel || 'beginner'),
    },
    evidenceSummary: (doc.evidenceSummary || {
      count: 0,
      lastEvidenceAt: null,
      sources: [],
    }) as SipDigitalTwin['evidenceSummary'],
    recommendations: (Array.isArray(doc.recommendations)
      ? doc.recommendations
      : []) as SipDigitalTwin['recommendations'],
    insights: (doc.insights || {
      imt: 0,
      learningVelocity: 0,
      knowledgeRetention: 0,
      confidenceIndex: 0,
      reviewRisk: 0,
      skillGap: 0,
      computedAt: new Date().toISOString(),
      explainability: [],
    }) as SipDigitalTwin['insights'],
    history: (Array.isArray(doc.history) ? doc.history : []) as SipDigitalTwin['history'],
    version: Number(doc.version || 1),
    updatedAt: String(doc.updatedAt || new Date().toISOString()),
  };
}

/**
 * Recalcula o Digital Twin via SIP (única via de atualização automática).
 */
export async function recalculateSipProfile(
  payload: Payload,
  input: {
    userKey: string;
    courseId: string;
    motivation?: MotivationProfile | null;
    displayName?: string | null;
  },
): Promise<{ twin: SipDigitalTwin; context: SipAssistantContext; portal: ReturnType<typeof toPortalView> }> {
  const signals = await loadSignals(payload, {
    userKey: input.userKey,
    courseId: input.courseId,
  });

  const existing = await payload.find({
    collection: 'sip-profiles',
    where: {
      and: [
        { userKey: { equals: input.userKey } },
        { course: { equals: input.courseId } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });

  const existingCompetencies = Array.isArray(existing.docs[0]?.competencies)
    ? (existing.docs[0].competencies as CompetencyState[])
    : [];

  const motivation =
    input.motivation ||
    (existing.docs[0]?.objectives as MotivationProfile | undefined) ||
    null;

  const catalog = await loadCourseCatalog(payload, input.courseId);
  const catalogHints = (catalog?.lessons || []).slice(0, 12).map((l) => ({
    id: l.id,
    title: l.title,
    competencyKey: null as string | null,
  }));

  const { twin, evidence, audit } = recalculateSipTwin({
    userKey: input.userKey,
    courseId: input.courseId,
    displayName: input.displayName,
    evidenceInput: signals,
    existingCompetencies,
    motivation,
    catalogHints,
  });

  const context = toAssistantContext(twin);
  const portal = toPortalView(twin);
  const userNumeric = numericUserId(input.userKey);

  // Substitui evidências da última recalculação (mantém auditoria).
  const oldEvidence = await payload.find({
    collection: 'sip-evidence',
    where: {
      and: [
        { userKey: { equals: input.userKey } },
        { course: { equals: input.courseId } },
      ],
    },
    limit: 200,
    overrideAccess: true,
  });
  for (const row of oldEvidence.docs) {
    await payload.delete({
      collection: 'sip-evidence',
      id: row.id,
      overrideAccess: true,
    });
  }

  for (const ev of evidence.slice(0, 40)) {
    await payload.create({
      collection: 'sip-evidence',
      data: {
        userKey: input.userKey,
        course: input.courseId,
        sourceType: ev.sourceType,
        sourceId: ev.sourceId,
        competencyKey: ev.competencyKey,
        strength: ev.strength,
        confidence: ev.confidence,
        summary: ev.summary.slice(0, 240),
        payload: ev.payload || null,
        observedAt: ev.at,
      },
      overrideAccess: true,
    });
  }

  await payload.create({
    collection: 'sip-audit-events',
    data: {
      userKey: audit.userKey,
      course: input.courseId,
      origin: audit.origin,
      event: audit.event,
      evidenceIds: audit.evidenceIds,
      model: audit.model,
      confidence: audit.confidence,
      payload: audit.payload || null,
      occurredAt: audit.at,
    },
    overrideAccess: true,
  });

  const data = {
    userKey: twin.userKey,
    user: userNumeric,
    course: input.courseId,
    language: twin.language,
    technicalLevel: twin.identification.technicalLevel,
    progressPercent: twin.identification.progressPercent,
    studyTimeMinutes: twin.identification.studyTimeMinutes,
    competencies: twin.competencies,
    objectives: twin.objectives,
    preferences: twin.learningProfile.preferences,
    recommendations: twin.recommendations,
    insights: twin.insights,
    evidenceSummary: twin.evidenceSummary,
    history: twin.history,
    assistantContext: context.summaryText,
    version: Number(existing.docs[0]?.version || 0) + 1,
    lastRecalculatedAt: twin.updatedAt,
  };

  if (existing.docs[0]) {
    await payload.update({
      collection: 'sip-profiles',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: 'sip-profiles',
      data,
      overrideAccess: true,
    });
  }

  await refreshSipDashboard(payload).catch(() => undefined);

  return { twin, context, portal };
}

/** Profile Service adapter — leitura para assistentes (sem acesso direto ao twin bruto). */
export async function getSipAssistantContext(
  payload: Payload,
  input: { userKey: string; courseId: string; ensureFresh?: boolean },
): Promise<SipAssistantContext | null> {
  if (!input.userKey || input.userKey === 'anonymous') return null;

  const found = await payload.find({
    collection: 'sip-profiles',
    where: {
      and: [
        { userKey: { equals: input.userKey } },
        { course: { equals: input.courseId } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });

  const stale =
    !found.docs[0] ||
    !found.docs[0].lastRecalculatedAt ||
    Date.now() - new Date(String(found.docs[0].lastRecalculatedAt)).getTime() >
      1000 * 60 * 30;

  if (input.ensureFresh !== false && stale) {
    const { context } = await recalculateSipProfile(payload, {
      userKey: input.userKey,
      courseId: input.courseId,
    });
    return context;
  }

  if (!found.docs[0]) return null;
  return toAssistantContext(mapDocToTwin(found.docs[0] as Record<string, unknown>));
}

export async function getSipPortalView(
  payload: Payload,
  input: { userKey: string; courseId: string },
) {
  const { portal } = await recalculateSipProfile(payload, input);
  return portal;
}

export async function updateSipMotivation(
  payload: Payload,
  input: {
    userKey: string;
    courseId: string;
    goals: string[];
    notes?: string | null;
  },
) {
  const motivation: MotivationProfile = {
    goals: input.goals,
    notes: input.notes ?? null,
    updatedByStudentAt: new Date().toISOString(),
  };
  return recalculateSipProfile(payload, {
    userKey: input.userKey,
    courseId: input.courseId,
    motivation,
  });
}
