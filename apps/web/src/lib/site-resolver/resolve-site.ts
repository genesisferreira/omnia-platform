import { isValidHostname, normalizeHostname } from '@omnia/shared';

import { fetchSiteResolution } from './client';
import type { SiteResolutionFailure, SiteResolutionResult } from './contracts';

const createInvalidHostnameFailure = (
  hostname: string,
  message: string,
): SiteResolutionFailure => ({
  ok: false,
  status: 'invalid_hostname',
  error: {
    code: 'INVALID_HOSTNAME',
    message,
    hostname,
    recoverable: false,
  },
});

/**
 * Orquestra normalização/validação local e a resolução via API interna.
 */
export async function resolveSite(
  hostname: string,
): Promise<SiteResolutionResult> {
  if (typeof hostname !== 'string' || hostname.trim() === '') {
    return createInvalidHostnameFailure('', 'Hostname obrigatório.');
  }

  const normalizedHostname = normalizeHostname(hostname.trim());

  if (!normalizedHostname || !isValidHostname(normalizedHostname)) {
    return createInvalidHostnameFailure(
      normalizedHostname,
      'Hostname inválido.',
    );
  }

  return fetchSiteResolution(normalizedHostname);
}
