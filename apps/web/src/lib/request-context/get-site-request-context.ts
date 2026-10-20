import 'server-only';

import { resolveSite } from '../site-resolver';

import type { SiteRequestContext } from './contracts';
import { getRequestHostname } from './get-request-hostname';

/**
 * Obtém o hostname da requisição e resolve o Site correspondente.
 */
export async function getSiteRequestContext(): Promise<SiteRequestContext> {
  const hostname = await getRequestHostname();
  const resolution = await resolveSite(hostname);

  return {
    hostname,
    resolution,
  };
}
