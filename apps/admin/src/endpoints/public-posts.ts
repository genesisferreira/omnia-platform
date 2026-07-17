import type { CollectionSlug, Endpoint, PayloadRequest, Where } from 'payload';

import {
  mapPublicPost,
  mapPublicPostCategory,
  mapPublicPostList,
  mapPublicPostListItem,
  mapPublicPostTag,
  type PublicPostCategoryDto,
  type PublicPostDto,
  type PublicPostListDto,
  type PublicPostTagDto,
} from '@omnia/shared';

import {
  PUBLIC_POST_CACHE_CONTROL,
  validatePublicPostDetailQuery,
  validatePublicPostsListQuery,
  validatePublicPostTaxonomyQuery,
} from './public-posts-query';

const POSTS_COLLECTION = 'posts' as CollectionSlug;
const CATEGORIES_COLLECTION = 'categories' as CollectionSlug;
const TAGS_COLLECTION = 'tags' as CollectionSlug;

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
    headers: cache
      ? { 'Cache-Control': PUBLIC_POST_CACHE_CONTROL }
      : { 'Cache-Control': 'no-store' },
  });

const badRequest = (): Response =>
  jsonResponse(
    400,
    {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'Parâmetros inválidos.' },
    } satisfies ErrorBody,
    false,
  );

const notFound = (message: string): Response =>
  jsonResponse(404, {
    ok: false,
    error: { code: 'NOT_FOUND', message },
  } satisfies ErrorBody);

