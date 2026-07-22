import type { MetadataRoute } from 'next';

import { SEO_PUBLIC_PAGE_CANDIDATES } from './constants';

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SitemapEntryInput = {
  url: string;
  changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority?: number;
  lastModified?: Date;
};

export type SitemapPageCandidate = {
  pathname: string;
  slug: string;
  noIndex?: boolean;
  pageType?: string | null;
  canonicalUrl?: string | null;
};

export type SitemapCompanyCandidate = {
  portalSlug: string;
};

export type SitemapPostCandidate = {
  slug: string;
  publishedAt?: string | null;
};

export type SitemapTaxonomyCandidate = {
  slug: string;
};

export type BuildSitemapEntriesArgs = {
  origin: string;
  hostname?: string | null;
  /** Quando true, inclui apenas rotas estáticas (fallback CMS). */
  staticOnly?: boolean;
  pages?: SitemapPageCandidate[];
  companies?: SitemapCompanyCandidate[];
  posts?: SitemapPostCandidate[];
  categories?: SitemapTaxonomyCandidate[];
  tags?: SitemapTaxonomyCandidate[];
};

export function isValidPublicSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && PUBLIC_SLUG_PATTERN.test(slug);
}

/**
 * Converte ISO em Date válida para Metadata API.
 * Datas inválidas → undefined (evita RangeError em toISOString).
 */
export function parseSafeLastModified(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return undefined;
  }
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  // Garante que toISOString não lançará.
  try {
    date.toISOString();
  } catch {
    return undefined;
  }
  return date;
}

export function toAbsoluteUrl(origin: string, pathname: string): string {
  const base = origin.replace(/\/+$/, '');
  if (pathname === '/' || pathname === '') {
    return base || origin;
  }
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

export function dedupeSitemapEntries(entries: SitemapEntryInput[]): SitemapEntryInput[] {
  const seen = new Set<string>();
  const result: SitemapEntryInput[] = [];
  for (const entry of entries) {
    const key = entry.url.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

/** Rotas institucionais sempre presentes (mesmo com CMS indisponível). */
export function buildStaticSitemapEntries(origin: string): SitemapEntryInput[] {
  const entries: SitemapEntryInput[] = SEO_PUBLIC_PAGE_CANDIDATES.map((candidate) => ({
    url: toAbsoluteUrl(origin, candidate.pathname),
    changeFrequency: candidate.pathname === '/' ? 'weekly' : 'monthly',
    priority: candidate.pathname === '/' ? 1 : 0.8,
  }));

  entries.push({
    url: toAbsoluteUrl(origin, '/blog'),
    changeFrequency: 'daily',
    priority: 0.7,
  });

  entries.push({
    url: toAbsoluteUrl(origin, '/interesse'),
    changeFrequency: 'monthly',
    priority: 0.65,
  });

  return dedupeSitemapEntries(entries);
}

/**
 * Monta entradas do sitemap. Nunca lança.
 * Sob staticOnly ou dados ausentes, retorna pelo menos as rotas estáticas.
 */
export function buildSitemapEntries(args: BuildSitemapEntriesArgs): MetadataRoute.Sitemap {
  try {
    const origin = typeof args.origin === 'string' && args.origin.trim() ? args.origin.trim() : '';
    if (!origin) {
      return [{ url: 'http://localhost:3000', changeFrequency: 'weekly', priority: 1 }];
    }

    const staticEntries = buildStaticSitemapEntries(origin);
    if (args.staticOnly) {
      return staticEntries;
    }

    const entries: SitemapEntryInput[] = [...staticEntries];

    for (const page of args.pages ?? []) {
      if (page.noIndex === true) {
        continue;
      }
      if (!isValidPublicSlug(page.slug) && page.slug !== 'home') {
        continue;
      }
      if (page.slug !== 'home' && page.pageType === 'home') {
        continue;
      }

      const pathname =
        SEO_PUBLIC_PAGE_CANDIDATES.find((c) => c.slug === page.slug)?.pathname ??
        (page.slug === 'home' ? '/' : `/${page.slug}`);

      const editorial =
        typeof page.canonicalUrl === 'string' && /^https?:\/\//i.test(page.canonicalUrl.trim())
          ? page.canonicalUrl.trim()
          : null;

      entries.push({
        url: editorial ?? toAbsoluteUrl(origin, pathname),
        changeFrequency: pathname === '/' ? 'weekly' : 'monthly',
        priority: pathname === '/' ? 1 : 0.8,
      });
    }

    for (const company of args.companies ?? []) {
      if (!isValidPublicSlug(company.portalSlug)) {
        continue;
      }
      entries.push({
        url: toAbsoluteUrl(origin, `/empresas/${company.portalSlug}`),
        changeFrequency: 'monthly',
        priority: 0.75,
      });
    }

    for (const post of args.posts ?? []) {
      if (!isValidPublicSlug(post.slug)) {
        continue;
      }
      const lastModified = parseSafeLastModified(post.publishedAt);
      entries.push({
        url: toAbsoluteUrl(origin, `/blog/${post.slug}`),
        changeFrequency: 'weekly',
        priority: 0.6,
        ...(lastModified ? { lastModified } : {}),
      });
    }

    for (const category of args.categories ?? []) {
      if (!isValidPublicSlug(category.slug)) {
        continue;
      }
      entries.push({
        url: toAbsoluteUrl(origin, `/blog/categoria/${category.slug}`),
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }

    for (const tag of args.tags ?? []) {
      if (!isValidPublicSlug(tag.slug)) {
        continue;
      }
      entries.push({
        url: toAbsoluteUrl(origin, `/blog/tag/${tag.slug}`),
        changeFrequency: 'weekly',
        priority: 0.4,
      });
    }

    const deduped = dedupeSitemapEntries(entries);
    return deduped.length > 0 ? deduped : staticEntries;
  } catch {
    try {
      return buildStaticSitemapEntries(args.origin || 'http://localhost:3000');
    } catch {
      return [{ url: 'http://localhost:3000', changeFrequency: 'weekly', priority: 1 }];
    }
  }
}
