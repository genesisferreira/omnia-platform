export const INTERNAL_SITE_RESOLVER_HEADER = 'x-omnia-internal-key';

export const DEFAULT_SITE_RESOLUTION_TIMEOUT_MS = 5000;

export const INTERNAL_SITE_RESOLVER_PATH = '/api/omnia/resolve-site';

export const SITE_RESOLUTION_STATUSES = [
  'resolved',
  'not_found',
  'inactive',
  'maintenance',
  'invalid_hostname',
  'environment_mismatch',
] as const;

export const SITE_RESOLUTION_ERROR_CODES = [
  'INVALID_HOSTNAME',
  'DOMAIN_NOT_CONFIGURED',
  'SITE_NOT_FOUND',
  'SITE_INACTIVE',
  'SITE_IN_MAINTENANCE',
  'ENVIRONMENT_MISMATCH',
  'INTERNAL_API_UNAUTHORIZED',
  'INTERNAL_API_UNAVAILABLE',
  'INTERNAL_API_TIMEOUT',
  'INTERNAL_API_NETWORK_ERROR',
  'INVALID_INTERNAL_API_RESPONSE',
  'INTERNAL_CONFIGURATION_ERROR',
  'INTERNAL_RESOLUTION_ERROR',
] as const;
