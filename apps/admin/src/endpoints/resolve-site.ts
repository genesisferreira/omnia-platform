import { timingSafeEqual } from 'node:crypto';

import { getInternalApiConfig } from '@omnia/config';
import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';

import { isValidHostname, normalizeHostname } from '../lib/branding/domain';

const INTERNAL_KEY_HEADER = 'x-omnia-internal-key';
const DOMAINS_COLLECTION = 'domains' as CollectionSlug;

type ResolutionErrorCode =
  | 'DOMAIN_NOT_CONFIGURED'
  | 'SITE_NOT_FOUND'
  | 'SITE_INACTIVE'
  | 'SITE_IN_MAINTENANCE'
  | 'INVALID_HOSTNAME'
  | 'UNAUTHORIZED'
  | 'INTERNAL_CONFIGURATION_ERROR'
  | 'INTERNAL_RESOLUTION_ERROR';

type ResolutionStatus =
  | 'resolved'
  | 'not_found'
  | 'inactive'
  | 'maintenance'
  | 'invalid_hostname';

type NamedEntityDto = {
  id: string;
  slug: string;
  name: string;
};

type ResolvedSiteContextDto = {
  hostname: string;
  domainId: string;
  canonicalHostname: string;
  flags: {
    isPrimary: boolean;
    isActive: boolean;
    redirectToPrimary: boolean;
    forceHttps: boolean;
    environment: string;
  };
  site: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    environment: string;
    locale: string;
    timezone: string;
  };
  company: NamedEntityDto | null;
  tenant: NamedEntityDto;
};

type ResolutionErrorBody = {
  ok: false;
  status?: ResolutionStatus;
  error: {
    code: ResolutionErrorCode;
    message: string;
    hostname?: string;
    recoverable?: boolean;
  };
};

type ResolutionSuccessBody = {
  ok: true;
  status: 'resolved';
  context: ResolvedSiteContextDto;
};

const jsonResponse = (
  status: number,
  body: ResolutionErrorBody | ResolutionSuccessBody,
): Response => Response.json(body, { status });

const resolutionFailure = (
  hostname: string,
  status: Exclude<ResolutionStatus, 'resolved' | 'invalid_hostname'>,
  code: ResolutionErrorCode,
  message: string,
): Response =>
  jsonResponse(200, {
    ok: false,
    status,
    error: {
      code,
      message,
      hostname,
      recoverable: true,
    },
  });

const getInternalKeyHeader = (req: PayloadRequest): string | null => {
  const value = req.headers.get(INTERNAL_KEY_HEADER);

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return value;
};

/**
 * Compara credencial interna com timing-safe equal.
 * Tamanhos diferentes ⇒ inválido (sem lançar exceção).
 */
const isValidInternalKey = (provided: string, expected: string): boolean => {
  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
};

const readHostnameQuery = (req: PayloadRequest): string | null => {
  const value = new URL(req.url ?? '', 'http://localhost').searchParams.get('hostname');

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPopulatedEntity = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    return false;
  }

  return value.id !== undefined && value.id !== null;
};

const readStringField = (doc: Record<string, unknown>, field: string): string | null => {
  const value = doc[field];

  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
};

const readBooleanField = (doc: Record<string, unknown>, field: string, fallback: boolean): boolean => {
  const value = doc[field];
  return typeof value === 'boolean' ? value : fallback;
};

const toNamedEntity = (value: unknown): NamedEntityDto | null => {
  if (!isPopulatedEntity(value)) {
    return null;
  }

  const id = readStringField(value, 'id');
  const slug = readStringField(value, 'slug');
  const name = readStringField(value, 'name');

  if (!id || !slug || !name) {
    return null;
  }

  return { id, slug, name };
};

const mapSiteStatusFailure = (
  hostname: string,
  siteStatus: string | null,
): Response | null => {
  switch (siteStatus) {
    case 'active':
      return null;
    case 'maintenance':
      return resolutionFailure(
        hostname,
        'maintenance',
        'SITE_IN_MAINTENANCE',
        'Site em manutenção.',
      );
    case 'inactive':
    case 'archived':
      return resolutionFailure(hostname, 'inactive', 'SITE_INACTIVE', 'Site inativo.');
    case 'draft':
    default:
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
  }
};

/**
 * GET /api/omnia/resolve-site
 *
 * Feature 006D.2B-2 — Local API Domains + DTO mínimo.
 */
