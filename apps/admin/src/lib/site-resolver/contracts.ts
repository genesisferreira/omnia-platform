import type { PartialThemeTokens } from '../branding/theme';
import type { BrandReference } from '../../types/brand';
import type {
  SiteEnvironment,
  SiteLocale,
  SiteReference,
} from '../../types/site';
import type { ThemeTokens } from '../../types/theme';

export type SiteResolverInput = {
  hostname: string;
  pathname?: string;
  locale?: SiteLocale;
  environment?: SiteEnvironment;
  preview?: boolean;
};

export type ResolvedSiteContext = {
  site: SiteReference;
  brand?: BrandReference;
  theme: ThemeTokens;
  canonicalHostname: string;
  canonicalUrl?: string;
  locale: SiteLocale;
  timezone: string;
  preview: boolean;
};

export const SITE_RESOLUTION_STATUSES = [
  'resolved',
  'not_found',
  'inactive',
  'maintenance',
  'invalid_hostname',
  'domain_not_configured',
  'environment_mismatch',
] as const;

export type SiteResolutionStatus = (typeof SITE_RESOLUTION_STATUSES)[number];

export const SITE_RESOLUTION_ERROR_CODES = [
  'INVALID_HOSTNAME',
  'SITE_NOT_FOUND',
  'SITE_INACTIVE',
  'SITE_IN_MAINTENANCE',
  'DOMAIN_NOT_CONFIGURED',
  'ENVIRONMENT_MISMATCH',
  'THEME_INVALID',
] as const;

export type SiteResolutionErrorCode =
  (typeof SITE_RESOLUTION_ERROR_CODES)[number];

export type SiteResolutionError = {
  code: SiteResolutionErrorCode;
  message: string;
  hostname: string;
  recoverable: boolean;
  details?: Record<string, string | number | boolean | null>;
};

export type SiteResolutionResult =
  | {
      ok: true;
      status: 'resolved';
      context: ResolvedSiteContext;
    }
  | {
      ok: false;
      status: Exclude<SiteResolutionStatus, 'resolved'>;
      error: SiteResolutionError;
    };

export const SITE_FALLBACK_STRATEGIES = [
  'none',
  'holding_portal',
  'primary_domain_redirect',
  'maintenance_page',
  'not_found_page',
] as const;

export type SiteFallbackStrategy = (typeof SITE_FALLBACK_STRATEGIES)[number];

/**
 * Opções do resolver.
 * Defaults conceituais (não aplicados nesta etapa):
 * - defaultLocale → DEFAULT_SITE_LOCALE (`pt-BR`)
 * - defaultTimezone → DEFAULT_SITE_TIMEZONE (`America/Sao_Paulo`)
 */
export type SiteResolverOptions = {
  fallbackStrategy?: SiteFallbackStrategy;
  allowInactiveInPreview?: boolean;
  allowMaintenanceInPreview?: boolean;
  defaultLocale?: SiteLocale;
  defaultTimezone?: string;
};

export type SiteDomainRecord = {
  domainId: string;
  hostname: string;
  isPrimary: boolean;
  isActive: boolean;
  environment: SiteEnvironment;
  site: SiteReference;
  brand?: BrandReference;
  theme?: PartialThemeTokens;
  redirectToPrimary: boolean;
};

export type SiteDomainRepository = {
  findByHostname(
    hostname: string,
    environment?: SiteEnvironment,
  ): Promise<SiteDomainRecord | null>;
};

export type SiteThemeResolver = {
  resolve(record: SiteDomainRecord): Promise<ThemeTokens>;
};
