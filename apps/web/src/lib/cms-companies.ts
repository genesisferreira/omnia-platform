import { cache } from 'react';

import type { PublicCompanyDto, PublicCompanyListItemDto } from '@omnia/shared';
import { getConfig } from '@omnia/config';

import { fetchWithCmsTimeout } from '@/lib/cms/cms-fetch';

function getAdminApiUrl(): string {
  return getConfig().app.adminUrl;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveMediaUrl(url: string): string {
  try {
    return new URL(url, `${getAdminApiUrl()}/`).toString();
  } catch {
    return url;
  }
}

function normalizeListItem(company: PublicCompanyListItemDto): PublicCompanyListItemDto {
  return {
    ...company,
    logo: company.logo ? { ...company.logo, url: resolveMediaUrl(company.logo.url) } : null,
    coverImage: company.coverImage
      ? { ...company.coverImage, url: resolveMediaUrl(company.coverImage.url) }
      : null,
  };
}

function normalizeCompany(company: PublicCompanyDto): PublicCompanyDto {
  const list = normalizeListItem(company);
  return {
    ...company,
    ...list,
    gallery: company.gallery.map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url),
    })),
    seo: {
      ...company.seo,
      openGraphImage: company.seo.openGraphImage
        ? {
            ...company.seo.openGraphImage,
            url: resolveMediaUrl(company.seo.openGraphImage.url),
          }
        : null,
    },
    siblings: company.siblings.map(normalizeListItem),
  };
}

function isListItem(value: unknown): value is PublicCompanyListItemDto {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.portalSlug === 'string'
  );
}

export const fetchPublicCompanies = cache(async (): Promise<PublicCompanyListItemDto[]> => {
  try {
    const res = await fetchWithCmsTimeout(`${getAdminApiUrl()}/api/omnia/public-companies`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return [];
    }
    const data: unknown = await res.json();
    if (!isPlainRecord(data) || data.ok !== true || !Array.isArray(data.companies)) {
      return [];
    }
    return data.companies.filter(isListItem).map(normalizeListItem);
  } catch {
    return [];
  }
});

export const fetchPublicCompany = cache(
  async (portalSlug: string): Promise<PublicCompanyDto | null> => {
    try {
      const slug = portalSlug.trim().toLowerCase();
      if (!slug) {
        return null;
      }
      const url = new URL(`${getAdminApiUrl()}/api/omnia/public-company`);
      url.searchParams.set('slug', slug);
      const res = await fetchWithCmsTimeout(url.toString(), {
        next: { revalidate: 60 },
      });
      if (!res.ok) {
        return null;
      }
      const data: unknown = await res.json();
      if (!isPlainRecord(data) || data.ok !== true || !isListItem(data.company)) {
        return null;
      }
      return normalizeCompany(data.company as PublicCompanyDto);
    } catch {
      return null;
    }
  },
);