export const resolveSiteEndpoint: Endpoint = {
  path: '/omnia/resolve-site',
  method: 'get',
  handler: async (req) => {
    const providedKey = getInternalKeyHeader(req);

    if (!providedKey) {
      return jsonResponse(401, {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credencial interna ausente.',
        },
      });
    }

    let expectedSecret: string;

    try {
      expectedSecret = getInternalApiConfig().secret;
    } catch {
      return jsonResponse(500, {
        ok: false,
        error: {
          code: 'INTERNAL_CONFIGURATION_ERROR',
          message: 'Configuração interna indisponível.',
        },
      });
    }

    if (!isValidInternalKey(providedKey, expectedSecret)) {
      return jsonResponse(401, {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Credencial interna inválida.',
        },
      });
    }

    const rawHostname = readHostnameQuery(req);

    if (!rawHostname) {
      return jsonResponse(400, {
        ok: false,
        status: 'invalid_hostname',
        error: {
          code: 'INVALID_HOSTNAME',
          message: 'Hostname obrigatório.',
          hostname: '',
          recoverable: false,
        },
      });
    }

    const hostname = normalizeHostname(rawHostname);

    if (!hostname || !isValidHostname(hostname)) {
      return jsonResponse(400, {
        ok: false,
        status: 'invalid_hostname',
        error: {
          code: 'INVALID_HOSTNAME',
          message: 'Hostname inválido.',
          hostname,
          recoverable: false,
        },
      });
    }

    let docs: unknown[];

    try {
      const result = await req.payload.find({
        collection: DOMAINS_COLLECTION,
        where: {
          and: [
            { normalizedHostname: { equals: hostname } },
            { isActive: { equals: true } },
          ],
        },
        limit: 1,
        depth: 2,
        overrideAccess: true,
      });

      docs = result.docs;
    } catch {
      console.error('[resolve-site] INTERNAL_RESOLUTION_ERROR', { hostname });

      return jsonResponse(500, {
        ok: false,
        error: {
          code: 'INTERNAL_RESOLUTION_ERROR',
          message: 'Não foi possível resolver o Site.',
          hostname,
        },
      });
    }

    if (docs.length === 0) {
      return resolutionFailure(
        hostname,
        'not_found',
        'DOMAIN_NOT_CONFIGURED',
        'Domínio não configurado.',
      );
    }

    const domainDoc = docs[0];

    if (!isRecord(domainDoc)) {
      return resolutionFailure(
        hostname,
        'not_found',
        'DOMAIN_NOT_CONFIGURED',
        'Domínio não configurado.',
      );
    }

    if (domainDoc.isActive !== true) {
      return resolutionFailure(
        hostname,
        'not_found',
        'DOMAIN_NOT_CONFIGURED',
        'Domínio não configurado.',
      );
    }

    const siteValue = domainDoc.site;

    if (!isPopulatedEntity(siteValue)) {
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
    }

    const publishStatus = readStringField(siteValue, '_status');

    if (publishStatus !== null && publishStatus !== 'published') {
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
    }

    const siteStatus = readStringField(siteValue, 'siteStatus');
    const siteStatusFailure = mapSiteStatusFailure(hostname, siteStatus);

    if (siteStatusFailure) {
      return siteStatusFailure;
    }

    const siteId = readStringField(siteValue, 'id');
    const siteName = readStringField(siteValue, 'name');
    const siteSlug = readStringField(siteValue, 'slug');
    const siteType = readStringField(siteValue, 'type');
    const siteEnvironment = readStringField(siteValue, 'environment');
    const siteLocale = readStringField(siteValue, 'locale');
    const siteTimezone = readStringField(siteValue, 'timezone');

    if (
      !siteId ||
      !siteName ||
      !siteSlug ||
      !siteType ||
      !siteStatus ||
      !siteEnvironment ||
      !siteLocale ||
      !siteTimezone
    ) {
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
    }

    const tenantValue = siteValue.tenant;

    if (!isPopulatedEntity(tenantValue)) {
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
    }

    const tenant = toNamedEntity(tenantValue);

    if (!tenant) {
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
    }

    const companyValue = siteValue.company;
    let company: NamedEntityDto | null = null;

    if (companyValue == null) {
      if (siteType !== 'holding_portal') {
        return resolutionFailure(
          hostname,
          'not_found',
          'SITE_NOT_FOUND',
          'Site vinculado não encontrado.',
        );
      }
    } else if (!isPopulatedEntity(companyValue)) {
      return resolutionFailure(
        hostname,
        'not_found',
        'SITE_NOT_FOUND',
        'Site vinculado não encontrado.',
      );
    } else {
      company = toNamedEntity(companyValue);

      if (!company) {
        return resolutionFailure(
          hostname,
          'not_found',
          'SITE_NOT_FOUND',
          'Site vinculado não encontrado.',
        );
      }
    }

    const domainId = readStringField(domainDoc, 'id');
    const domainEnvironment = readStringField(domainDoc, 'environment');

    if (!domainId || !domainEnvironment) {
      return resolutionFailure(
        hostname,
        'not_found',
        'DOMAIN_NOT_CONFIGURED',
        'Domínio não configurado.',
      );
    }

    return jsonResponse(200, {
      ok: true,
      status: 'resolved',
      context: {
        hostname,
        domainId,
        canonicalHostname: hostname,
        flags: {
          isPrimary: readBooleanField(domainDoc, 'isPrimary', false),
          isActive: true,
          redirectToPrimary: readBooleanField(domainDoc, 'redirectToPrimary', false),
          forceHttps: readBooleanField(domainDoc, 'forceHttps', true),
          environment: domainEnvironment,
        },
        site: {
          id: siteId,
          name: siteName,
          slug: siteSlug,
          type: siteType,
          status: siteStatus,
          environment: siteEnvironment,
          locale: siteLocale,
          timezone: siteTimezone,
        },
        company,
        tenant,
      },
    });
  },
};
