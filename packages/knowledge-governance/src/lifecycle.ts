import {
  GOVERNANCE_STATES,
  OMNIA_REVIEWER_ROLES,
  SCHOOL_REVIEWER_ROLES,
  type GovernanceState,
  type KnowledgeScope,
} from './constants';

const TRANSITIONS: Record<GovernanceState, readonly GovernanceState[]> = {
  DRAFT: ['COURSE_PRIVATE', 'ARCHIVED'],
  COURSE_PRIVATE: ['PENDING_SCHOOL_REVIEW', 'ARCHIVED', 'DRAFT'],
  PENDING_SCHOOL_REVIEW: ['SCHOOL_APPROVED', 'REJECTED', 'COURSE_PRIVATE'],
  SCHOOL_APPROVED: ['PENDING_OMNIA_REVIEW', 'REVOKED', 'COURSE_PRIVATE', 'ARCHIVED'],
  PENDING_OMNIA_REVIEW: ['OMNIA_APPROVED', 'REJECTED', 'SCHOOL_APPROVED'],
  OMNIA_APPROVED: ['REVOKED', 'ARCHIVED', 'COURSE_PRIVATE'],
  REJECTED: ['COURSE_PRIVATE', 'DRAFT', 'ARCHIVED'],
  REVOKED: ['COURSE_PRIVATE', 'ARCHIVED'],
  ARCHIVED: ['DRAFT', 'COURSE_PRIVATE'],
};

export function canTransitionGovernance(from: GovernanceState, to: GovernanceState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertGovernanceTransition(from: GovernanceState, to: GovernanceState): void {
  if (!canTransitionGovernance(from, to)) {
    throw new Error(`Invalid knowledge governance transition: ${from} → ${to}`);
  }
}

export function isGovernanceState(value: unknown): value is GovernanceState {
  return typeof value === 'string' && (GOVERNANCE_STATES as readonly string[]).includes(value);
}

/** Scope implied by an approved lifecycle state. */
export function scopeForState(state: GovernanceState): KnowledgeScope | null {
  if (state === 'COURSE_PRIVATE' || state === 'DRAFT' || state === 'REJECTED') {
    return 'COURSE_PRIVATE';
  }
  if (state === 'SCHOOL_APPROVED' || state === 'PENDING_OMNIA_REVIEW') {
    return 'SCHOOL_APPROVED';
  }
  if (state === 'OMNIA_APPROVED') {
    return 'OMNIA_APPROVED';
  }
  return null;
}

/** Hub ingestion eligibility (SCHOOL_APPROVED or OMNIA_APPROVED only). */
export function isHubIngestionEligible(state: GovernanceState): boolean {
  return state === 'SCHOOL_APPROVED' || state === 'OMNIA_APPROVED';
}

/** Future retrieval eligibility for indexed Hub knowledge. */
export function isRetrievalEligibleState(state: GovernanceState): boolean {
  return state === 'SCHOOL_APPROVED' || state === 'OMNIA_APPROVED';
}

export function canSubmitForSchoolReview(state: GovernanceState): boolean {
  return state === 'COURSE_PRIVATE' || state === 'DRAFT' || state === 'REJECTED';
}

export function canApproveSchool(role: string | null | undefined): boolean {
  return role != null && (SCHOOL_REVIEWER_ROLES as readonly string[]).includes(role);
}

export function canApproveOmnia(role: string | null | undefined): boolean {
  return role != null && (OMNIA_REVIEWER_ROLES as readonly string[]).includes(role);
}

export function canRevoke(role: string | null | undefined): boolean {
  return canApproveSchool(role);
}

/**
 * After a material content change, approval must not be inherited.
 * Returns the controlled state for the new version.
 */
export function stateAfterMaterialEdit(previous: GovernanceState): GovernanceState {
  if (
    previous === 'SCHOOL_APPROVED' ||
    previous === 'OMNIA_APPROVED' ||
    previous === 'PENDING_SCHOOL_REVIEW' ||
    previous === 'PENDING_OMNIA_REVIEW'
  ) {
    return 'COURSE_PRIVATE';
  }
  return previous === 'ARCHIVED' || previous === 'REVOKED' ? previous : 'COURSE_PRIVATE';
}
