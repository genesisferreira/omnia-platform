import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload';

import {
  mapPublicCompanyDetail,
  mapPublicCompanyListItem,
  PUBLIC_COMPANY_HOLDING_SLUG,
  PUBLIC_COMPANY_LIST_LIMIT,
  sortPublicCompaniesByDisplayOrder,
  type PublicCompanyDto,
  type PublicCompanyListItemDto,
} from '@omnia/shared';

const COMPANIES_COLLECTION = 'companies' as CollectionSlug;
const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';

type ErrorBody = {
  ok: false;
  error: {
    code: 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
  };
};

const jsonResponse = (status: number, body: unknown, cache = true): Response =>
  Response.json(body, {
    status,
    headers: cache ? { 'Cache-Control': CACHE_CONTROL } : { 'Cache-Control': 'no-store' },
  });

const buildPublicCompaniesWhere = (now = new Date()): Where => {
  const iso = now.toISOString();
  return {
    and: [
      { status: { equals: 'active' } },
      { slug: { not_equals: PUBLIC_COMPANY_HOLDING_SLUG } },
      { isHolding: { not_equals: true } },
      { showInEcosystem: { equals: true } },
      {
        or: [{ publishAt: { exists: false } }, { publishAt: { less_than_equal: iso } }],
      },
      {
        or: [{ unpublishAt: { exists: false } }, { unpublishAt: { greater_than: iso } }],
      },
    ],
  };
};

export const publicCompaniesEndpoint: Endpoint = {
  path: '/omnia/public-companies',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const result = await req.payload.find({
        collection: COMPANIES_COLLECTION,
        where: buildPublicCompaniesWhere(),
        sort: 'displayOrder',
        limit: PUBLIC_COMPANY_LIST_LIMIT,
        depth: 1,
        overrideAccess: true,
      });

      const companies = sortPublicCompaniesByDisplayOrder(
        result.docs
          .map((doc) => mapPublicCompanyListItem(doc))
          .filter((company): company is PublicCompanyListItemDto => company !== null),
      );

      return jsonResponse(200, {
        ok: true,
        companies,
      });
    } catch {
      req.payload.logger.error('public-companies: failed to load companies');
      return jsonResponse(
        500,
        {
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Não foi possível carregar as empresas.',
          },
        } satisfies ErrorBody,
        false,
      );
    }
  },
};

export const publicCompanyEndpoint: Endpoint = {
  path: '/omnia/public-company',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const url = new URL(req.url || 'http://localhost');
      const portalSlug = (url.searchParams.get('slug') || '').trim().toLowerCase();
      if (!portalSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(portalSlug)) {
        return jsonResponse(
          400,
          {
            ok: false,
            error: { code: 'BAD_REQUEST', message: 'Parâmetros inválidos.' },
          } satisfies ErrorBody,
          false,
        );
      }

      const now = new Date();
      const iso = now.toISOString();
      const result = await req.payload.find({
        collection: COMPANIES_COLLECTION,
        where: {
          and: [
            { portalSlug: { equals: portalSlug } },
            { status: { equals: 'active' } },
            { isHolding: { not_equals: true } },
            {
              or: [{ publishAt: { exists: false } }, { publishAt: { less_than_equal: iso } }],
            },
            {
              or: [{ unpublishAt: { exists: false } }, { unpublishAt: { greater_than: iso } }],
            },
          ],
        },
        limit: 1,
        depth: 1,
        overrideAccess: true,
      });

      const doc = result.docs[0];
      if (!doc) {
        return jsonResponse(404, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Empresa não encontrada.' },
        } satisfies ErrorBody);
      }

      const siblingsResult = await req.payload.find({
        collection: COMPANIES_COLLECTION,
        where: buildPublicCompaniesWhere(now),
        sort: 'displayOrder',
        limit: PUBLIC_COMPANY_LIST_LIMIT,
        depth: 1,
        overrideAccess: true,
      });

      const siblings = sortPublicCompaniesByDisplayOrder(
        siblingsResult.docs
          .map((item) => mapPublicCompanyListItem(item))
          .filter((company): company is PublicCompanyListItemDto => company !== null),
      );

      const company = mapPublicCompanyDetail(doc, siblings);
      if (!company) {
        return jsonResponse(404, {
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Empresa não encontrada.' },
        } satisfies ErrorBody);
      }

      return jsonResponse(200, {
        ok: true,
        company,
      } satisfies { ok: true; company: PublicCompanyDto });
    } catch {
      req.payload.logger.error('public-company: failed to load company');
      return jsonResponse(
        500,
        {
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Não foi possível carregar a empresa.',
          },
        } satisfies ErrorBody,
        false,
      );
    }
  },
};

/** Reexport sanitizers usados pelos testes legados. */
export {
  mapPublicCompanyMedia as mapPublicCompanyLogo,
  sanitizeExternalSite,
  sanitizeMediaUrl as sanitizeLogoUrl,
} from '@omnia/shared';

export const sanitizeLogoAlt = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const normalizeDisplayOrder = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

/** Compatibilidade com testes existentes — lista pública. */
export const mapPublicCompany = (doc: unknown): PublicCompanyListItemDto | null =>
  mapPublicCompanyListItem(doc);

export { sortPublicCompaniesByDisplayOrder };
