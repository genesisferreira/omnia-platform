import 'server-only';

import { headers } from 'next/headers';

/**
 * Extrai o hostname bruto da requisição atual.
 * Normalização e validação ficam em resolveSite().
 */
export async function getRequestHostname(): Promise<string> {
  const requestHeaders = await headers();

  const forwardedHost = requestHeaders.get('x-forwarded-host');

  if (typeof forwardedHost === 'string' && forwardedHost.trim() !== '') {
    const firstHost = forwardedHost.split(',')[0]?.trim() ?? '';

    if (firstHost !== '') {
      return firstHost;
    }
  }

  const host = requestHeaders.get('host');

  if (typeof host === 'string' && host.trim() !== '') {
    return host.trim();
  }

  return '';
}
