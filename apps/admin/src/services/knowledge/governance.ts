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

/** Runtime collection slug (typed after `payload generate:types` in CI). */
const KG_SLUG = 'knowledge-governance-submissions';

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

async function kgFindByID(
  payload: Payload,
  id: string | number,
  req?: PayloadRequest,
): Promise<Record<string, unknown>> {
  const doc = await payload.findByID({
    collection: KG_SLUG as 'media',
    id,
    depth: 0,
    overrideAccess: true,
    req,
  });
  return doc as unknown as Record<string, unknown>;
}

async function kgFind(
  payload: Payload,
  where: Record<string, unknown>,
  req?: PayloadRequest,
  limit = 1,
): Promise<Record<string, unknown>[]> {
  const found = await payload.find({
    collection: KG_SLUG as 'media',
    where: where as never,
    limit,
    depth: 0,
    overrideAccess: true,
    req,
  });
  return found.docs as unknown as Record<string, unknown>[];
}

async function kgUpdate(
  payload: Payload,
  id: string | number,
  data: Record<string, unknown>,
  req?: PayloadRequest,
): Promise<Record<string, unknown>> {
  const updated = await payload.update({
    collection: KG_SLUG as 'media',
    id,
    data: data as never,
    overrideAccess: true,
    req,
    context: { governancePipelineActive: true },
  });
  return updated as unknown as Record<string, unknown>;
}

async function kgCreate(
  payload: Payload,
  data: Record<string, unknown>,
  req?: PayloadRequest,
): Promise<Record<string, unknown>> {
  const created = await payload.create({
    collection: KG_SLUG as 'media',
    data: data as never,
    overrideAccess: true,
    req,
    context: { governancePipelineActive: true },
  });
  return created as unknown as Record<string, unknown>;
}

