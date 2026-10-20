import 'server-only';

import { cache } from 'react';

import { getSiteRequestContext } from '../request-context';

import type { SiteContext } from './contracts';

/**
 * Deduplica getSiteRequestContext() na mesma renderização RSC.
 * Não é cache persistente nem cache entre requisições.
 */
const getCachedSiteContext = cache(async (): Promise<SiteContext> => {
  return getSiteRequestContext();
});

export async function getSiteContext(): Promise<SiteContext> {
  return getCachedSiteContext();
}
