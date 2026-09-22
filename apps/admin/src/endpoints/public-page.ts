import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload';

import { mapPublicPage, type PublicPageDto } from '@omnia/shared';

import { PUBLIC_PAGE_CACHE_CONTROL, validatePublicPageQuery } from './public-page-query';

const PAGES_COLLECTION = 'pages' as CollectionSlug;

type PublicPageSuccessBody = {
  ok: true;
  page: PublicPageDto;
};

type PublicPageErrorBody = {
  ok: false;
  error: {
    code: 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    message: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getSiteId = (site: unknown): string | null => {
  if (typeof site === 'number' || typeof site === 'string') {
    return String(site);
  }
  if (isRecord(site) && (typeof site.id === 'number' || typeof site.id === 'string')) {
    return String(site.id);
  }
  return null;
};

const getSiteSlug = (site: unknown): string | null => {
  if (!isRecord(site) || typeof site.slug !== 'string') {
    return null;
  }
  const trimmed = site.slug.trim();
  return trimmed === '' ? null : trimmed;
};

/** Cláusula where do endpoint — sempre published; depth/sort/limit livres não são aceitos. */
export const buildPublishedPageWhere = (siteId: string | number, pageSlug: string): Where => ({
  and: [
    { site: { equals: siteId } },
    { slug: { equals: pageSlug } },
    { _status: { equals: 'published' } },
  ],
});

/**
 * Payload stores the blocks field as `layout` on Pages.
 * Map to public `blocks` with allowlist sanitization.
 */
export const mapPageDocumentToPublicDto = (doc: unknown): PublicPageDto | null => {
  if (!isRecord(doc)) {
    return null;
  }

  const siteId = getSiteId(doc.site);
  const siteSlug = getSiteSlug(doc.site);
  if (!siteId || !siteSlug) {
    return null;
  }

  const id = typeof doc.id === 'number' || typeof doc.id === 'string' ? String(doc.id).trim() : '';
  if (id === '') {
    return null;
  }

  return mapPublicPage({
    id,
    site: { id: siteId, slug: siteSlug },
    title: doc.title,
    slug: doc.slug,
    pageType: doc.pageType,
    blocks: doc.layout,
    seo: doc.seo,
  });
};

const jsonResponse = (
  status: number,
  body: PublicPageSuccessBody | PublicPageErrorBody,
  cache = true,
): Response =>
  Response.json(body, {
    status,
    headers: cache
      ? {
          'Cache-Control': PUBLIC_PAGE_CACHE_CONTROL,
        }
      : {
          'Cache-Control': 'no-store',
        },
  });

export const publicPageEndpoint: Endpoint = {
  path: '/omnia/public-page',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const requestUrl = new URL(req.url || 'http://localhost/api/omnia/public-page');
      const query = validatePublicPageQuery(requestUrl.searchParams);

      if (!query.ok) {
        return jsonResponse(
          400,
          {
            ok: false,
            error: {
              code: 'BAD_REQUEST',
              message: 'Parâmetros inválidos.',
            },
          },
          false,
        );
      }

      const { site: siteSlug, slug: pageSlug } = query;

      const sites = await req.payload.find({
        collection: 'sites',
        where: {
          and: [{ slug: { equals: siteSlug } }],
        } satisfies Where,
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });

      const siteDoc = sites.docs[0];
      if (!siteDoc) {
        return jsonResponse(404, {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Página não encontrada.',
          },
        });
      }

      const pages = await req.payload.find({
        collection: PAGES_COLLECTION,
        where: buildPublishedPageWhere(siteDoc.id, pageSlug),
        limit: 1,
        depth: 1,
        draft: false,
        overrideAccess: true,
      });

      const pageDoc = pages.docs[0];
      if (!pageDoc) {
        return jsonResponse(404, {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Página não encontrada.',
          },
        });
      }

      // Garante site.slug no documento mesmo se depth não popular
      const withSite = {
        ...pageDoc,
        site: {
          id: siteDoc.id,
          slug: siteDoc.slug,
        },
      };

      const page = mapPageDocumentToPublicDto(withSite);
      if (!page) {
        req.payload.logger.error('public-page: failed to map published page');
        return jsonResponse(
          500,
          {
            ok: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Não foi possível carregar a página.',
            },
          },
          false,
        );
      }

      return jsonResponse(200, { ok: true, page });
    } catch {
      req.payload.logger.error('public-page: unexpected failure');
      return jsonResponse(
        500,
        {
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Não foi possível carregar a página.',
          },
        },
        false,
      );
    }
  },
};
