import 'server-only';

import { getConfig, getInternalApiConfig } from '@omnia/config';

import { fetchSiteResolutionWithOptions } from './client-core';
import type { SiteResolutionResult } from './contracts';
import { createInternalConfigurationFailure } from './errors';

/**
 * Consome GET /api/omnia/resolve-site no Admin (server-only).
 * Não resolve hostname localmente — apenas transporte + mapeamento HTTP.
 */
export async function fetchSiteResolution(
  hostname: string,
): Promise<SiteResolutionResult> {
  let adminUrl: string;
  let secret: string;

  try {
    adminUrl = getConfig().app.adminUrl;
    secret = getInternalApiConfig().secret;
  } catch {
    return createInternalConfigurationFailure();
  }

  return fetchSiteResolutionWithOptions(hostname, {
    adminUrl,
    secret,
  });
}
