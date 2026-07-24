export const PARTNER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PARTNER_STATUSES = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const;

export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_PLANS = ['free', 'professional', 'premium', 'enterprise'] as const;

export type PartnerPlan = (typeof PARTNER_PLANS)[number];

export const PARTNER_WORKFLOW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const;

export const normalizePartnerSlug = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized === '' ? undefined : normalized;
};

export const isValidPartnerSlug = (value: string): boolean => PARTNER_SLUG_PATTERN.test(value);

export const slugSourceFromPartner = (data: {
  slug?: unknown;
  tradeName?: unknown;
  companyName?: unknown;
}): string | undefined => {
  const explicit = normalizePartnerSlug(data.slug);
  if (explicit) {
    return explicit;
  }
  return (
    normalizePartnerSlug(data.tradeName) ?? normalizePartnerSlug(data.companyName)
  );
};
