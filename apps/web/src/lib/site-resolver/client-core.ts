import {
  DEFAULT_SITE_RESOLUTION_TIMEOUT_MS,
  INTERNAL_SITE_RESOLVER_HEADER,
  INTERNAL_SITE_RESOLVER_PATH,
  SITE_RESOLUTION_STATUSES,
} from './constants';
import type {
  ResolvedSiteContext,
  SiteResolutionFailure,
  SiteResolutionResult,
  SiteResolutionStatus,
  SiteResolutionSuccess,
} from './contracts';
import {
  createInternalApiNetworkFailure,
  createInternalApiTimeoutFailure,
  createInternalApiUnauthorizedFailure,
  createInternalApiUnavailableFailure,
  createInvalidInternalApiResponseFailure,
} from './errors';

export type SiteResolutionClientOptions = {
  adminUrl: string;
  secret: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFailureStatus = (value: unknown): value is Exclude<SiteResolutionStatus, 'resolved'> =>
  typeof value === 'string' &&
  value !== 'resolved' &&
  (SITE_RESOLUTION_STATUSES as readonly string[]).includes(value);

const isNamedEntity = (value: unknown): value is { id: string; slug: string; name: string } => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' && typeof value.slug === 'string' && typeof value.name === 'string'
  );
};

const isResolvedSiteContext = (value: unknown): value is ResolvedSiteContext => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.hostname !== 'string' ||
    typeof value.domainId !== 'string' ||
    typeof value.canonicalHostname !== 'string' ||
    !isRecord(value.flags) ||
    !isRecord(value.site) ||
    !isNamedEntity(value.tenant)
  ) {
    return false;
  }

  const { flags, site } = value;

  if (
    typeof flags.isPrimary !== 'boolean' ||
    typeof flags.isActive !== 'boolean' ||
    typeof flags.redirectToPrimary !== 'boolean' ||
    typeof flags.forceHttps !== 'boolean' ||
    typeof flags.environment !== 'string'
  ) {
    return false;
  }

  if (
    typeof site.id !== 'string' ||
    typeof site.name !== 'string' ||
    typeof site.slug !== 'string' ||
    typeof site.type !== 'string' ||
    typeof site.status !== 'string' ||
    typeof site.environment !== 'string' ||
    typeof site.locale !== 'string' ||
    typeof site.timezone !== 'string'
  ) {
    return false;
  }

  if (value.company !== null && !isNamedEntity(value.company)) {
    return false;
  }

  return true;
};

const isSiteResolutionSuccess = (value: unknown): value is SiteResolutionSuccess => {
  if (!isRecord(value)) {
    return false;
  }

  return value.ok === true && value.status === 'resolved' && isResolvedSiteContext(value.context);
};

const isSiteResolutionFailure = (value: unknown): value is SiteResolutionFailure => {
  if (!isRecord(value)) {
    return false;
  }

  if (value.ok !== false || !isFailureStatus(value.status) || !isRecord(value.error)) {
    return false;
  }

  const { error } = value;

  if (typeof error.code !== 'string' || typeof error.message !== 'string') {
    return false;
  }

  if (error.hostname !== undefined && typeof error.hostname !== 'string') {
    return false;
  }

  if (error.recoverable !== undefined && typeof error.recoverable !== 'boolean') {
    return false;
  }

  return true;
};

const isSiteResolutionResult = (value: unknown): value is SiteResolutionResult =>
  isSiteResolutionSuccess(value) || isSiteResolutionFailure(value);

const isAbortError = (error: unknown): boolean => {
  if (!isRecord(error)) {
    return false;
  }

  return error.name === 'AbortError';
};

const parseJsonBody = async (response: Response): Promise<unknown | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Núcleo HTTP da resolução de Sites — sem server-only e sem @omnia/config.
 * Dependências injetadas via options (adminUrl, secret, fetch, timeout).
 */
export async function fetchSiteResolutionWithOptions(
  hostname: string,
  options: SiteResolutionClientOptions,
): Promise<SiteResolutionResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SITE_RESOLUTION_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const url = new URL(INTERNAL_SITE_RESOLVER_PATH, options.adminUrl);
  url.searchParams.set('hostname', hostname);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        [INTERNAL_SITE_RESOLVER_HEADER]: options.secret,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 401) {
      return createInternalApiUnauthorizedFailure();
    }

    if (response.status >= 500) {
      return createInternalApiUnavailableFailure();
    }

    const body = await parseJsonBody(response);

    if (body === null) {
      return createInvalidInternalApiResponseFailure();
    }

    if (response.status === 200 || response.status === 400) {
      if (isSiteResolutionResult(body)) {
        return body;
      }

      return createInvalidInternalApiResponseFailure();
    }

    return createInternalApiUnavailableFailure();
  } catch (error) {
    if (isAbortError(error)) {
      return createInternalApiTimeoutFailure();
    }

    return createInternalApiNetworkFailure();
  } finally {
    clearTimeout(timeoutId);
  }
}
