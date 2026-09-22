export const PUBLIC_COMPANY_HOLDING_SLUG = 'omnia-frigo-holding';
export const PUBLIC_COMPANY_LIST_LIMIT = 20;

export const PUBLIC_COMPANY_BRAND_THEMES = [
  'omnia',
  'renovacao',
  'fred',
  'cte',
  'neurofrigo',
] as const;

export type PublicCompanyBrandTheme = (typeof PUBLIC_COMPANY_BRAND_THEMES)[number];

export const PUBLIC_COMPANY_OFFERING_KINDS = ['service', 'product', 'course', 'solution'] as const;
export type PublicCompanyOfferingKind = (typeof PUBLIC_COMPANY_OFFERING_KINDS)[number];
