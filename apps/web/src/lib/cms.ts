import { cache } from 'react';

import { mapPublicPage, type PublicPageDto } from '@omnia/shared';

import { getConfig } from '@omnia/config';

import { resolvePublicImageAlt } from '@/lib/seo';

export type CmsCompany = {
  id: string;
  name: string;
  slug: string;
  portalSlug: string;
  shortDescription: string;
  positioning?: string | null;
  ecosystemRole: string;
  displayOrder: number;
  externalSite: string | null;
  logo: {
    url: string;
    alt: string | null;
  } | null;
};

export type CmsGlobalSettings = {
  siteName?: string;
  tagline?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  contactEmail?: string;
};

type PublicCompaniesResponse = {
  ok: true;
  companies: CmsCompany[];
};

type PublicPageResponse = {
  ok: true;
  page: PublicPageDto;
};

function getAdminApiUrl(): string {
  return getConfig().app.adminUrl;
}

function isPublicCompaniesResponse(value: unknown): value is PublicCompaniesResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.ok === true && Array.isArray(record.companies);
}

function isPublicPageResponse(value: unknown): value is PublicPageResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.ok !== true || typeof record.page !== 'object' || record.page === null) {
    return false;
  }

  return mapPublicPage(record.page) !== null;
}

export async function fetchCompanies(limit?: number): Promise<CmsCompany[]> {
  const companies = await fetchCompaniesCached();
  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    return companies.slice(0, Math.min(Math.floor(limit), 20));
  }
  return companies;
}

/**
 * Um fetch por render RSC — múltiplos CompaniesBlocks compartilham o resultado.
 */
const fetchCompaniesCached = cache(async (): Promise<CmsCompany[]> => {
  try {
    const base = getAdminApiUrl();
    const res = await fetch(`${base}/api/omnia/public-companies`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!isPublicCompaniesResponse(data)) return [];
    return data.companies.map((company) => {
      const portalSlug =
        typeof (company as { portalSlug?: unknown }).portalSlug === 'string' &&
        (company as { portalSlug: string }).portalSlug.trim() !== ''
          ? (company as { portalSlug: string }).portalSlug
          : company.slug;

      const nextCompany: CmsCompany = {
        ...company,
        portalSlug,
      };

      if (!nextCompany.logo) {
        return nextCompany;
      }

      return {
        ...nextCompany,
        logo: {
          ...nextCompany.logo,
          alt: resolvePublicImageAlt(nextCompany.logo.alt, nextCompany.name),
        },
      };
    });
  } catch {
    return [];
  }
});

/**
 * Cliente público mínimo — GET /api/omnia/public-page?site=&slug=
 * Soft-fail: retorna null em qualquer falha (sem throw).
 * Cacheado por (site, slug) na mesma renderização RSC.
 */
export const fetchPublicPage = cache(
  async (siteSlug: string, pageSlug: string): Promise<PublicPageDto | null> => {
    try {
      const trimmedSite = siteSlug.trim().toLowerCase();
      const trimmedSlug = pageSlug.trim().toLowerCase();
      if (!trimmedSite || !trimmedSlug) {
        return null;
      }

      const base = getAdminApiUrl();
      const url = new URL(`${base}/api/omnia/public-page`);
      url.searchParams.set('site', trimmedSite);
      url.searchParams.set('slug', trimmedSlug);

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;

      const data: unknown = await res.json();
      if (!isPublicPageResponse(data)) return null;

      return mapPublicPage(data.page);
    } catch {
      return null;
    }
  },
);

export async function fetchGlobalSettings(): Promise<CmsGlobalSettings | null> {
  try {
    const base = getAdminApiUrl();
    const res = await fetch(`${base}/api/globals/global-settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsGlobalSettings;
  } catch {
    return null;
  }
}
