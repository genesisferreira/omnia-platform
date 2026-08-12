/**
 * Regras puras da collection Pages (slug + unicidade) — testáveis sem DB.
 */

export const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizePageSlug = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized === '' ? undefined : normalized;
};

export const isValidPageSlug = (value: string): boolean => PAGE_SLUG_PATTERN.test(value);

export type PageUniquenessRecord = {
  id: string | number;
  siteId: string | number;
  slug: string;
  pageType: 'home' | 'standard' | string;
};

export type PageUniquenessCandidate = {
  id?: string | number;
  siteId: string | number;
  slug: string;
  pageType: 'home' | 'standard' | string;
};

/**
 * Conflito site+slug quando outro documento no mesmo site já usa o slug.
 */
export const hasSiteSlugConflict = (
  existing: readonly PageUniquenessRecord[],
  candidate: PageUniquenessCandidate,
): boolean =>
  existing.some(
    (doc) =>
      String(doc.siteId) === String(candidate.siteId) &&
      doc.slug === candidate.slug &&
      (candidate.id === undefined || String(doc.id) !== String(candidate.id)),
  );

/**
 * Conflito de Home única por site.
 */
export const hasHomePerSiteConflict = (
  existing: readonly PageUniquenessRecord[],
  candidate: PageUniquenessCandidate,
): boolean => {
  if (candidate.pageType !== 'home') {
    return false;
  }

  return existing.some(
    (doc) =>
      String(doc.siteId) === String(candidate.siteId) &&
      doc.pageType === 'home' &&
      (candidate.id === undefined || String(doc.id) !== String(candidate.id)),
  );
};