const internalError = (): Response =>
  jsonResponse(
    500,
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível carregar o conteúdo.',
      },
    } satisfies ErrorBody,
    false,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolveSiteDoc = async (req: PayloadRequest, siteSlug: string) => {
  const sites = await req.payload.find({
    collection: 'sites',
    where: { and: [{ slug: { equals: siteSlug } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return sites.docs[0] ?? null;
};

/** Visibilidade pública: published + janela de agendamento. */
export const buildPublicPostsWhere = (args: {
  siteId: string | number;
  categoryId?: string | number | null;
  tagId?: string | number | null;
  q?: string | null;
  now?: Date;
}): Where => {
  const now = (args.now ?? new Date()).toISOString();
  const and: Where[] = [
    { site: { equals: args.siteId } },
    { _status: { equals: 'published' } },
    {
      or: [{ publishAt: { exists: false } }, { publishAt: { less_than_equal: now } }],
    },
    {
      or: [{ unpublishAt: { exists: false } }, { unpublishAt: { greater_than: now } }],
    },
  ];

  if (args.categoryId !== undefined && args.categoryId !== null) {
    and.push({ categories: { contains: args.categoryId } });
  }
  if (args.tagId !== undefined && args.tagId !== null) {
    and.push({ tags: { contains: args.tagId } });
  }
  if (args.q) {
    and.push({
      or: [{ title: { like: args.q } }, { excerpt: { like: args.q } }],
    });
  }

  return { and };
};

const withSiteRef = <T extends Record<string, unknown>>(
  doc: T,
  site: { id: string | number; slug: string },
): T & { site: { id: string | number; slug: string } } => ({
  ...doc,
  site: { id: site.id, slug: site.slug },
});

const resolveTaxonomyId = async (
  req: PayloadRequest,
  collection: CollectionSlug,
  siteId: string | number,
  slug: string,
): Promise<string | number | null> => {
  const result = await req.payload.find({
    collection,
    where: {
      and: [{ site: { equals: siteId } }, { slug: { equals: slug } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs[0]?.id ?? null;
};

export const publicPostsEndpoint: Endpoint = {
  path: '/omnia/public-posts',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const requestUrl = new URL(req.url || 'http://localhost/api/omnia/public-posts');
      const query = validatePublicPostsListQuery(requestUrl.searchParams);
      if (!query.ok) {
        return badRequest();
      }

      const siteDoc = await resolveSiteDoc(req, query.site);
      if (!siteDoc) {
        return notFound('Posts não encontrados.');
      }

      let categoryId: string | number | null = null;
      let tagId: string | number | null = null;

      if (query.category) {
        categoryId = await resolveTaxonomyId(
          req,
          CATEGORIES_COLLECTION,
          siteDoc.id,
          query.category,
        );
        if (categoryId === null) {
          return jsonResponse(200, {
            ok: true,
            list: {
              items: [],
              page: query.page,
              pageSize: query.pageSize,
              total: 0,
              totalPages: 1,
            } satisfies PublicPostListDto,
          });
        }
      }

      if (query.tag) {
        tagId = await resolveTaxonomyId(req, TAGS_COLLECTION, siteDoc.id, query.tag);
        if (tagId === null) {
          return jsonResponse(200, {
            ok: true,
            list: {
              items: [],
              page: query.page,
              pageSize: query.pageSize,
              total: 0,
              totalPages: 1,
            } satisfies PublicPostListDto,
          });
        }
      }

      const result = await req.payload.find({
        collection: POSTS_COLLECTION,
        where: buildPublicPostsWhere({
          siteId: siteDoc.id,
          categoryId,
          tagId,
          q: query.q,
        }),
        limit: query.pageSize,
        page: query.page,
        sort: '-publishedAt',
        depth: 1,
        draft: false,
        overrideAccess: true,
      });

      const mappedItems = result.docs.map((doc) =>
        mapPublicPostListItem(
          withSiteRef(doc as unknown as Record<string, unknown>, {
            id: siteDoc.id,
            slug: siteDoc.slug,
          }),
        ),
      );

      if (mappedItems.some((item) => item === null)) {
        req.payload.logger.error('public-posts: failed to map list item');
        return internalError();
      }

      const list = mapPublicPostList({
        items: mappedItems,
        page: query.page,
        pageSize: query.pageSize,
        total: result.totalDocs,
      });

      if (!list) {
        return internalError();
      }

      return jsonResponse(200, { ok: true, list });
    } catch {
      req.payload.logger.error('public-posts: unexpected failure');
      return internalError();
    }
  },
};

export const publicPostEndpoint: Endpoint = {
  path: '/omnia/public-post',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const requestUrl = new URL(req.url || 'http://localhost/api/omnia/public-post');
      const query = validatePublicPostDetailQuery(requestUrl.searchParams);
      if (!query.ok) {
        return badRequest();
      }

      const siteDoc = await resolveSiteDoc(req, query.site);
      if (!siteDoc) {
        return notFound('Post não encontrado.');
      }

      const result = await req.payload.find({
        collection: POSTS_COLLECTION,
        where: {
          and: [
            { site: { equals: siteDoc.id } },
            { slug: { equals: query.slug } },
            { _status: { equals: 'published' } },
            {
              or: [
                { publishAt: { exists: false } },
                { publishAt: { less_than_equal: new Date().toISOString() } },
              ],
            },
            {
              or: [
                { unpublishAt: { exists: false } },
                { unpublishAt: { greater_than: new Date().toISOString() } },
              ],
            },
          ],
        },
        limit: 1,
        depth: 2,
        draft: false,
        overrideAccess: true,
      });

      const doc = result.docs[0];
      if (!doc) {
        return notFound('Post não encontrado.');
      }

      const post = mapPublicPost(
        withSiteRef(doc as unknown as Record<string, unknown>, {
          id: siteDoc.id,
          slug: siteDoc.slug,
        }),
      ) as PublicPostDto | null;

      if (!post) {
        req.payload.logger.error('public-post: failed to map post');
        return internalError();
      }

      return jsonResponse(200, { ok: true, post });
    } catch {
      req.payload.logger.error('public-post: unexpected failure');
      return internalError();
    }
  },
};

export const publicPostCategoriesEndpoint: Endpoint = {
  path: '/omnia/public-post-categories',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const requestUrl = new URL(req.url || 'http://localhost/api/omnia/public-post-categories');
      const query = validatePublicPostTaxonomyQuery(requestUrl.searchParams);
      if (!query.ok) {
        return badRequest();
      }

      const siteDoc = await resolveSiteDoc(req, query.site);
      if (!siteDoc) {
        return notFound('Categorias não encontradas.');
      }

      const result = await req.payload.find({
        collection: CATEGORIES_COLLECTION,
        where: {
          and: [{ site: { equals: siteDoc.id } }, { _status: { equals: 'published' } }],
        },
        limit: 100,
        sort: 'name',
        depth: 0,
        draft: false,
        overrideAccess: true,
      });

      const categories: PublicPostCategoryDto[] = [];
      for (const doc of result.docs) {
        const mapped = mapPublicPostCategory(doc);
        if (!mapped) {
          return internalError();
        }
        categories.push(mapped);
      }

      return jsonResponse(200, { ok: true, categories });
    } catch {
      req.payload.logger.error('public-post-categories: unexpected failure');
      return internalError();
    }
  },
};

export const publicPostTagsEndpoint: Endpoint = {
  path: '/omnia/public-post-tags',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const requestUrl = new URL(req.url || 'http://localhost/api/omnia/public-post-tags');
      const query = validatePublicPostTaxonomyQuery(requestUrl.searchParams);
      if (!query.ok) {
        return badRequest();
      }

      const siteDoc = await resolveSiteDoc(req, query.site);
      if (!siteDoc) {
        return notFound('Tags não encontradas.');
      }

      const result = await req.payload.find({
        collection: TAGS_COLLECTION,
        where: { and: [{ site: { equals: siteDoc.id } }] },
        limit: 100,
        sort: 'name',
        depth: 0,
        overrideAccess: true,
      });

      const tags: PublicPostTagDto[] = [];
      for (const doc of result.docs) {
        const mapped = mapPublicPostTag(doc);
        if (!mapped) {
          return internalError();
        }
        tags.push(mapped);
      }

      return jsonResponse(200, { ok: true, tags });
    } catch {
      req.payload.logger.error('public-post-tags: unexpected failure');
      return internalError();
    }
  },
};

export const mapPostDocumentToPublicDto = (doc: unknown): PublicPostDto | null =>
  mapPublicPost(doc);

export const mapPostDocumentToListItem = (doc: unknown) => mapPublicPostListItem(doc);

/** Helper de teste: publishAt futuro deve ficar fora do where público. */
export const isPostPubliclyVisible = (
  doc: {
    _status?: string | null;
    publishAt?: string | Date | null;
    unpublishAt?: string | Date | null;
  },
  now = new Date(),
): boolean => {
  if (doc._status !== 'published') {
    return false;
  }

  if (doc.publishAt) {
    const publishAt = new Date(doc.publishAt).getTime();
    if (!Number.isNaN(publishAt) && publishAt > now.getTime()) {
      return false;
    }
  }

  if (doc.unpublishAt) {
    const unpublishAt = new Date(doc.unpublishAt).getTime();
    if (!Number.isNaN(unpublishAt) && unpublishAt <= now.getTime()) {
      return false;
    }
  }

  return true;
};

// silence unused isRecord if tree-shaken differently
void isRecord;
