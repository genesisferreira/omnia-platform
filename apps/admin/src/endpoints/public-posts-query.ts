/**
 * Validação de query params dos endpoints públicos do Blog.
 */

import { BLOG_SLUG_PATTERN } from '../collections/blog-rules';
import {
  PUBLIC_POST_DEFAULT_PAGE_SIZE,
  PUBLIC_POST_MAX_PAGE_SIZE,
  PUBLIC_POST_SEARCH_MAX_LENGTH,
} from '@omnia/shared';

export const PUBLIC_POST_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';
export const PUBLIC_POST_PARAM_MAX_LENGTH = 64;

const LIST_ALLOWED = new Set(['site', 'page', 'pageSize', 'category', 'tag', 'q']);
const DETAIL_ALLOWED = new Set(['site', 'slug']);
const TAXONOMY_ALLOWED = new Set(['site']);

const hasDuplicateOrExtra = (
  searchParams: URLSearchParams,
  allowed: Set<string>,
): 'extra_params' | 'duplicate_params' | null => {
  const seen = new Set<string>();
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) {
      return 'extra_params';
    }
    if (seen.has(key)) {
      return 'duplicate_params';
    }
    seen.add(key);
  }
  return null;
};

const normalizeSlugParam = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  if (value.length > PUBLIC_POST_PARAM_MAX_LENGTH) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === '' || !BLOG_SLUG_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
};

export type PublicPostsListQuery =
  | {
      ok: true;
      site: string;
      page: number;
      pageSize: number;
      category: string | null;
      tag: string | null;
      q: string | null;
    }
  | { ok: false; reason: 'extra_params' | 'duplicate_params' | 'missing_or_invalid' };

export const validatePublicPostsListQuery = (
  searchParams: URLSearchParams,
): PublicPostsListQuery => {
  const invalid = hasDuplicateOrExtra(searchParams, LIST_ALLOWED);
  if (invalid) {
    return { ok: false, reason: invalid };
  }

  const site = normalizeSlugParam(searchParams.get('site'));
  if (!site) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  const pageRaw = searchParams.get('page');
  const pageSizeRaw = searchParams.get('pageSize');
  const page = pageRaw === null ? 1 : Number.parseInt(pageRaw, 10);
  const pageSize =
    pageSizeRaw === null ? PUBLIC_POST_DEFAULT_PAGE_SIZE : Number.parseInt(pageSizeRaw, 10);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > PUBLIC_POST_MAX_PAGE_SIZE
  ) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  const categoryParam = searchParams.get('category');
  const tagParam = searchParams.get('tag');
  const category = categoryParam === null ? null : normalizeSlugParam(categoryParam);
  const tag = tagParam === null ? null : normalizeSlugParam(tagParam);

  if (categoryParam !== null && category === null) {
    return { ok: false, reason: 'missing_or_invalid' };
  }
  if (tagParam !== null && tag === null) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  const qRaw = searchParams.get('q');
  let q: string | null = null;
  if (qRaw !== null) {
    const trimmed = qRaw.trim();
    if (trimmed === '' || trimmed.length > PUBLIC_POST_SEARCH_MAX_LENGTH) {
      return { ok: false, reason: 'missing_or_invalid' };
    }
    q = trimmed;
  }

  return { ok: true, site, page, pageSize, category, tag, q };
};

export type PublicPostDetailQuery =
  | { ok: true; site: string; slug: string }
  | { ok: false; reason: 'extra_params' | 'duplicate_params' | 'missing_or_invalid' };

export const validatePublicPostDetailQuery = (
  searchParams: URLSearchParams,
): PublicPostDetailQuery => {
  const invalid = hasDuplicateOrExtra(searchParams, DETAIL_ALLOWED);
  if (invalid) {
    return { ok: false, reason: invalid };
  }

  const site = normalizeSlugParam(searchParams.get('site'));
  const slug = normalizeSlugParam(searchParams.get('slug'));
  if (!site || !slug) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  return { ok: true, site, slug };
};

export type PublicPostTaxonomyQuery =
  | { ok: true; site: string }
  | { ok: false; reason: 'extra_params' | 'duplicate_params' | 'missing_or_invalid' };

export const validatePublicPostTaxonomyQuery = (
  searchParams: URLSearchParams,
): PublicPostTaxonomyQuery => {
  const invalid = hasDuplicateOrExtra(searchParams, TAXONOMY_ALLOWED);
  if (invalid) {
    return { ok: false, reason: invalid };
  }

  const site = normalizeSlugParam(searchParams.get('site'));
  if (!site) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  return { ok: true, site };
};
