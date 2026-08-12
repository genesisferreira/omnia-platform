/**
 * Re-exporta regras de slug/status do pacote compartilhado (fonte única).
 */
export {
  isValidPartnerSlug,
  normalizePartnerSlug,
  PARTNER_PLANS,
  PARTNER_SLUG_PATTERN,
  PARTNER_STATUSES,
  PARTNER_WORKFLOW_STATUSES,
  slugSourceFromPartner,
  type PartnerPlan,
  type PartnerStatus,
} from '@omnia/shared';
