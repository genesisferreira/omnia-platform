import type { KnowledgeScope } from './constants';
import { isAssessmentSecretContent } from './version';

export type GovernanceRetrievalRecord = {
  knowledgeScope?: KnowledgeScope | string | null;
  schoolKey?: string | null;
  tenantId?: string | null;
  courseId?: string | number | null;
  retrievalEligible?: boolean | null;
  allowAiUse?: boolean | null;
  assessmentSecret?: boolean | null;
  tags?: string[] | null;
  title?: string | null;
};

export type GovernanceRetrievalSubject = {
  role?: string | null;
  tenantId?: string | null;
  schoolKey?: string | null;
  enrolledCourseIds?: Array<string | number>;
  agentKey?: string | null;
  channel?: 'portal_chat' | 'portal_public' | 'admin' | 'system' | 'command' | 'tutor';
  /** Explicit course context for Tutor COURSE_PRIVATE passages/retrieval. */
  activeCourseId?: string | number | null;
};

export type GovernanceEligibilityDecision = {
  allow: boolean;
  reason: string;
  code:
    | 'ALLOW'
    | 'DENY_NOT_ELIGIBLE'
    | 'DENY_ASSESSMENT_SECRET'
    | 'DENY_AI_FLAG'
    | 'DENY_TENANT'
    | 'DENY_SCHOOL'
    | 'DENY_COURSE'
    | 'DENY_SCOPE'
    | 'DENY_AGENT'
    | 'DENY_CHANNEL';
};

/**
 * Pre-return retrieval gate for governed knowledge.
 * COURSE_PRIVATE stays Tutor+authorized course; school/omnia require scope+school/agent checks.
 */
export function evaluateRetrievalEligibility(
  record: GovernanceRetrievalRecord,
  subject: GovernanceRetrievalSubject,
): GovernanceEligibilityDecision {
  if (subject.channel === 'admin' || subject.channel === 'system') {
    return { allow: true, reason: 'Admin/system channel', code: 'ALLOW' };
  }

  if (
    record.assessmentSecret === true ||
    isAssessmentSecretContent({
      title: record.title,
      tags: record.tags ?? undefined,
      explicitSecret: record.assessmentSecret,
    })
  ) {
    return {
      allow: false,
      reason: 'Assessment secrets are never retrievable via RAG',
      code: 'DENY_ASSESSMENT_SECRET',
    };
  }

  if (record.allowAiUse === false) {
    return { allow: false, reason: 'allowAiUse=false', code: 'DENY_AI_FLAG' };
  }

  if (record.retrievalEligible === false) {
    return { allow: false, reason: 'Not retrieval-eligible', code: 'DENY_NOT_ELIGIBLE' };
  }

  if (subject.tenantId && record.tenantId && subject.tenantId !== record.tenantId) {
    return { allow: false, reason: 'Cross-tenant deny', code: 'DENY_TENANT' };
  }

  const scope = (record.knowledgeScope ?? 'COURSE_PRIVATE') as KnowledgeScope;

  if (scope === 'COURSE_PRIVATE') {
    // Only Tutor (or explicit tutor channel) with matching course context.
    const tutorLike =
      subject.channel === 'tutor' ||
      subject.agentKey === 'tutor' ||
      subject.channel === 'portal_chat';
    if (!tutorLike || (subject.agentKey && subject.agentKey !== 'tutor')) {
      // Non-tutor agents never get COURSE_PRIVATE Hub vectors.
      if (subject.agentKey && subject.agentKey !== 'tutor') {
        return {
          allow: false,
          reason: 'COURSE_PRIVATE not available to non-tutor agents',
          code: 'DENY_AGENT',
        };
      }
    }
    if (subject.schoolKey && record.schoolKey && subject.schoolKey !== record.schoolKey) {
      return { allow: false, reason: 'Cross-school deny', code: 'DENY_SCHOOL' };
    }
    if (record.courseId != null) {
      const active = subject.activeCourseId;
      const enrolled = (subject.enrolledCourseIds ?? []).map(String);
      const courseOk =
        (active != null && String(active) === String(record.courseId)) ||
        enrolled.includes(String(record.courseId));
      if (!courseOk) {
        return {
          allow: false,
          reason: 'COURSE_PRIVATE requires authorized course context',
          code: 'DENY_COURSE',
        };
      }
    }
    // Commercial / engineering never see course private even if mis-tagged tutor channel
    if (subject.agentKey === 'commercial' || subject.agentKey === 'engineering') {
      return { allow: false, reason: 'Agent denied for COURSE_PRIVATE', code: 'DENY_AGENT' };
    }
    return { allow: true, reason: 'COURSE_PRIVATE tutor course context', code: 'ALLOW' };
  }

  if (scope === 'SCHOOL_APPROVED') {
    if (subject.schoolKey && record.schoolKey && subject.schoolKey !== record.schoolKey) {
      return { allow: false, reason: 'School mismatch', code: 'DENY_SCHOOL' };
    }
    if (!subject.schoolKey && record.schoolKey) {
      // Require school awareness for school-scoped knowledge
      return { allow: false, reason: 'School context required', code: 'DENY_SCHOOL' };
    }
    const agentDeny = denyAgentForAcademicSchool(subject.agentKey);
    if (agentDeny) return agentDeny;
    return { allow: true, reason: 'SCHOOL_APPROVED', code: 'ALLOW' };
  }

  if (scope === 'OMNIA_APPROVED') {
    // Still subject to assistant authorization — never unrestricted.
    const agent = subject.agentKey ?? null;
    if (!agent) {
      return {
        allow: false,
        reason: 'Assistant key required for OMNIA_APPROVED',
        code: 'DENY_AGENT',
      };
    }
    if (!isAgentAuthorizedForOmniaScope(agent)) {
      return {
        allow: false,
        reason: 'Assistant not authorized for OMNIA_APPROVED',
        code: 'DENY_AGENT',
      };
    }
    return { allow: true, reason: 'OMNIA_APPROVED authorized assistant', code: 'ALLOW' };
  }

  return { allow: false, reason: 'Unknown scope', code: 'DENY_SCOPE' };
}

function denyAgentForAcademicSchool(
  agentKey: string | null | undefined,
): GovernanceEligibilityDecision | null {
  if (!agentKey) return null;
  if (agentKey === 'commercial') {
    return {
      allow: false,
      reason: 'Commercial IA cannot consume school academic knowledge',
      code: 'DENY_AGENT',
    };
  }
  return null;
}

/**
 * OMNIA_APPROVED ≠ all agents. Explicit allowlist of institutional consumers.
 * Tutor/engineering/concierge may consume; commercial requires explicit policy tag elsewhere.
 */
export function isAgentAuthorizedForOmniaScope(agentKey: string): boolean {
  const allowed = new Set([
    'tutor',
    'concierge',
    'engineering',
    'neurofrigo-technology',
    'refrigeration',
    'electrical-controls',
    'projects-lab',
    'content-production',
    'command',
  ]);
  return allowed.has(agentKey.toLowerCase());
}

export function filterHitsByGovernance<T extends { record: GovernanceRetrievalRecord }>(
  hits: T[],
  subject: GovernanceRetrievalSubject,
): T[] {
  return hits.filter((hit) => evaluateRetrievalEligibility(hit.record, subject).allow);
}
