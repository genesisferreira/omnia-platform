import type { Payload } from 'payload';
import {
  AdaptiveLearningService,
  formatAdaptiveHintForTutor,
  resolveAdaptivePolicy,
  type AdaptivePolicy,
  type AdaptiveDecideResult,
} from '@omnia/adaptive-learning';
import type { StudentInsights } from '@omnia/student-intelligence';

import { getSipAssistantContext } from '../sip/profile';
import { loadCourseCatalog } from '../tutor/catalog';
import { refreshAdaptiveDashboard } from './dashboard';

function asCourseRel(courseId: string): number | string {
  if (/^\d+$/.test(String(courseId))) return Number(courseId);
  return courseId;
}

function numericUserId(userId: string): number | null {
  if (!userId || userId === 'anonymous') return null;
  if (!/^\d+$/.test(userId)) return null;
  const n = Number(userId);
  return Number.isFinite(n) ? n : null;
}

async function loadPolicy(
  payload: Payload,
  courseId: string,
): Promise<AdaptivePolicy> {
  const byCourse = await payload.find({
    collection: 'adaptive-policies',
    where: {
      and: [
        { status: { equals: 'active' } },
        { scope: { equals: 'course' } },
        { course: { equals: asCourseRel(courseId) } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const global = await payload.find({
    collection: 'adaptive-policies',
    where: {
      and: [{ status: { equals: 'active' } }, { scope: { equals: 'global' } }],
    },
    limit: 1,
    sort: '-updatedAt',
    overrideAccess: true,
  });
  const doc = byCourse.docs[0] || global.docs[0];
  if (!doc) return resolveAdaptivePolicy(null);
  return resolveAdaptivePolicy({
    key: String(doc.key),
    version: String(doc.version || '1.0.0'),
    minimumCompetencyScore: Number(doc.minimumCompetencyScore ?? 0.45),
    reviewThreshold: Number(doc.reviewThreshold ?? 0.4),
    assessmentThreshold: Number(doc.assessmentThreshold ?? 0.7),
    staleKnowledgeDays: Number(doc.staleKnowledgeDays ?? 14),
    maxRecommendations: Number(doc.maxRecommendations ?? 5),
    minimumEvidenceCount: Number(doc.minimumEvidenceCount ?? 2),
    reviewRiskThreshold: Number(doc.reviewRiskThreshold ?? 0.6),
    skillGapThreshold: Number(doc.skillGapThreshold ?? 0.45),
  });
}

export async function createAdaptiveLearningService(
  payload: Payload,
): Promise<AdaptiveLearningService> {
  return new AdaptiveLearningService({
    sip: {
      async getContext({ userKey, courseId }) {
        return getSipAssistantContext(payload, {
          userKey,
          courseId,
          ensureFresh: true,
        });
      },
      async getInsights({ userKey, courseId }) {
        const found = await payload.find({
          collection: 'sip-profiles',
          where: {
            and: [
              { userKey: { equals: userKey } },
              { course: { equals: asCourseRel(courseId) } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        });
        return (found.docs[0]?.insights as StudentInsights) || null;
      },
      async getProgress({ userKey, courseId }) {
        const [sip, learning, evidence] = await Promise.all([
          payload.find({
            collection: 'sip-profiles',
            where: {
              and: [
                { userKey: { equals: userKey } },
                { course: { equals: asCourseRel(courseId) } },
              ],
            },
            limit: 1,
            overrideAccess: true,
          }),
          payload.find({
            collection: 'learning-profiles',
            where: {
              and: [
                { userKey: { equals: userKey } },
                { course: { equals: asCourseRel(courseId) } },
              ],
            },
            limit: 1,
            overrideAccess: true,
          }),
          payload.find({
            collection: 'sip-evidence',
            where: {
              and: [
                { userKey: { equals: userKey } },
                { course: { equals: asCourseRel(courseId) } },
              ],
            },
            limit: 1,
            overrideAccess: true,
          }),
        ]);
        const student = await payload.find({
          collection: 'student-profiles',
          where: {
            and: [
              { userKey: { equals: userKey } },
              { course: { equals: asCourseRel(courseId) } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        });
        const s = student.docs[0];
        const lp = learning.docs[0];
        return {
          progressPercent: Number(sip.docs[0]?.progressPercent ?? s?.progressPercent ?? 0),
          completedLessonIds: Array.isArray(s?.completedLessonIds)
            ? s.completedLessonIds.map(String)
            : [],
          completedModuleIds: Array.isArray(s?.completedModuleIds)
            ? s.completedModuleIds.map(String)
            : [],
          evidenceCount: evidence.totalDocs,
          difficultyTopics: Array.isArray(lp?.difficultyTopics)
            ? lp.difficultyTopics.map(String)
            : [],
          pendingTopics: Array.isArray(lp?.pendingTopics)
            ? lp.pendingTopics.map(String)
            : [],
          lastActivityAt: s?.lastActivityAt ? String(s.lastActivityAt) : null,
        };
      },
    },
    catalog: {
      async load(courseId) {
        const c = await loadCourseCatalog(payload, courseId);
        if (!c) return null;
        return {
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          modules: c.modules.map((m) => ({
            id: m.id,
            title: m.title,
            slug: m.slug,
            order: m.order,
            lessonIds: m.lessons.map((l) => l.id),
          })),
          lessons: c.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            slug: l.slug,
            moduleId: l.moduleId,
            moduleTitle: l.moduleTitle,
            order: l.order,
            moduleOrder: l.moduleOrder,
          })),
        };
      },
    },
    decisions: {
      async save(record) {
        const d = record.decision;
        await payload.create({
          collection: 'adaptive-decisions',
          data: {
            userKey: record.userKey,
            user: numericUserId(record.userKey),
            course: asCourseRel(String(record.courseId || '')),
            tenantKey: record.tenantId,
            actionType: d.actionType,
            reason: d.reason,
            reasonFriendly: d.reasonFriendly,
            priority: d.priority,
            confidence: d.confidence,
            moduleId: d.moduleId,
            lessonId: d.lessonId,
            lessonSlug: d.lessonSlug,
            lessonTitle: d.lessonTitle,
            competencyIds: d.competencyIds,
            evidenceIds: d.evidenceIds,
            factors: d.factors,
            plan: record.plan,
            policyKey: d.policyKey,
            policyVersion: record.policyVersion,
            outcome: 'pending',
            decidedAt: record.createdAt,
            expiresAt: d.expiresAt,
          },
          overrideAccess: true,
        });
      },
    },
  });
}

export async function runAdaptiveDecide(
  payload: Payload,
  input: {
    userKey: string;
    courseId: string;
    tenantId?: string | null;
    assessmentAvailable?: boolean;
  },
): Promise<AdaptiveDecideResult & { decideMs: number; tutorHint: string }> {
  const started = Date.now();
  const policy = await loadPolicy(payload, input.courseId);
  const service = await createAdaptiveLearningService(payload);
  const result = await service.decide({
    userKey: input.userKey,
    courseId: input.courseId,
    tenantId: input.tenantId,
    policy,
    assessmentAvailable: input.assessmentAvailable,
  });
  const decideMs = Date.now() - started;
  await refreshAdaptiveDashboard(payload, { lastDecideMs: decideMs }).catch(() => undefined);
  return {
    ...result,
    decideMs,
    tutorHint: formatAdaptiveHintForTutor(result),
  };
}

export async function recordAdaptiveOutcome(
  payload: Payload,
  input: { decisionId: string | number; outcome: 'accepted' | 'ignored' | 'completed' },
) {
  await payload.update({
    collection: 'adaptive-decisions',
    id: input.decisionId,
    data: { outcome: input.outcome },
    overrideAccess: true,
  });
  await refreshAdaptiveDashboard(payload).catch(() => undefined);
}
