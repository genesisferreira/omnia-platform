import type { Payload, PayloadRequest } from 'payload';

import {
  assertGovernanceTransition,
  canApproveOmnia,
  canApproveSchool,
  canRevoke,
  canSubmitForSchoolReview,
  canTransitionGovernance,
  GOVERNANCE_STATE_LABELS_PT,
  hashContentVersion,
  isAssessmentSecretContent,
  isHubIngestionEligible,
  isRetrievalEligibleState,
  schoolApprovedLabel,
  scopeForState,
  stateAfterMaterialEdit,
  versionsMatch,
  type GovernanceState,
  type KnowledgeScope,
} from '@omnia/knowledge-governance';

import { toPayloadRelationId } from '../../lib/payload-relation-id';
import { processLearningResource } from '../knowledge-intelligence/pipeline';
import { writeKnowledgeAudit } from './audit';

type Rel = string | number | { id: string | number } | null | undefined;

function relId(value: Rel): number | null {
  if (value == null) return null;
  if (typeof value === 'object' && 'id' in value) {
    return toPayloadRelationId(value.id) ?? null;
  }
  return toPayloadRelationId(value) ?? null;
}

function roleOf(user: unknown): string | null {
  if (user && typeof user === 'object' && typeof (user as { role?: unknown }).role === 'string') {
    return (user as { role: string }).role;
  }
  return null;
}

function userIdOf(user: unknown): string | number | null {
  if (user && typeof user === 'object' && 'id' in user) {
    return (user as { id: string | number }).id;
  }
  return null;
}

function statusLabelFor(state: GovernanceState, schoolKey: string | null): string {
  if (state === 'SCHOOL_APPROVED') return schoolApprovedLabel(schoolKey);
  return GOVERNANCE_STATE_LABELS_PT[state];
}

async function appendDecision(
  payload: Payload,
  submissionId: string | number,
  entry: Record<string, unknown>,
  req?: PayloadRequest,
) {
  const doc = (await payload.findByID({
    collection: 'knowledge-governance-submissions',
    id: submissionId,
    depth: 0,
    overrideAccess: true,
    req,
  })) as { decisions?: unknown[] };

  const decisions = Array.isArray(doc.decisions) ? [...doc.decisions] : [];
  decisions.push(entry);
  await payload.update({
    collection: 'knowledge-governance-submissions',
    id: submissionId,
    data: { decisions },
    overrideAccess: true,
    req,
    context: { governancePipelineActive: true },
  });
}

async function resolveLessonContext(
  payload: Payload,
  lessonId: number,
  req?: PayloadRequest,
): Promise<{
  courseId: number | null;
  schoolKey: string | null;
  ownerCompanyId: number | null;
  title: string;
  contentHash: string;
}> {
  const lesson = (await payload.findByID({
    collection: 'lessons',
    id: lessonId,
    depth: 2,
    overrideAccess: true,
    req,
  })) as Record<string, unknown>;

  const moduleId = relId(lesson.module as Rel);
  let courseId: number | null = null;
  let schoolKey: string | null = null;
  let ownerCompanyId: number | null = null;
  if (moduleId != null) {
    const mod = (await payload.findByID({
      collection: 'course-modules',
      id: moduleId,
      depth: 1,
      overrideAccess: true,
      req,
    })) as Record<string, unknown>;
    courseId = relId(mod.course as Rel);
    if (courseId != null) {
      const course = (await payload.findByID({
        collection: 'courses',
        id: courseId,
        depth: 0,
        overrideAccess: true,
        req,
      })) as Record<string, unknown>;
      schoolKey = typeof course.schoolKey === 'string' ? course.schoolKey : null;
      ownerCompanyId = relId(course.ownerCompany as Rel);
    }
  }

  const title = String(lesson.title || `Aula ${lessonId}`);
  const contentHash = hashContentVersion([
    'lesson',
    lessonId,
    title,
    String(lesson.summary || ''),
    String(lesson.content || ''),
    String(lesson.updatedAt || ''),
  ]);

  return { courseId, schoolKey, ownerCompanyId, title, contentHash };
}

