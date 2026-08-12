import { cache } from 'react';

import type {
  PublicPostCategoryDto,
  PublicPostDto,
  PublicPostListDto,
  PublicPostListItemDto,
  PublicPostTagDto,
  PublicRichTextNode,
} from '@omnia/shared';
import { getConfig } from '@omnia/config';

function getAdminApiUrl(): string {
  return getConfig().app.adminUrl;
}

function resolveMediaUrl(url: string): string {
  try {
    return new URL(url, `${getAdminApiUrl()}/`).toString();
  } catch {
    return url;
  }
}

function normalizePostListItem(post: PublicPostListItemDto): PublicPostListItemDto {
  return {
    ...post,
    featuredImage: post.featuredImage
      ? { ...post.featuredImage, url: resolveMediaUrl(post.featuredImage.url) }
      : null,
  };
}

function normalizePost(post: PublicPostDto): PublicPostDto {
  return {
    ...post,
    ...normalizePostListItem(post),
    seo: {
      ...post.seo,
      openGraphImage: post.seo.openGraphImage
        ? { ...post.seo.openGraphImage, url: resolveMediaUrl(post.seo.openGraphImage.url) }
        : null,
    },
    relatedPosts: post.relatedPosts.map(normalizePostListItem),
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPublicPostListItem(value: unknown): value is PublicPostListItemDto {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.slug === 'string' &&
    isPlainRecord(value.site) &&
    typeof value.site.slug === 'string'
  );
}

function isPublicPostListDto(value: unknown): value is PublicPostListDto {
  if (!isPlainRecord(value) || !Array.isArray(value.items)) {
    return false;
  }
  return (
    typeof value.page === 'number' &&
    typeof value.pageSize === 'number' &&
    typeof value.total === 'number' &&
    typeof value.totalPages === 'number' &&
    value.items.every(isPublicPostListItem)
  );
}

function isPublicRichTextNode(value: unknown): value is PublicRichTextNode {
  if (!isPlainRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  return (
    value.type === 'paragraph' ||
    value.type === 'heading' ||
    value.type === 'list' ||
    value.type === 'quote'
  );
}

function isPublicPostDto(value: unknown): value is PublicPostDto {
  if (!isPublicPostListItem(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const content = record.content;
  return Array.isArray(content) && content.every(isPublicRichTextNode);
}

function isPublicCategory(value: unknown): value is PublicPostCategoryDto {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' && typeof value.name === 'string' && typeof value.slug === 'string'
  );
}

function isPublicTag(value: unknown): value is PublicPostTagDto {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' && typeof value.name === 'string' && typeof value.slug === 'string'
  );
}

export type FetchPublicPostsArgs = {
  siteSlug: string;
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
  q?: string;
};

const EMPTY_LIST: PublicPostListDto = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

/**
 * Cliente público — GET /api/omnia/public-posts
 * Soft-fail: lista vazia em qualquer falha. Cacheado por argumentos primitivos.
 */
export async function fetchPublicPosts(args: FetchPublicPostsArgs): Promise<PublicPostListDto> {
  return fetchPublicPostsCached(
    args.siteSlug.trim().toLowerCase(),
    args.page ?? 1,
    args.pageSize ?? 10,
    args.category?.trim().toLowerCase() ?? '',
    args.tag?.trim().toLowerCase() ?? '',
    args.q?.trim() ?? '',
  );
}

const fetchPublicPostsCached = cache(
  async (
    site: string,
    page: number,
    pageSize: number,
    category: string,
    tag: string,
    q: string,
  ): Promise<PublicPostListDto> => {
    try {
      if (!site) {
        return EMPTY_LIST;
      }

      const base = getAdminApiUrl();
      const url = new URL(`${base}/api/omnia/public-posts`);
      url.searchParams.set('site', site);
      if (page > 1) {
        url.searchParams.set('page', String(page));
      }
      if (pageSize !== 10) {
        url.searchParams.set('pageSize', String(pageSize));
      }
      if (category) {
        url.searchParams.set('category', category);
      }
      if (tag) {
        url.searchParams.set('tag', tag);
      }
      if (q) {
        url.searchParams.set('q', q);
      }

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return EMPTY_LIST;
      }

      const data: unknown = await res.json();
      if (!isPlainRecord(data) || data.ok !== true || !isPublicPostListDto(data.list)) {
        return EMPTY_LIST;
      }

      return {
        ...data.list,
        items: data.list.items.map(normalizePostListItem),
      };
    } catch {
      return EMPTY_LIST;
    }
  },
);

/**
 * Cliente público — GET /api/omnia/public-post?site=&slug=
 * Soft-fail: retorna null em qualquer falha.
 */
export const fetchPublicPost = cache(
  async (siteSlug: string, postSlug: string): Promise<PublicPostDto | null> => {
    try {
      const site = siteSlug.trim().toLowerCase();
      const slug = postSlug.trim().toLowerCase();
      if (!site || !slug) {
        return null;
      }

      const base = getAdminApiUrl();
      const url = new URL(`${base}/api/omnia/public-post`);
      url.searchParams.set('site', site);
      url.searchParams.set('slug', slug);

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return null;
      }

      const data: unknown = await res.json();
      if (!isPlainRecord(data) || data.ok !== true || !isPublicPostDto(data.post)) {
        return null;
      }

      return normalizePost(data.post);
    } catch {
      return null;
    }
  },
);

export const fetchPublicPostCategories = cache(
  async (siteSlug: string): Promise<PublicPostCategoryDto[]> => {
    try {
      const site = siteSlug.trim().toLowerCase();
      if (!site) {
        return [];
      }

      const base = getAdminApiUrl();
      const url = new URL(`${base}/api/omnia/public-post-categories`);
      url.searchParams.set('site', site);

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return [];
      }

      const data: unknown = await res.json();
      if (!isPlainRecord(data) || data.ok !== true || !Array.isArray(data.categories)) {
        return [];
      }

      return data.categories.filter(isPublicCategory);
    } catch {
      return [];
    }
  },
);

export const fetchPublicPostTags = cache(async (siteSlug: string): Promise<PublicPostTagDto[]> => {
  try {
    const site = siteSlug.trim().toLowerCase();
    if (!site) {
      return [];
    }

    const base = getAdminApiUrl();
    const url = new URL(`${base}/api/omnia/public-post-tags`);
    url.searchParams.set('site', site);

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return [];
    }

    const data: unknown = await res.json();
    if (!isPlainRecord(data) || data.ok !== true || !Array.isArray(data.tags)) {
      return [];
    }

    return data.tags.filter(isPublicTag);
  } catch {
    return [];
  }
});
