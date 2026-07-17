/**
 * Execução isolada do seed do Blog (omnia-hub).
 * Cria autor, categorias, tags e posts ausentes — nunca sobrescreve.
 */

import {
  decideBlogSeedItem,
  HOLDING_BLOG_SITE_SLUG,
  holdingBlogAuthorSeed,
  holdingBlogCategoriesSeed,
  holdingBlogPostsSeed,
  holdingBlogTagsSeed,
  type ExistingBlogProbe,
} from './holding-blog';

export type BlogSeedItemOutcome =
  | { kind: string; slug: string; status: 'created'; id: string | number }
  | { kind: string; slug: string; status: 'skipped'; reason: 'slug_exists' }
  | { kind: string; slug: string; status: 'aborted'; reason: 'site_not_found' };

export type HoldingBlogSeedOutcome = {
  siteSlug: string;
  items: BlogSeedItemOutcome[];
};

type FindResult = { docs: Array<{ id: string | number; slug?: unknown }> };

export type BlogSeedFindArgs = {
  collection: 'sites' | 'media' | 'authors' | 'categories' | 'tags' | 'posts';
  where?: unknown;
  limit?: number;
  depth?: number;
  overrideAccess?: boolean;
};

export type BlogSeedCreateArgs = {
  collection: 'media' | 'authors' | 'categories' | 'tags' | 'posts';
  overrideAccess?: boolean;
  filePath?: string;
  data: Record<string, unknown>;
};

export type BlogSeedUpdateArgs = {
  collection: 'posts';
  id: string | number;
  overrideAccess?: boolean;
  data: Record<string, unknown>;
};

export type HoldingBlogSeedPayload = {
  find: (args: BlogSeedFindArgs) => Promise<FindResult>;
  create: (args: BlogSeedCreateArgs) => Promise<{ id: string | number }>;
  update: (args: BlogSeedUpdateArgs) => Promise<{ id: string | number }>;
};

export const adaptPayloadForHoldingBlogSeed = (payload: {
  find: unknown;
  create: unknown;
  update: unknown;
}): HoldingBlogSeedPayload => ({
  find: (args) => (payload.find as HoldingBlogSeedPayload['find'])(args),
  create: (args) => (payload.create as HoldingBlogSeedPayload['create'])(args),
  update: (args) => (payload.update as HoldingBlogSeedPayload['update'])(args),
});

const toProbe = (doc: FindResult['docs'][number] | undefined): ExistingBlogProbe | null => {
  if (!doc) return null;
  return {
    id: doc.id,
    slug: String(doc.slug ?? ''),
  };
};

const findBySlug = async (
  payload: HoldingBlogSeedPayload,
  collection: BlogSeedFindArgs['collection'],
  slug: string,
  siteId?: string | number,
): Promise<ExistingBlogProbe | null> => {
  const where =
    siteId === undefined
      ? { slug: { equals: slug } }
      : { and: [{ site: { equals: siteId } }, { slug: { equals: slug } }] };

  const result = await payload.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  return toProbe(result.docs[0]);
};

