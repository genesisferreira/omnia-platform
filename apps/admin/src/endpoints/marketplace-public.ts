import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload';

import {
  mapPublicMarketplaceListing,
  parseListingPublicSlug,
  parsePublicMarketplaceQuery,
  type MarketplaceListingKind,
} from '@omnia/shared';

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';

const COLLECTIONS: Record<MarketplaceListingKind, CollectionSlug> = {
  product: 'partner-product-listings' as CollectionSlug,
  service: 'partner-service-listings' as CollectionSlug,
};

const json = (status: number, body: unknown, cache = true): Response =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': cache ? CACHE_CONTROL : 'no-store' },
  });

const errorBody = (code: string, message: string) => ({ ok: false, error: { code, message } });

/**
 * Visibilidade pública: listing `published` E parceiro aprovado + ativo + publicado.
 * O mapper compartilhado repete a checagem (defesa em profundidade).
 */
export function publicMarketplaceVisibilityWhere(): Where {
  return {
    and: [
      { status: { equals: 'published' } },
      { 'partner.status': { equals: 'approved' } },
      { 'partner.active': { equals: true } },
      { 'partner.publishedAt': { exists: true } },
    ],
  };
}

function createListEndpoint(kind: MarketplaceListingKind, path: string): Endpoint {
  return {
    path,
    method: 'get',
    handler: async (req: PayloadRequest) => {
      try {
        const url = new URL(req.url || 'http://local', 'http://local');
        const query = parsePublicMarketplaceQuery(url.searchParams);
        const partnerSlug = url.searchParams.get('partner')?.trim().toLowerCase();

        const and: Where[] = [publicMarketplaceVisibilityWhere()];
        if (query.category) and.push({ category: { contains: query.category } });
        if (kind === 'product' && query.brand) and.push({ brand: { contains: query.brand } });
        if (partnerSlug) and.push({ 'partner.slug': { equals: partnerSlug } });
        if (query.q) {
          and.push({
            or: [
              { title: { contains: query.q } },
              { description: { contains: query.q } },
              { category: { contains: query.q } },
              ...(kind === 'product' ? [{ brand: { contains: query.q } }] : []),
            ],
          });
        }

        const result = await req.payload.find({
          collection: COLLECTIONS[kind],
          where: { and },
          limit: query.limit,
          page: query.page,
          depth: 2,
          sort: '-publishedAt',
          overrideAccess: true,
        });

        const items = result.docs
          .map((doc) => mapPublicMarketplaceListing(kind, doc))
          .filter((item): item is NonNullable<typeof item> => item !== null);

        return json(200, {
          ok: true,
          items,
          pagination: {
            page: query.page,
            limit: query.limit,
            totalDocs: result.totalDocs,
            totalPages: Math.max(1, result.totalPages),
            hasNextPage: result.hasNextPage,
          },
        });
      } catch {
        req.payload.logger.error(`public-marketplace-${kind}s: failed`);
        return json(
          500,
          errorBody('INTERNAL_ERROR', 'Não foi possível carregar o marketplace.'),
          false,
        );
      }
    },
  };
}

function createDetailEndpoint(kind: MarketplaceListingKind, path: string): Endpoint {
  return {
    path,
    method: 'get',
    handler: async (req: PayloadRequest) => {
      try {
        const url = new URL(req.url || 'http://local', 'http://local');
        const rawSlug = url.searchParams.get('slug')?.trim();
        if (!rawSlug || rawSlug.length > 200) {
          return json(400, errorBody('BAD_REQUEST', 'Parâmetro slug é obrigatório.'), false);
        }
        const partnerSlug = url.searchParams.get('partner')?.trim().toLowerCase();
        const { slug, id } = parseListingPublicSlug(rawSlug);

        const find = async (where: Where) => {
          const result = await req.payload.find({
            collection: COLLECTIONS[kind],
            where: {
              and: [
                publicMarketplaceVisibilityWhere(),
                ...(partnerSlug ? [{ 'partner.slug': { equals: partnerSlug } } as Where] : []),
                where,
              ],
            },
            limit: 1,
            depth: 2,
            sort: 'publishedAt',
            overrideAccess: true,
          });
          return result.docs[0] ?? null;
        };

        // 1) `{slug}-{id}` (sem ambiguidade); 2) slug puro (primeiro publicado).
        let doc = id
          ? await find({ and: [{ id: { equals: id } }, { slug: { equals: slug } }] })
          : null;
        if (!doc) doc = await find({ slug: { equals: rawSlug.toLowerCase() } });

        const item = doc ? mapPublicMarketplaceListing(kind, doc) : null;
        if (!item) {
          return json(404, errorBody('NOT_FOUND', 'Item não encontrado.'), false);
        }
        return json(200, { ok: true, item });
      } catch {
        req.payload.logger.error(`public-marketplace-${kind}: failed`);
        return json(500, errorBody('INTERNAL_ERROR', 'Não foi possível carregar o item.'), false);
      }
    },
  };
}

export const publicMarketplaceProductsEndpoint = createListEndpoint(
  'product',
  '/omnia/public-marketplace-products',
);
export const publicMarketplaceProductEndpoint = createDetailEndpoint(
  'product',
  '/omnia/public-marketplace-product',
);
export const publicMarketplaceServicesEndpoint = createListEndpoint(
  'service',
  '/omnia/public-marketplace-services',
);
export const publicMarketplaceServiceEndpoint = createDetailEndpoint(
  'service',
  '/omnia/public-marketplace-service',
);

export const publicMarketplaceEndpoints: Endpoint[] = [
  publicMarketplaceProductsEndpoint,
  publicMarketplaceProductEndpoint,
  publicMarketplaceServicesEndpoint,
  publicMarketplaceServiceEndpoint,
];
