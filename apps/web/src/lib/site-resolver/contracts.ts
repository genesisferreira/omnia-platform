import type { SITE_RESOLUTION_ERROR_CODES, SITE_RESOLUTION_STATUSES } from './constants';

export type SiteResolutionStatus = (typeof SITE_RESOLUTION_STATUSES)[number];

export type SiteResolutionErrorCode = (typeof SITE_RESOLUTION_ERROR_CODES)[number];

export type SiteResolutionError = {
  code: SiteResolutionErrorCode | string;
  message: string;
  hostname?: string;
  recoverable?: boolean;
};

export type ResolvedSiteContext = {
  hostname: string;
  domainId: string;
  canonicalHostname: string;
  flags: {
    isPrimary: boolean;
    isActive: boolean;
    redirectToPrimary: boolean;
    forceHttps: boolean;
    environment: string;
  };
  site: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    environment: string;
    locale: string;
    timezone: string;
  };
  company: {
    id: string;
    slug: string;
    name: string;
  } | null;
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
};

export type SiteResolutionSuccess = {
  ok: true;
  status: 'resolved';
  context: ResolvedSiteContext;
};

export type SiteResolutionFailure = {
  ok: false;
  status: Exclude<SiteResolutionStatus, 'resolved'>;
  error: SiteResolutionError;
};

export type SiteResolutionResult = SiteResolutionSuccess | SiteResolutionFailure;
