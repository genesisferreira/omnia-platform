/**
 * EPIC17.3 — response sanitization for Knowledge Governance HTTP endpoints.
 *
 * `payload.update` / `payload.create` (used by the governance service with `overrideAccess`)
 * apply Payload's default population depth, so the returned submission embeds full related docs
 * (e.g. `course.instructor` = whole `users` doc with sessions, email, CPF, tenant, company…).
 *
 * This module projects a submission through an EXPLICIT ALLOWLIST before it leaves the API.
 * Unknown / newly added fields (on the submission or on any related doc) are dropped by design;
 * never replace this with a blacklist.
 */

type AnyRecord = Record<string, unknown>;

/** Scalar submission fields returned to clients (collection `knowledge-governance-submissions`). */
export const GOVERNANCE_SUBMISSION_RESPONSE_FIELDS = [
  'id',
  'title',
  'sourceType',
  'sourceId',
  'schoolKey',
  'submittedAt',
  'contentVersionHash',
  'approvedVersionHash',
  'requestedScope',
  'knowledgeScope',
  'governanceState',
  'statusLabel',
  'retrievalEligible',
  'assessmentSecret',
  'reviewNote',
  'reviewedAt',
  'createdAt',
  'updatedAt',
] as const;

/** Any embedded user (course.instructor, author, lastReviewer) is reduced to this. */
export const GOVERNANCE_USER_RESPONSE_FIELDS = ['id', 'name'] as const;

export const GOVERNANCE_DECISION_RESPONSE_FIELDS = [
  'id',
  'action',
  'fromState',
  'toState',
  'scope',
  'reason',
  'actorId',
  'at',
  'versionHash',
] as const;

const COURSE_FIELDS = ['id', 'title', 'slug'] as const;
const LESSON_FIELDS = ['id', 'title', 'slug'] as const;
const COMPANY_FIELDS = ['id', 'name', 'slug'] as const;
const TITLED_FIELDS = ['id', 'title'] as const;

function isRecord(value: unknown): value is AnyRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function pick(source: AnyRecord, fields: readonly string[]): AnyRecord {
  const out: AnyRecord = {};
  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
}

/** Keep a relation as-is when it is an id (depth 0); project it when it was populated. */
function projectRel(value: unknown, fields: readonly string[]): unknown {
  if (value == null) return value;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (isRecord(value)) return pick(value, fields);
  return null;
}

export function projectGovernanceUser(value: unknown): unknown {
  return projectRel(value, GOVERNANCE_USER_RESPONSE_FIELDS);
}

function projectCourse(value: unknown): unknown {
  if (!isRecord(value)) return projectRel(value, COURSE_FIELDS);
  const out = pick(value, COURSE_FIELDS);
  if (value.instructor !== undefined) out.instructor = projectGovernanceUser(value.instructor);
  return out;
}

/**
 * Allowlist projection of a governance submission for HTTP responses.
 * Relations stay ids when unpopulated; populated relations are reduced to minimal display fields
 * and embedded users to `{ id, name }`.
 */
export function toGovernanceSubmissionResponse(doc: unknown): AnyRecord {
  if (!isRecord(doc)) return {};
  const out = pick(doc, GOVERNANCE_SUBMISSION_RESPONSE_FIELDS);
  if (doc.course !== undefined) out.course = projectCourse(doc.course);
  if (doc.lesson !== undefined) out.lesson = projectRel(doc.lesson, LESSON_FIELDS);
  if (doc.lessonAsset !== undefined) out.lessonAsset = projectRel(doc.lessonAsset, TITLED_FIELDS);
  if (doc.learningResource !== undefined) {
    out.learningResource = projectRel(doc.learningResource, TITLED_FIELDS);
  }
  if (doc.knowledgeDocument !== undefined) {
    out.knowledgeDocument = projectRel(doc.knowledgeDocument, TITLED_FIELDS);
  }
  if (doc.ownerCompany !== undefined)
    out.ownerCompany = projectRel(doc.ownerCompany, COMPANY_FIELDS);
  if (doc.author !== undefined) out.author = projectGovernanceUser(doc.author);
  if (doc.lastReviewer !== undefined) out.lastReviewer = projectGovernanceUser(doc.lastReviewer);
  if (Array.isArray(doc.decisions)) {
    out.decisions = doc.decisions
      .filter(isRecord)
      .map((d) => pick(d, GOVERNANCE_DECISION_RESPONSE_FIELDS));
  }
  return out;
}