export async function submitLessonForKnowledgeReview(args: {
  payload: Payload;
  lessonId: number;
  user: unknown;
  requestedScope?: 'SCHOOL_APPROVED' | 'OMNIA_APPROVED';
  req?: PayloadRequest;
}): Promise<Record<string, unknown>> {
  const { payload, lessonId, user, req } = args;
  const authorId = userIdOf(user);
  if (authorId == null) throw new Error('UNAUTHORIZED');

  const ctx = await resolveLessonContext(payload, lessonId, req);
  if (!ctx.schoolKey) throw new Error('LESSON_SCHOOL_KEY_REQUIRED');

  const assessmentSecret = isAssessmentSecretContent({ title: ctx.title });
  if (assessmentSecret) {
    throw new Error('ASSESSMENT_SECRET_NOT_SUBMISSIBLE');
  }

  const existing = await payload.find({
    collection: 'knowledge-governance-submissions',
    where: {
      and: [{ sourceType: { equals: 'lesson' } }, { sourceId: { equals: String(lessonId) } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  const requestedScope = args.requestedScope ?? 'SCHOOL_APPROVED';
  const now = new Date().toISOString();

  if (existing.docs[0]) {
    const prev = existing.docs[0] as {
      id: string | number;
      governanceState?: string;
      contentVersionHash?: string;
    };
    const state = (prev.governanceState || 'COURSE_PRIVATE') as GovernanceState;
    if (!canSubmitForSchoolReview(state) && state !== 'COURSE_PRIVATE') {
      if (state === 'PENDING_SCHOOL_REVIEW' || state === 'PENDING_OMNIA_REVIEW') {
        return existing.docs[0] as Record<string, unknown>;
      }
    }
    if (!canTransitionGovernance(state, 'PENDING_SCHOOL_REVIEW') && state !== 'COURSE_PRIVATE') {
      assertGovernanceTransition(
        state === 'DRAFT' || state === 'REJECTED' ? state : 'COURSE_PRIVATE',
        'PENDING_SCHOOL_REVIEW',
      );
    }
    const from = canSubmitForSchoolReview(state) ? state : 'COURSE_PRIVATE';
    assertGovernanceTransition(from, 'PENDING_SCHOOL_REVIEW');

    const updated = await payload.update({
      collection: 'knowledge-governance-submissions',
      id: prev.id,
      data: {
        title: ctx.title,
        contentVersionHash: ctx.contentHash,
        requestedScope,
        knowledgeScope: 'COURSE_PRIVATE',
        governanceState: 'PENDING_SCHOOL_REVIEW',
        statusLabel: statusLabelFor('PENDING_SCHOOL_REVIEW', ctx.schoolKey),
        submittedAt: now,
        retrievalEligible: false,
        assessmentSecret: false,
        course: ctx.courseId ?? undefined,
        lesson: lessonId,
        schoolKey: ctx.schoolKey,
        ownerCompany: ctx.ownerCompanyId ?? undefined,
      },
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });

    await appendDecision(
      payload,
      prev.id,
      {
        action: 'submitted',
        fromState: from,
        toState: 'PENDING_SCHOOL_REVIEW',
        scope: requestedScope,
        actorId: String(authorId),
        at: now,
        versionHash: ctx.contentHash,
      },
      req,
    );

    await writeKnowledgeAudit(
      payload,
      {
        action: 'submitted',
        entityType: 'knowledge-governance-submissions',
        entityId: String(prev.id),
        actorId: String(authorId),
        nextState: { lessonId, schoolKey: ctx.schoolKey, requestedScope },
      },
      req,
    );

    return updated as Record<string, unknown>;
  }

  const created = await payload.create({
    collection: 'knowledge-governance-submissions',
    data: {
      title: ctx.title,
      sourceType: 'lesson',
      sourceId: String(lessonId),
      course: ctx.courseId ?? undefined,
      lesson: lessonId,
      schoolKey: ctx.schoolKey,
      ownerCompany: ctx.ownerCompanyId ?? undefined,
      author: authorId,
      submittedAt: now,
      contentVersionHash: ctx.contentHash,
      requestedScope,
      knowledgeScope: 'COURSE_PRIVATE',
      governanceState: 'PENDING_SCHOOL_REVIEW',
      statusLabel: statusLabelFor('PENDING_SCHOOL_REVIEW', ctx.schoolKey),
      retrievalEligible: false,
      assessmentSecret: false,
      decisions: [
        {
          action: 'submitted',
          fromState: 'COURSE_PRIVATE',
          toState: 'PENDING_SCHOOL_REVIEW',
          scope: requestedScope,
          actorId: String(authorId),
          at: now,
          versionHash: ctx.contentHash,
        },
      ],
    },
    overrideAccess: true,
    req,
    context: { governancePipelineActive: true },
  });

  await writeKnowledgeAudit(
    payload,
    {
      action: 'submitted',
      entityType: 'knowledge-governance-submissions',
      entityId: String(created.id),
      actorId: String(authorId),
      nextState: { lessonId, schoolKey: ctx.schoolKey, requestedScope },
    },
    req,
  );

  return created as Record<string, unknown>;
}

async function applyHubEligibility(args: {
  payload: Payload;
  submission: Record<string, unknown>;
  state: GovernanceState;
  scope: KnowledgeScope;
  req?: PayloadRequest;
}) {
  const { payload, submission, state, scope, req } = args;
  const eligible = isRetrievalEligibleState(state) && isHubIngestionEligible(state);
  const learningResourceId = relId(submission.learningResource as Rel);
  const knowledgeDocumentId = relId(submission.knowledgeDocument as Rel);

  if (knowledgeDocumentId != null) {
    await payload.update({
      collection: 'knowledge-documents',
      id: knowledgeDocumentId,
      data: {
        allowAiUse: eligible,
        publicationStatus: eligible ? 'published' : 'unpublished',
        knowledgeScope: scope,
        schoolKey: submission.schoolKey,
        retrievalEligible: eligible,
        governanceState: state,
      } as never,
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });
  }

  if (eligible && learningResourceId != null) {
    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        processingStatus: 'pending',
        autoProcess: true,
        knowledgeScope: scope,
        schoolKey: submission.schoolKey,
        retrievalEligible: true,
        governanceState: state,
      } as never,
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });
    void processLearningResource({
      payload,
      learningResourceId,
      req,
      hubOverrides: {
        allowAiUse: true,
        publicationStatus: 'published',
        humanReviewRequired: false,
        allowedAgents:
          scope === 'OMNIA_APPROVED' ? ['tutor', 'engineering', 'concierge'] : ['tutor'],
        tags: [
          `scope:${scope}`,
          `school:${String(submission.schoolKey || '')}`,
          `governance:${state}`,
        ],
      },
    });
  }
}

export async function reviewGovernanceSubmission(args: {
  payload: Payload;
  submissionId: string | number;
  user: unknown;
  action:
    | 'approve_school'
    | 'reject'
    | 'promote_omnia'
    | 'approve_omnia'
    | 'revoke'
    | 'request_correction';
  reason?: string;
  req?: PayloadRequest;
}): Promise<Record<string, unknown>> {
  const { payload, submissionId, user, action, reason, req } = args;
  const role = roleOf(user);
  const actorId = userIdOf(user);
  if (actorId == null) throw new Error('UNAUTHORIZED');

  const doc = (await payload.findByID({
    collection: 'knowledge-governance-submissions',
    id: submissionId,
    depth: 0,
    overrideAccess: true,
    req,
  })) as Record<string, unknown>;

  const from = (doc.governanceState || 'COURSE_PRIVATE') as GovernanceState;
  let to: GovernanceState;
  let auditAction = action;

  switch (action) {
    case 'approve_school':
      if (!canApproveSchool(role)) throw new Error('FORBIDDEN');
      to = 'SCHOOL_APPROVED';
      auditAction = 'approved';
      break;
    case 'reject':
      if (!canApproveSchool(role)) throw new Error('FORBIDDEN');
      if (!reason?.trim()) throw new Error('REASON_REQUIRED');
      to = 'REJECTED';
      auditAction = 'rejected';
      break;
    case 'request_correction':
      if (!canApproveSchool(role)) throw new Error('FORBIDDEN');
      if (!reason?.trim()) throw new Error('REASON_REQUIRED');
      to = 'COURSE_PRIVATE';
      auditAction = 'correction_requested';
      break;
    case 'promote_omnia':
      if (!canApproveOmnia(role)) throw new Error('FORBIDDEN');
      to = 'PENDING_OMNIA_REVIEW';
      auditAction = 'promoted';
      break;
    case 'approve_omnia':
      if (!canApproveOmnia(role)) throw new Error('FORBIDDEN');
      to = 'OMNIA_APPROVED';
      auditAction = 'approved';
      break;
    case 'revoke':
      if (!canRevoke(role)) throw new Error('FORBIDDEN');
      to = 'REVOKED';
      auditAction = 'revoked';
      break;
    default:
      throw new Error('UNKNOWN_ACTION');
  }

  assertGovernanceTransition(from, to);
  const scope = (scopeForState(to) ?? 'COURSE_PRIVATE') as KnowledgeScope;
  const schoolKey = typeof doc.schoolKey === 'string' ? doc.schoolKey : null;
  const now = new Date().toISOString();
  const eligible = isRetrievalEligibleState(to);

  const updated = await payload.update({
    collection: 'knowledge-governance-submissions',
    id: submissionId,
    data: {
      governanceState: to,
      knowledgeScope: scope,
      statusLabel: statusLabelFor(to, schoolKey),
      retrievalEligible: eligible,
      approvedVersionHash: eligible ? doc.contentVersionHash : doc.approvedVersionHash,
      reviewNote: reason || doc.reviewNote,
      lastReviewer: actorId,
      reviewedAt: now,
    },
    overrideAccess: true,
    req,
    context: { governancePipelineActive: true },
  });

  await appendDecision(
    payload,
    submissionId,
    {
      action: auditAction,
      fromState: from,
      toState: to,
      scope,
      reason: reason || null,
      actorId: String(actorId),
      at: now,
      versionHash: doc.contentVersionHash,
    },
    req,
  );

  await applyHubEligibility({
    payload,
    submission: { ...doc, ...updated },
    state: to,
    scope,
    req,
  });

  await writeKnowledgeAudit(
    payload,
    {
      action: auditAction,
      entityType: 'knowledge-governance-submissions',
      entityId: String(submissionId),
      actorId: String(actorId),
      previousState: { governanceState: from },
      nextState: { governanceState: to, scope, schoolKey },
      reason: reason || null,
    },
    req,
  );

  return updated as Record<string, unknown>;
}

/**
 * When lesson content changes materially, drop inherited approval.
 */
export async function invalidateGovernanceOnLessonChange(args: {
  payload: Payload;
  lessonId: number;
  req?: PayloadRequest;
}): Promise<void> {
  const { payload, lessonId, req } = args;
  const ctx = await resolveLessonContext(payload, lessonId, req);
  const found = await payload.find({
    collection: 'knowledge-governance-submissions',
    where: {
      and: [{ sourceType: { equals: 'lesson' } }, { sourceId: { equals: String(lessonId) } }],
    },
    limit: 5,
    depth: 0,
    overrideAccess: true,
    req,
  });

  for (const raw of found.docs) {
    const doc = raw as {
      id: string | number;
      governanceState?: string;
      contentVersionHash?: string;
      approvedVersionHash?: string;
      schoolKey?: string;
    };
    if (versionsMatch(doc.contentVersionHash, ctx.contentHash)) continue;
    const from = (doc.governanceState || 'COURSE_PRIVATE') as GovernanceState;
    const to = stateAfterMaterialEdit(from);
    if (from === to && doc.contentVersionHash === ctx.contentHash) continue;

    const now = new Date().toISOString();
    await payload.update({
      collection: 'knowledge-governance-submissions',
      id: doc.id,
      data: {
        title: ctx.title,
        contentVersionHash: ctx.contentHash,
        governanceState: to,
        knowledgeScope: 'COURSE_PRIVATE',
        statusLabel: statusLabelFor(to, doc.schoolKey ?? ctx.schoolKey),
        retrievalEligible: false,
      },
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });

    await appendDecision(
      payload,
      doc.id,
      {
        action: 'version_changed',
        fromState: from,
        toState: to,
        scope: 'COURSE_PRIVATE',
        reason: 'Conteúdo alterado — aprovação anterior não herdada',
        at: now,
        versionHash: ctx.contentHash,
      },
      req,
    );

    const kd = relId((raw as { knowledgeDocument?: Rel }).knowledgeDocument);
    if (kd != null) {
      await payload.update({
        collection: 'knowledge-documents',
        id: kd,
        data: {
          allowAiUse: false,
          publicationStatus: 'unpublished',
          retrievalEligible: false,
          governanceState: to,
          knowledgeScope: 'COURSE_PRIVATE',
        } as never,
        overrideAccess: true,
        req,
        context: { governancePipelineActive: true },
      });
    }
  }
}

export async function getGovernanceStatusForLesson(args: {
  payload: Payload;
  lessonId: number;
  req?: PayloadRequest;
}): Promise<Record<string, unknown> | null> {
  const found = await args.payload.find({
    collection: 'knowledge-governance-submissions',
    where: {
      and: [{ sourceType: { equals: 'lesson' } }, { sourceId: { equals: String(args.lessonId) } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req: args.req,
  });
  return (found.docs[0] as Record<string, unknown>) || null;
}