export async function runHoldingBlogSeed(
  payload: HoldingBlogSeedPayload,
): Promise<HoldingBlogSeedOutcome> {
  const siteResult = await payload.find({
    collection: 'sites',
    where: { slug: { equals: HOLDING_BLOG_SITE_SLUG } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  const siteDoc = siteResult.docs[0];
  const items: BlogSeedItemOutcome[] = [];

  const abortAll = (kind: string, slug: string): void => {
    items.push({ kind, slug, status: 'aborted', reason: 'site_not_found' });
  };

  if (!siteDoc) {
    abortAll('author', holdingBlogAuthorSeed.slug);
    for (const category of holdingBlogCategoriesSeed) {
      abortAll('category', category.slug);
    }
    for (const tag of holdingBlogTagsSeed) {
      abortAll('tag', tag.slug);
    }
    for (const post of holdingBlogPostsSeed) {
      abortAll('post', post.slug);
    }
    return { siteSlug: HOLDING_BLOG_SITE_SLUG, items };
  }

  const siteId = siteDoc.id;

  // Imagem editorial padrão. O asset é copiado para o target bootstrap no Dockerfile.
  const mediaResult = await payload.find({
    collection: 'media',
    where: { filename: { equals: 'blog-featured.png' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  let featuredImageId = mediaResult.docs[0]?.id ?? null;

  if (featuredImageId === null) {
    const media = await payload.create({
      collection: 'media',
      overrideAccess: true,
      filePath: '/app/apps/admin/src/seed/assets/blog-featured.png',
      data: {
        alt: 'Omnia Frigo Holding — tradição, educação e tecnologia em refrigeração',
      },
    });
    featuredImageId = media.id;
    items.push({
      kind: 'media',
      slug: 'blog-featured',
      status: 'created',
      id: media.id,
    });
  } else {
    items.push({
      kind: 'media',
      slug: 'blog-featured',
      status: 'skipped',
      reason: 'slug_exists',
    });
  }

  // Autor
  let authorId: string | number | null = null;
  {
    const existing = await findBySlug(payload, 'authors', holdingBlogAuthorSeed.slug);
    const decision = decideBlogSeedItem({
      siteFound: true,
      siteSlug: HOLDING_BLOG_SITE_SLUG,
      entityLabel: 'Autor',
      entitySlug: holdingBlogAuthorSeed.slug,
      existingBySlug: existing,
    });

    if (decision.action === 'skip' && existing) {
      authorId = existing.id;
      items.push({
        kind: 'author',
        slug: holdingBlogAuthorSeed.slug,
        status: 'skipped',
        reason: 'slug_exists',
      });
    } else {
      const created = await payload.create({
        collection: 'authors',
        overrideAccess: true,
        data: {
          name: holdingBlogAuthorSeed.name,
          slug: holdingBlogAuthorSeed.slug,
          bio: holdingBlogAuthorSeed.bio,
          _status: 'published',
        },
      });
      authorId = created.id;
      items.push({
        kind: 'author',
        slug: holdingBlogAuthorSeed.slug,
        status: 'created',
        id: created.id,
      });
    }
  }

  // Categorias
  const categoryIds = new Map<string, string | number>();
  for (const category of holdingBlogCategoriesSeed) {
    const existing = await findBySlug(payload, 'categories', category.slug, siteId);
    const decision = decideBlogSeedItem({
      siteFound: true,
      siteSlug: HOLDING_BLOG_SITE_SLUG,
      entityLabel: 'Categoria',
      entitySlug: category.slug,
      existingBySlug: existing,
    });

    if (decision.action === 'skip' && existing) {
      categoryIds.set(category.slug, existing.id);
      items.push({
        kind: 'category',
        slug: category.slug,
        status: 'skipped',
        reason: 'slug_exists',
      });
      continue;
    }

    const created = await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        site: siteId,
        seo: {
          metaTitle: `${category.name} | Blog Omnia`,
          metaDescription: category.description,
          canonicalUrl: null,
          noIndex: false,
        },
        _status: 'published',
      },
    });
    categoryIds.set(category.slug, created.id);
    items.push({ kind: 'category', slug: category.slug, status: 'created', id: created.id });
  }

  // Tags
  const tagIds = new Map<string, string | number>();
  for (const tag of holdingBlogTagsSeed) {
    const existing = await findBySlug(payload, 'tags', tag.slug, siteId);
    const decision = decideBlogSeedItem({
      siteFound: true,
      siteSlug: HOLDING_BLOG_SITE_SLUG,
      entityLabel: 'Tag',
      entitySlug: tag.slug,
      existingBySlug: existing,
    });

    if (decision.action === 'skip' && existing) {
      tagIds.set(tag.slug, existing.id);
      items.push({ kind: 'tag', slug: tag.slug, status: 'skipped', reason: 'slug_exists' });
      continue;
    }

    const created = await payload.create({
      collection: 'tags',
      overrideAccess: true,
      data: {
        name: tag.name,
        slug: tag.slug,
        site: siteId,
      },
    });
    tagIds.set(tag.slug, created.id);
    items.push({ kind: 'tag', slug: tag.slug, status: 'created', id: created.id });
  }

  // Posts
  const publishedAt = new Date().toISOString();
  const postIds = new Map<string, string | number>();
  for (const post of holdingBlogPostsSeed) {
    const existing = await findBySlug(payload, 'posts', post.slug, siteId);
    const decision = decideBlogSeedItem({
      siteFound: true,
      siteSlug: HOLDING_BLOG_SITE_SLUG,
      entityLabel: 'Post',
      entitySlug: post.slug,
      existingBySlug: existing,
    });

    if (decision.action === 'skip' && existing) {
      postIds.set(post.slug, existing.id);
      items.push({ kind: 'post', slug: post.slug, status: 'skipped', reason: 'slug_exists' });
      continue;
    }

    const categories = post.categorySlugs
      .map((slug) => categoryIds.get(slug))
      .filter((id): id is string | number => id !== undefined);
    const tags = post.tagSlugs
      .map((slug) => tagIds.get(slug))
      .filter((id): id is string | number => id !== undefined);

    const created = await payload.create({
      collection: 'posts',
      overrideAccess: true,
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        type: 'blog',
        content: post.content,
        site: siteId,
        author: authorId,
        categories,
        tags,
        featuredImage: featuredImageId,
        seo: post.seo,
        timezone: 'America/Sao_Paulo',
        publishedAt,
        _status: 'published',
      },
    });
    postIds.set(post.slug, created.id);
    items.push({ kind: 'post', slug: post.slug, status: 'created', id: created.id });
  }

  // Sincroniza somente campos necessários à homologação, inclusive em seeds já existentes.
  for (const post of holdingBlogPostsSeed) {
    const postId = postIds.get(post.slug);
    if (postId === undefined) {
      continue;
    }

    const relatedPosts = holdingBlogPostsSeed
      .filter((candidate) => candidate.slug !== post.slug)
      .map((candidate) => postIds.get(candidate.slug))
      .filter((id): id is string | number => id !== undefined);

    await payload.update({
      collection: 'posts',
      id: postId,
      overrideAccess: true,
      data: {
        featuredImage: featuredImageId,
        relatedPosts,
      },
    });
  }

  return { siteSlug: HOLDING_BLOG_SITE_SLUG, items };
}

export const formatHoldingBlogSeedLog = (outcome: HoldingBlogSeedOutcome): string => {
  const parts = outcome.items.map((item) => {
    switch (item.status) {
      case 'created':
        return `${item.kind}:${item.slug}:created`;
      case 'skipped':
        return `${item.kind}:${item.slug}:skipped:${item.reason}`;
      case 'aborted':
        return `${item.kind}:${item.slug}:aborted:${item.reason}`;
      default: {
        const _exhaustive: never = item;
        return _exhaustive;
      }
    }
  });

  return `holding-blog: ${parts.join(',')}`;
};

export const hasHoldingBlogSeedAbort = (outcome: HoldingBlogSeedOutcome): boolean =>
  outcome.items.some((item) => item.status === 'aborted');
