import { normalizeHostname } from './hostname';

/** Hosts that may bind a server but must never appear in browser Location/redirect. */
const INTERNAL_HOSTS = new Set([
  '0.0.0.0',
  '127.0.0.1',
  'localhost',
  '::1',
  '[::1]',
  '::',
  'host.docker.internal',
]);

const DOCKER_SERVICE_HOSTS = new Set([
  'web',
  'admin',
  'omnia-platform-web-dev',
  'omnia-platform-admin-dev',
  'omnia-platform-web-prod',
  'omnia-platform-admin-prod',
]);

export type PublicOriginResult =
  { ok: true; origin: string } | { ok: false; reason: 'MISSING' | 'INVALID' | 'INTERNAL' };

export function isBindHostname(value: string | null | undefined): boolean {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === '0.0.0.0' || raw === '::' || raw === '[::]') return true;
  const host = normalizeHostname(raw);
  return host === '0.0.0.0' || host === '::' || host === '[::]';
}

export function isLoopbackHostname(value: string | null | undefined): boolean {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'localhost' || raw === '127.0.0.1' || raw === '::1' || raw === '[::1]') return true;
  const host = normalizeHostname(raw);
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

export function isInternalHostname(value: string | null | undefined): boolean {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (INTERNAL_HOSTS.has(raw)) return true;
  const host = normalizeHostname(raw);
  if (!host) return true;
  if (INTERNAL_HOSTS.has(host)) return true;
  if (DOCKER_SERVICE_HOSTS.has(host)) return true;
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) {
    return true;
  }
  return false;
}

export function hostnameFromUrl(value: string | null | undefined): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try {
    const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return normalizeHostname(url.hostname);
  } catch {
    return normalizeHostname(raw);
  }
}

export function urlLeaksInternalHost(value: string | null | undefined): boolean {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return false;
  if (/https?:\/\/0\.0\.0\.0(?::\d+)?/i.test(raw)) return true;
  if (/https?:\/\/127\.0\.0\.1(?::\d+)?/i.test(raw)) return true;
  if (/https?:\/\/localhost(?::\d+)?/i.test(raw)) return true;
  if (/https?:\/\/\[::1\](?::\d+)?/i.test(raw)) return true;
  const host = hostnameFromUrl(raw);
  return Boolean(host) && isInternalHostname(host);
}

/**
 * Relative path only. Blocks open redirects and protocol-relative URLs.
 */
export function sanitizeRelativePath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  const fallbackSafe =
    fallback === '' || (fallback.startsWith('/') && !fallback.startsWith('//')) ? fallback : '/';
  if (!candidate || typeof candidate !== 'string') return fallbackSafe;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return fallbackSafe;
  }
  if (trimmed.includes('://')) return fallbackSafe;
  if (trimmed.startsWith('/login') || trimmed.startsWith('/api/') || trimmed.startsWith('/admin')) {
    return fallbackSafe;
  }
  return trimmed;
}

export function getConfiguredPublicOrigin(args: {
  configuredUrl?: string | null;
  nodeEnv?: string;
  fallbackDev: string;
}): PublicOriginResult {
  const nodeEnv = args.nodeEnv || 'development';
  const raw = typeof args.configuredUrl === 'string' ? args.configuredUrl.trim() : '';
  const allowDevFallback = nodeEnv !== 'production';

  if (!raw) {
    if (!allowDevFallback) return { ok: false, reason: 'MISSING' };
    return parsePublicOrigin(args.fallbackDev, true);
  }
  return parsePublicOrigin(raw, allowDevFallback);
}

function parsePublicOrigin(value: string, allowInternal: boolean): PublicOriginResult {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'INVALID' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'INVALID' };
  }
  if (isBindHostname(url.hostname)) {
    return { ok: false, reason: 'INTERNAL' };
  }
  if (DOCKER_SERVICE_HOSTS.has(normalizeHostname(url.hostname))) {
    return { ok: false, reason: 'INTERNAL' };
  }
  if (isInternalHostname(url.hostname) && !allowInternal && !isLoopbackHostname(url.hostname)) {
    return { ok: false, reason: 'INTERNAL' };
  }
  if (isLoopbackHostname(url.hostname) && !allowInternal) {
    // Explicit localhost is allowed for CI/build; 0.0.0.0 never is.
    return { ok: true, origin: url.origin };
  }
  return { ok: true, origin: url.origin };
}

/**
 * Browser Location for same-app navigation. Always relative — never derived from request.url.
 * Next.js `NextResponse.redirect(new URL(path, request.url))` would leak HOSTNAME=0.0.0.0.
 */
export function resolveBrowserLocation(path: string, fallback = '/'): string {
  return sanitizeRelativePath(path, fallback);
}

export function assertNoInternalHostLeak(value: string): boolean {
  return !urlLeaksInternalHost(value) && !isInternalHostname(hostnameFromUrl(value));
}
