import type { KnowledgeStatus, SecurityClassification, TechnicalRiskLevel } from './constants';

const TRANSITIONS: Record<KnowledgeStatus, readonly KnowledgeStatus[]> = {
  draft: ['in_review', 'archived'],
  in_review: ['approved', 'rejected', 'draft'],
  approved: ['processing', 'published', 'archived', 'draft'],
  processing: ['indexed', 'processing_failed', 'approved'],
  indexed: ['published', 'archived', 'processing'],
  published: ['archived', 'suspended', 'expired'],
  rejected: ['draft', 'archived'],
  archived: ['draft'],
  expired: ['archived', 'draft'],
  processing_failed: ['approved', 'draft', 'archived'],
  suspended: ['published', 'archived', 'draft'],
};

export function canTransition(from: KnowledgeStatus, to: KnowledgeStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: KnowledgeStatus, to: KnowledgeStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid knowledge workflow transition: ${from} → ${to}`);
  }
}

/** Publicação exige aprovação prévia (ou já indexed). */
export function canPublish(status: KnowledgeStatus): boolean {
  return status === 'approved' || status === 'indexed';
}

export function requiresHumanReview(input: {
  technicalRiskLevel?: TechnicalRiskLevel | null;
  humanReviewRequired?: boolean | null;
  securityClassification?: SecurityClassification | null;
}): boolean {
  if (input.humanReviewRequired === true) return true;
  if (input.technicalRiskLevel === 'high' || input.technicalRiskLevel === 'critical') return true;
  if (input.securityClassification === 'INTERNAL_RESTRICTED') return true;
  return false;
}

/** Defaults seguros para material técnico sensível (lote inicial). */
export const SENSITIVE_TECHNICAL_DEFAULTS = {
  status: 'draft' as KnowledgeStatus,
  technicalRiskLevel: 'high' as TechnicalRiskLevel,
  humanReviewRequired: true,
  allowAiUse: false,
  publicationStatus: 'unpublished' as const,
  securityClassification: 'INTERNAL_RESTRICTED' as SecurityClassification,
};
