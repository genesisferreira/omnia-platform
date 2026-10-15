import type { MetadataRoute } from 'next';

import { canonicalPublicOrigin, isPrivatePath } from './indexing';

/** Igual ao máximo aceito por /api/omnia/public-posts. Acima disso a API recusa a página. */
export const SITEMAP_PAGE_SIZE = 20;
export const SITEMAP_MAX_PAGES = 50;

export class SitemapSourceError extends Error {
  constructor(readonly code: 'cms_unavailable' | 'pagination_exceeded' | 'invalid_origin') {
    super(code);
    this.name = 'SitemapSourceError';
  }
}

export type SitemapPageInput = {
  pathname: string;
  noIndex?: boolean;
  changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
};

export type SitemapPostInput = {
  slug: string;
  publishedAt?: string | null;
  noIndex?: boolean;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSitemapPagination(totalPages: number): void {
  if (!Number.isFinite(totalPages) || totalPages < 1) return;
  if (totalPages > SITEMAP_MAX_PAGES) {
    throw new SitemapSourceError('pagination_exceeded');
  }
}

export function toPublicSitemapUrl(origin: string, pathname: string): string | null {
  if (isPrivatePath(pathname)) return null;
  let canonical: string;
  try {
    canonical = canonicalPublicOrigin(origin);
  } catch {
    return null;
  }
  const path = pathname === '/' ? '/' : pathname;
  return `${canonical}${path}`;
}

export function assembleSitemapEntries(args: {
  origin: string;
  pages: SitemapPageInput[];
  companySlugs: string[];
  posts: SitemapPostInput[];
  categorySlugs: string[];
  tagSlugs: string[];
}): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  const push = (
    pathname: string,
    extras?: Pick<MetadataRoute.Sitemap[number], 'changeFrequency' | 'priority' | 'lastModified'>,
  ) => {
    const url = toPublicSitemapUrl(args.origin, pathname);
    if (!url || seen.has(url)) return;
    seen.add(url);
    entries.push({
      url,
      changeFrequency: extras?.changeFrequency,
      priority: extras?.priority,
      ...(extras?.lastModified ? { lastModified: extras.lastModified } : {}),
    });
  };

  for (const page of args.pages) {
    if (page.noIndex) continue;
    push(page.pathname, {
      changeFrequency: page.changeFrequency ?? (page.pathname === '/' ? 'weekly' : 'monthly'),
      priority: page.priority ?? (page.pathname === '/' ? 1 : 0.8),
    });
  }

  for (const slug of args.companySlugs) {
    const normalized = slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(normalized)) continue;
    const publicSlug = normalized === 'cte' ? 'tecmova' : normalized;
    push(`/empresas/${publicSlug}`, { changeFrequency: 'monthly', priority: 0.75 });
  }

  for (const post of args.posts) {
    if (post.noIndex) continue;
    const slug = post.slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) continue;
    const published = post.publishedAt ? new Date(post.publishedAt) : null;
    push(`/blog/${slug}`, {
      changeFrequency: 'weekly',
      priority: 0.6,
      ...(published && !Number.isNaN(published.getTime()) ? { lastModified: published } : {}),
    });
  }

  for (const slug of args.categorySlugs) {
    const normalized = slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(normalized)) continue;
    push(`/blog/categoria/${normalized}`, { changeFrequency: 'weekly', priority: 0.5 });
  }

  for (const slug of args.tagSlugs) {
    const normalized = slug.trim().toLowerCase();
    if (!SLUG_PATTERN.test(normalized)) continue;
    push(`/blog/tag/${normalized}`, { changeFrequency: 'weekly', priority: 0.4 });
  }

  return entries;
}
