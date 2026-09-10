/** Knowledge Governance — scopes and lifecycle (distinct from Media visibility). */

export const KNOWLEDGE_SCOPES = ['COURSE_PRIVATE', 'SCHOOL_APPROVED', 'OMNIA_APPROVED'] as const;
export type KnowledgeScope = (typeof KNOWLEDGE_SCOPES)[number];

export const GOVERNANCE_STATES = [
  'DRAFT',
  'COURSE_PRIVATE',
  'PENDING_SCHOOL_REVIEW',
  'SCHOOL_APPROVED',
  'PENDING_OMNIA_REVIEW',
  'OMNIA_APPROVED',
  'REJECTED',
  'REVOKED',
  'ARCHIVED',
] as const;
export type GovernanceState = (typeof GOVERNANCE_STATES)[number];

export const GOVERNANCE_SOURCE_TYPES = [
  'lesson',
  'lesson_asset',
  'learning_resource',
  'knowledge_document',
] as const;
export type GovernanceSourceType = (typeof GOVERNANCE_SOURCE_TYPES)[number];

export const GOVERNANCE_AUDIT_ACTIONS = [
  'submitted',
  'approved',
  'rejected',
  'promoted',
  'revoked',
  'version_changed',
  'ingestion_started',
  'ingestion_completed',
  'retrieval_eligibility_changed',
  'correction_requested',
  'archived',
] as const;
export type GovernanceAuditAction = (typeof GOVERNANCE_AUDIT_ACTIONS)[number];

/** Roles allowed to review school submissions. */
export const SCHOOL_REVIEWER_ROLES = [
  'technical_reviewer',
  'neurofrigo_admin',
  'admin',
  'super_admin',
] as const;

/** Roles allowed to promote/approve Omnia institutional scope. */
export const OMNIA_REVIEWER_ROLES = ['neurofrigo_admin', 'admin', 'super_admin'] as const;

/** User-facing Portuguese labels (no vector/RAG jargon). */
export const GOVERNANCE_STATE_LABELS_PT: Record<GovernanceState, string> = {
  DRAFT: 'Rascunho',
  COURSE_PRIVATE: 'Privado do curso',
  PENDING_SCHOOL_REVIEW: 'Em revisão',
  SCHOOL_APPROVED: 'Aprovado para escola',
  PENDING_OMNIA_REVIEW: 'Em revisão Omnia',
  OMNIA_APPROVED: 'Aprovado Omnia',
  REJECTED: 'Rejeitado',
  REVOKED: 'Revogado',
  ARCHIVED: 'Arquivado',
};

export function schoolApprovedLabel(schoolKey: string | null | undefined): string {
  if (schoolKey === 'fred-do-frio') return 'Aprovado para Fred';
  if (schoolKey === 'cte') return 'Aprovado para CTE';
  return GOVERNANCE_STATE_LABELS_PT.SCHOOL_APPROVED;
}

/** Tags that must never enter general Knowledge Hub retrieval. */
export const ASSESSMENT_SECRET_TAGS = [
  'assessment_secret',
  'answer_key',
  'gabarito',
  'teacher_only_feedback',
] as const;