async function appendDecision(
  payload: Payload,
  submissionId: string | number,
  entry: Record<string, unknown>,
  req?: PayloadRequest,
) {
  const doc = await kgFindByID(payload, submissionId, req);
  const decisions = Array.isArray(doc.decisions) ? [...(doc.decisions as unknown[])] : [];
  decisions.push(entry);
  await kgUpdate(payload, submissionId, { decisions }, req);
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
  })) as unknown as Record<string, unknown>;

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
    })) as unknown as Record<string, unknown>;
    courseId = relId(mod.course as Rel);
    if (courseId != null) {
      const course = (await payload.findByID({
        collection: 'courses',
        id: courseId,
        depth: 0,
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>;
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

  if (isAssessmentSecretContent({ title: ctx.title })) {
    throw new Error('ASSESSMENT_SECRET_NOT_SUBMISSIBLE');
  }

  const existingDocs = await kgFind(
    payload,
    {
      and: [{ sourceType: { equals: 'lesson' } }, { sourceId: { equals: String(lessonId) } }],
    },
    req,
    1,
  );

  const requestedScope = args.requestedScope ?? 'SCHOOL_APPROVED';
  const now = new Date().toISOString();

  if (existingDocs[0]) {
    const prev = existingDocs[0] as {
      id: string | number;
      governanceState?: string;
      contentVersionHash?: string;
    };
    const state = (prev.governanceState || 'COURSE_PRIVATE') as GovernanceState;
    if (!canSubmitForSchoolReview(state) && state !== 'COURSE_PRIVATE') {
      if (state === 'PENDING_SCHOOL_REVIEW' || state === 'PENDING_OMNIA_REVIEW') {
        return existingDocs[0];
      }
    }
    const from = canSubmitForSchoolReview(state) ? state : 'COURSE_PRIVATE';
    if (!canTransitionGovernance(from, 'PENDING_SCHOOL_REVIEW')) {
      assertGovernanceTransition(from, 'PENDING_SCHOOL_REVIEW');
    }
    assertGovernanceTransition(from, 'PENDING_SCHOOL_REVIEW');

    const updated = await kgUpdate(
      payload,
      prev.id,
      {
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
      req,
    );

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

    return updated;
  }

  const created = await kgCreate(
    payload,
    {
      title: ctx.title,
      sourceType: 'lesson',
      sourceId: String(lessonId),
      course: ctx.courseId ?? undefined,
      lesson: lessonId,
      schoolKey: ctx.schoolKey,
      ownerCompany: ctx.ownerCompanyId ?? undefined,
      author: String(authorId),
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
    req,
  );

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

  return created;
}

async function ensureLessonTextLearningResource(args: {
  payload: Payload;
  submission: Record<string, unknown>;
  req?: PayloadRequest;
}): Promise<{ learningResourceId: number; sourceBuffer: Buffer; text: string } | null> {
  const { payload, submission, req } = args;
  const lessonId = relId(submission.lesson as Rel);
  if (lessonId == null) return null;

  const lesson = (await payload.findByID({
    collection: 'lessons',
    id: lessonId,
    depth: 0,
    overrideAccess: true,
    req,
  })) as unknown as Record<string, unknown>;

  const title = String(lesson.title || submission.title || `Aula ${lessonId}`);
  const text = [title, String(lesson.summary || ''), String(lesson.content || '')]
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
  if (!text) return null;

  const sourceBuffer = Buffer.from(text, 'utf8');
  const courseId = relId(submission.course as Rel);
  const ownerCompanyId = relId(submission.ownerCompany as Rel);
  const versionHash =
    typeof submission.contentVersionHash === 'string' ? submission.contentVersionHash : '';

  const existing = await payload.find({
    collection: 'learning-resources',
    where: {
      and: [
        { lesson: { equals: lessonId } },
        { resourceType: { equals: 'txt' } },
        { origin: { equals: 'upload' } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  let learningResourceId = relId(existing.docs[0]?.id as Rel);
  if (learningResourceId == null) {
    const media = await payload.create({
      collection: 'media',
      data: { alt: `Governance lesson ${lessonId}` },
      file: {
        data: sourceBuffer,
        mimetype: 'text/plain',
        name: `governance-lesson-${lessonId}-${Date.now()}.txt`,
        size: sourceBuffer.length,
      },
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true, kiPipelineActive: true },
    } as never);

    const created = await payload.create({
      collection: 'learning-resources',
      data: {
        title,
        media: media.id,
        lesson: lessonId,
        course: courseId ?? undefined,
        resourceType: 'txt',
        origin: 'upload',
        processingStatus: 'pending',
        autoProcess: false,
        language: 'pt-BR',
        version: versionHash.slice(0, 12) || '1.0.0',
        knowledgeScope: 'COURSE_PRIVATE',
        retrievalEligible: false,
        governanceState: 'COURSE_PRIVATE',
        schoolKey: typeof submission.schoolKey === 'string' ? submission.schoolKey : undefined,
        ownerCompany: ownerCompanyId ?? undefined,
        contentVersionHash: versionHash || undefined,
        tags: [{ tag: 'governance-lesson' }, { tag: `lesson:${lessonId}` }],
      } as never,
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true, kiPipelineActive: true },
    });
    learningResourceId = relId(created.id);
  }

  if (learningResourceId == null) return null;
  return { learningResourceId, sourceBuffer, text };
}

async function applyHubEligibility(args: {
  payload: Payload;
  submission: Record<string, unknown>;
  submissionId: string | number;
  state: GovernanceState;
  scope: KnowledgeScope;
  actorId: string | number;
  req?: PayloadRequest;
}) {
  const { payload, submission, submissionId, state, scope, actorId, req } = args;
  const eligible = isRetrievalEligibleState(state) && isHubIngestionEligible(state);
  let learningResourceId = relId(submission.learningResource as Rel);
  let knowledgeDocumentId = relId(submission.knowledgeDocument as Rel);
  const versionHash =
    typeof submission.contentVersionHash === 'string' ? submission.contentVersionHash : null;

  let sourceBuffer: Buffer | undefined;
  let preText: string | undefined;

  if (eligible && learningResourceId == null) {
    const ensured = await ensureLessonTextLearningResource({ payload, submission, req });
    if (ensured) {
      learningResourceId = ensured.learningResourceId;
      sourceBuffer = ensured.sourceBuffer;
      preText = ensured.text;
    }
  }

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
        contentVersionHash: versionHash ?? undefined,
        assessmentSecret: submission.assessmentSecret === true,
      } as never,
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });
  }

  if (learningResourceId != null && !eligible) {
    await payload.update({
      collection: 'learning-resources',
      id: learningResourceId,
      data: {
        autoProcess: false,
        knowledgeScope: scope,
        schoolKey: submission.schoolKey,
        retrievalEligible: false,
        governanceState: state,
        contentVersionHash: versionHash ?? undefined,
      } as never,
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });
  }

  if (eligible && learningResourceId != null) {
    await writeKnowledgeAudit(
      payload,
      {
        action: 'ingestion_started',
        entityType: 'knowledge-governance-submissions',
        entityId: String(submissionId),
        actorId: String(actorId),
        nextState: { learningResourceId, scope, state },
      },
      req,
    );

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
        contentVersionHash: versionHash ?? undefined,
      } as never,
      overrideAccess: true,
      req,
      context: { governancePipelineActive: true },
    });

    const processed = await processLearningResource({
      payload,
      learningResourceId,
      req,
      sourceBuffer,
      sourceMimeType: sourceBuffer ? 'text/plain' : undefined,
      sourceFilename: sourceBuffer ? `governance-lesson-${learningResourceId}.txt` : undefined,
      preExtracted: preText
        ? { text: preText, meta: { language: 'pt-BR', encoding: 'utf-8' } }
        : undefined,
      hubOverrides: {
        allowAiUse: true,
        publicationStatus: 'published',
        humanReviewRequired: false,
        securityClassification: 'STUDENT',
        ownerCompany: relId(submission.ownerCompany as Rel) ?? undefined,
        allowedAgents:
          scope === 'OMNIA_APPROVED' ? ['tutor', 'engineering', 'concierge'] : ['tutor'],
        tags: [
          `scope:${scope}`,
          `school:${String(submission.schoolKey || '')}`,
          `governance:${state}`,
        ],
        revisionNotes: `Epic 17 governed ingest (${scope}/${state}).`,
      },
    });

    knowledgeDocumentId = relId(processed.knowledgeDocumentId as Rel) ?? knowledgeDocumentId;

    if (knowledgeDocumentId != null) {
      await payload.update({
        collection: 'knowledge-documents',
        id: knowledgeDocumentId,
        data: {
          allowAiUse: true,
          publicationStatus: 'published',
          knowledgeScope: scope,
          schoolKey: submission.schoolKey,
          retrievalEligible: true,
          governanceState: state,
          contentVersionHash: versionHash ?? undefined,
          assessmentSecret: false,
        } as never,
        overrideAccess: true,
        req,
        context: { governancePipelineActive: true },
      });
    }

    await kgUpdate(
      payload,
      submissionId,
      {
        learningResource: learningResourceId,
        knowledgeDocument: knowledgeDocumentId ?? undefined,
      },
      req,
    );

    await writeKnowledgeAudit(
      payload,
      {
        action: 'ingestion_completed',
        entityType: 'knowledge-governance-submissions',
        entityId: String(submissionId),
        actorId: String(actorId),
        nextState: {
          learningResourceId,
          knowledgeDocumentId,
          ok: processed.ok,
          chunkCount: processed.chunkCount,
        },
      },
      req,
    );
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

  const doc = await kgFindByID(payload, submissionId, req);

  const from = (doc.governanceState || 'COURSE_PRIVATE') as GovernanceState;
  let to: GovernanceState;
  let auditAction = 'approved';

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

  const updated = await kgUpdate(
    payload,
    submissionId,
    {
      governanceState: to,
      knowledgeScope: scope,
      statusLabel: statusLabelFor(to, schoolKey),
      retrievalEligible: eligible,
      approvedVersionHash: eligible ? doc.contentVersionHash : doc.approvedVersionHash,
      reviewNote: reason || doc.reviewNote,
      lastReviewer: actorId,
      reviewedAt: now,
    },
    req,
  );

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
    submissionId,
    state: to,
    scope,
    actorId,
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

  return updated;
}

export async function invalidateGovernanceOnLessonChange(args: {
  payload: Payload;
  lessonId: number;
  req?: PayloadRequest;
}): Promise<void> {
  const { payload, lessonId, req } = args;
  const ctx = await resolveLessonContext(payload, lessonId, req);
  const foundDocs = await kgFind(
    payload,
    {
      and: [{ sourceType: { equals: 'lesson' } }, { sourceId: { equals: String(lessonId) } }],
    },
    req,
    5,
  );

  for (const raw of foundDocs) {
    const doc = raw as {
      id: string | number;
      governanceState?: string;
      contentVersionHash?: string;
      approvedVersionHash?: string;
      schoolKey?: string;
      knowledgeDocument?: Rel;
    };
    if (versionsMatch(doc.contentVersionHash, ctx.contentHash)) continue;
    const from = (doc.governanceState || 'COURSE_PRIVATE') as GovernanceState;
    const to = stateAfterMaterialEdit(from);
    const now = new Date().toISOString();
    await kgUpdate(
      payload,
      doc.id,
      {
        title: ctx.title,
        contentVersionHash: ctx.contentHash,
        governanceState: to,
        knowledgeScope: 'COURSE_PRIVATE',
        statusLabel: statusLabelFor(to, doc.schoolKey ?? ctx.schoolKey),
        retrievalEligible: false,
      },
      req,
    );

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

    const kd = relId(doc.knowledgeDocument);
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
  const found = await kgFind(
    args.payload,
    {
      and: [{ sourceType: { equals: 'lesson' } }, { sourceId: { equals: String(args.lessonId) } }],
    },
    args.req,
    1,
  );
  return found[0] || null;
}
