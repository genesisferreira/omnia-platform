export {
  DEFAULT_SITE_RESOLUTION_TIMEOUT_MS,
  INTERNAL_SITE_RESOLVER_HEADER,
  INTERNAL_SITE_RESOLVER_PATH,
  SITE_RESOLUTION_ERROR_CODES,
  SITE_RESOLUTION_STATUSES,
} from './constants';

export type {
  ResolvedSiteContext,
  SiteResolutionError,
  SiteResolutionErrorCode,
  SiteResolutionFailure,
  SiteResolutionResult,
  SiteResolutionStatus,
  SiteResolutionSuccess,
} from './contracts';

export {
  createInternalApiNetworkFailure,
  createInternalApiTimeoutFailure,
  createInternalApiUnauthorizedFailure,
  createInternalApiUnavailableFailure,
  createInternalConfigurationFailure,
  createInvalidInternalApiResponseFailure,
} from './errors';

export { fetchSiteResolution } from './client';