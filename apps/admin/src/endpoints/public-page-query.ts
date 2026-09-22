/**
 * Valida parâmetros de query do endpoint público.
 * Aceita exclusivamente `site` e `slug` (sem duplicatas).
 */

import { PAGE_SLUG_PATTERN, normalizePageSlug } from '../collections/pages-rules';

export const PUBLIC_PAGE_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';

/** Limite explícito de comprimento (slugs editoriais curtos). */
export const PUBLIC_PAGE_PARAM_MAX_LENGTH = 64;

const ALLOWED_QUERY_KEYS = new Set(['site', 'slug']);

export type PublicPageQueryValidation =
  | { ok: true; site: string; slug: string }
  | { ok: false; reason: 'extra_params' | 'duplicate_params' | 'missing_or_invalid' };

/**
 * Valida estritamente query params de GET /api/omnia/public-page.
 */
export const validatePublicPageQuery = (
  searchParams: URLSearchParams,
): PublicPageQueryValidation => {
  const seen = new Set<string>();

  for (const key of searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return { ok: false, reason: 'extra_params' };
    }
    if (seen.has(key)) {
      return { ok: false, reason: 'duplicate_params' };
    }
    seen.add(key);
  }

  const siteRaw = searchParams.get('site');
  const slugRaw = searchParams.get('slug');

  if (siteRaw === null || slugRaw === null) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  if (
    siteRaw.length > PUBLIC_PAGE_PARAM_MAX_LENGTH ||
    slugRaw.length > PUBLIC_PAGE_PARAM_MAX_LENGTH
  ) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  const site = siteRaw.trim().toLowerCase();
  const slug = slugRaw.trim().toLowerCase();

  if (
    site === '' ||
    slug === '' ||
    site.length > PUBLIC_PAGE_PARAM_MAX_LENGTH ||
    slug.length > PUBLIC_PAGE_PARAM_MAX_LENGTH ||
    !PAGE_SLUG_PATTERN.test(site) ||
    !PAGE_SLUG_PATTERN.test(slug)
  ) {
    return { ok: false, reason: 'missing_or_invalid' };
  }

  return { ok: true, site, slug };
};

export { normalizePageSlug, PAGE_SLUG_PATTERN };
