/**
 * Clientes CMS usados apenas por Sitemap/RSS.
 * Diferente dos clientes soft-fail das páginas: aqui falhas propagam
 * para o caller aplicar fallback + log estruturado.
 */

import { getConfig } from '@omnia/config';

import { fetchWithCmsTimeout } from '@/lib/cms/cms-fetch';

export class CmsFeedHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`CMS HTTP ${status}`);
    this.name = 'CmsFeedHttpError';
    this.status = status;
  }
}

function getAdminApiUrl(): string {
  return getConfig().app.adminUrl;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type FeedCmsPost = {
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  authorName?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
};

export type FeedCmsCompany = { portalSlug: string };
export type FeedCmsTaxonomy = { slug: string };

/**
 * Lista pública de posts para feeds. Lança em timeout / HTTP não-OK / payload inválido.
 */
export async function fetchFeedPosts(siteSlug: string, pageSize = 20): Promise<FeedCmsPost[]> {
  const site = siteSlug.trim().toLowerCase();
  if (!site) {
    return [];
  }

  const url = new URL(`${getAdminApiUrl()}/api/omnia/public-posts`);
  url.searchParams.set('site', site);
  url.searchParams.set('pageSize', String(pageSize));

  const res = await fetchWithCmsTimeout(url.toString(), {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new CmsFeedHttpError(res.status);
  }

  const data: unknown = await res.json();
  if (!isPlainRecord(data) || data.ok !== true || !isPlainRecord(data.list) || !Array.isArray(data.list.items)) {
    throw new Error('invalid_payload');
  }

  return data.list.items
    .filter(isPlainRecord)
    .map((item) => {
      const author = isPlainRecord(item.author) ? item.author : null;
      const featured = isPlainRecord(item.featuredImage) ? item.featuredImage : null;
      const categories = Array.isArray(item.categories) ? item.categories : [];
      const firstCat = categories[0];
      const categoryName =
        isPlainRecord(firstCat) && typeof firstCat.name === 'string' ? firstCat.name : null;

      return {
        title: typeof item.title === 'string' ? item.title : '',
        slug: typeof item.slug === 'string' ? item.slug : '',
        excerpt: typeof item.excerpt === 'string' ? item.excerpt : null,
        publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : null,
        authorName: author && typeof author.name === 'string' ? author.name : null,
        imageUrl: featured && typeof featured.url === 'string' ? featured.url : null,
        categoryName,
      };
    })
    .filter((p) => p.title && p.slug);
}

export async function fetchFeedCompanies(): Promise<FeedCmsCompany[]> {
  const res = await fetchWithCmsTimeout(`${getAdminApiUrl()}/api/omnia/public-companies`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new CmsFeedHttpError(res.status);
  }

  const data: unknown = await res.json();
  if (!isPlainRecord(data) || data.ok !== true || !Array.isArray(data.companies)) {
    throw new Error('invalid_payload');
  }

  return data.companies.filter(isPlainRecord).map((company) => {
    const portalSlug =
      typeof company.portalSlug === 'string' && company.portalSlug.trim()
        ? company.portalSlug
        : typeof company.slug === 'string'
          ? company.slug
          : '';
    return { portalSlug };
  });
}

export async function fetchFeedTaxonomies(
  siteSlug: string,
  kind: 'categories' | 'tags',
): Promise<FeedCmsTaxonomy[]> {
  const site = siteSlug.trim().toLowerCase();
  if (!site) {
    return [];
  }

  const path =
    kind === 'categories' ? 'public-post-categories' : 'public-post-tags';
  const url = new URL(`${getAdminApiUrl()}/api/omnia/${path}`);
  url.searchParams.set('site', site);

  const res = await fetchWithCmsTimeout(url.toString(), {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new CmsFeedHttpError(res.status);
  }

  const data: unknown = await res.json();
  const key = kind === 'categories' ? 'categories' : 'tags';
  if (!isPlainRecord(data) || data.ok !== true || !Array.isArray(data[key])) {
    throw new Error('invalid_payload');
  }

  return (data[key] as unknown[])
    .filter(isPlainRecord)
    .map((item) => ({ slug: typeof item.slug === 'string' ? item.slug : '' }))
    .filter((item) => item.slug);
}
