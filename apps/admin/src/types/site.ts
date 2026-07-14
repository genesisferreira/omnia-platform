export const SITE_STATUSES = ['draft', 'active', 'inactive', 'maintenance', 'archived'] as const;

export type SiteStatus = (typeof SITE_STATUSES)[number];

export const SITE_ENVIRONMENTS = ['local', 'development', 'staging', 'production'] as const;

export type SiteEnvironment = (typeof SITE_ENVIRONMENTS)[number];

export const SITE_TYPES = [
  'holding_portal',
  'company_profile',
  'institutional',
  'education',
  'campaign',
  'application',
  'marketplace',
] as const;

export type SiteType = (typeof SITE_TYPES)[number];

export const SITE_LOCALES = ['pt-BR', 'en', 'es'] as const;

export type SiteLocale = (typeof SITE_LOCALES)[number];

export const DEFAULT_SITE_LOCALE: SiteLocale = 'pt-BR';

export const DEFAULT_SITE_TIMEZONE = 'America/Sao_Paulo';

export type SiteReference = {
  id: string;
  name: string;
  slug: string;
  status: SiteStatus;
  environment: SiteEnvironment;
  type: SiteType;
  locale: SiteLocale;
  timezone: string;
  companyId?: string;
  brandId?: string;
  primaryDomain?: string;
};
