/**
 * Critérios de publicação pública do Partner Network.
 * Um parceiro só aparece se TODOS forem verdadeiros.
 */
export function isPartnerPubliclyVisible(doc: {
  status?: unknown;
  active?: unknown;
  publishedAt?: unknown;
}): boolean {
  if (doc.status !== 'approved') {
    return false;
  }
  if (doc.active !== true) {
    return false;
  }
  if (doc.publishedAt == null || doc.publishedAt === '') {
    return false;
  }
  return true;
}

/** Campos administrativos / privados — nunca na API pública. */
export const PARTNER_PRIVATE_FIELD_KEYS = [
  'document',
  'email',
  'approvalNotes',
  'approvedBy',
  'approvedAt',
  'ownerUser',
  'plan',
  'status',
  'active',
  'addressNumber',
  'addressComplement',
  'neighborhood',
] as const;

export type PartnerPrivateFieldKey = (typeof PARTNER_PRIVATE_FIELD_KEYS)[number];
