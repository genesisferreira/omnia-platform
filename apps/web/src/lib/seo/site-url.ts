import { buildCanonicalUrl } from '@omnia/shared';

import { getConfig } from '@omnia/config';

/**
 * Origem pública do Portal (`NEXT_PUBLIC_APP_URL`), sem barra final.
 */
export function getPublicSiteOrigin(): string {
  return getConfig().app.publicUrl.replace(/\/+$/, '');
}

/**
 * Hostname preferencial para canonical/OG:
 * 1) hostname da request resolvida;
 * 2) hostname de NEXT_PUBLIC_APP_URL.
 */
export function resolveSeoHostname(requestHostname?: string | null): string {
  const trimmed = typeof requestHostname === 'string' ? requestHostname.trim().toLowerCase() : '';
  if (trimmed) {
    return trimmed;
  }

  try {
    return new URL(getPublicSiteOrigin()).hostname;
  } catch {
    return 'localhost';
  }
}

function resolveCanonicalProtocol(hostname: string): 'http' | 'https' {
  try {
    const originUrl = new URL(getPublicSiteOrigin());
    if (originUrl.hostname === hostname) {
      return originUrl.protocol === 'http:' ? 'http' : 'https';
    }
  } catch {
    // fallback abaixo
  }

  if (hostname === 'localhost' || hostname.startsWith('127.')) {
    return 'http';
  }

  return 'https';
}

export function resolveCanonicalUrl(args: {
  pathname: string;
  editorialCanonical?: string | null;
  hostname?: string | null;
}): string | null {
  const editorial =
    typeof args.editorialCanonical === 'string' ? args.editorialCanonical.trim() : '';
  if (editorial) {
    return editorial;
  }

  const hostname = resolveSeoHostname(args.hostname);
  return buildCanonicalUrl(hostname, args.pathname, resolveCanonicalProtocol(hostname));
}
