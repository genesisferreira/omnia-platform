import { getConfiguredPublicOrigin } from '@omnia/shared';

export function getAdminBaseUrl(): string {
  const internal = process.env.INTERNAL_ADMIN_URL?.trim();
  if (internal) {
    return internal.replace(/\/+$/, '');
  }
  return getPublicAdminUrl();
}

export function getPublicAdminUrl(): string {
  const resolved = getConfiguredPublicOrigin({
    configuredUrl: process.env.NEXT_PUBLIC_ADMIN_URL,
    nodeEnv: process.env.NODE_ENV,
    fallbackDev: 'http://localhost:3001',
  });
  if (!resolved.ok) {
    throw new Error('PUBLIC_ADMIN_ORIGIN_UNAVAILABLE');
  }
  return resolved.origin;
}

export function getAdminLoginUrl(nextPath?: string): string {
  const base = getPublicAdminUrl();
  if (!nextPath) {
    return `${base}/login`;
  }

  return `${base}/login?next=${encodeURIComponent(nextPath)}`;
}
