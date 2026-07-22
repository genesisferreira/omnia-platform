/**
 * Log operacional seguro para Sitemap / RSS.
 * Nunca registra secrets, headers, cookies, tokens, bodies ou stack traces.
 */

export type FeedLogFailureType =
  | 'http_not_ok'
  | 'timeout'
  | 'network'
  | 'invalid_payload'
  | 'unexpected';

export type FeedLogPayload = {
  module: 'sitemap' | 'rss';
  endpoint: string;
  failureType: FeedLogFailureType;
  durationMs: number;
  siteSlug: string;
  fallbackApplied: boolean;
};

export function logFeedFailure(payload: FeedLogPayload): void {
  // eslint-disable-next-line no-console -- logger package ainda é scaffold
  console.warn(
    JSON.stringify({
      level: 'warn',
      msg: 'cms_feed_fallback',
      module: payload.module,
      endpoint: payload.endpoint,
      failureType: payload.failureType,
      durationMs: payload.durationMs,
      siteSlug: payload.siteSlug,
      fallbackApplied: payload.fallbackApplied,
    }),
  );
}

export function classifyFetchFailure(error: unknown): FeedLogFailureType {
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  ) {
    return 'timeout';
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'CmsFeedHttpError'
  ) {
    return 'http_not_ok';
  }
  if (error instanceof Error && error.message === 'invalid_payload') {
    return 'invalid_payload';
  }
  return 'network';
}
