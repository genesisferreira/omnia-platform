import { getConfig } from '@omnia/config';
import type { PublicPartnerDetailDto, PublicPartnerListItemDto } from '@omnia/shared';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';

type PartnersListResponse = {
  ok: true;
  partners: PublicPartnerListItemDto[];
  pagination: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  meta: { origin: { lat: number; lng: number } | null; radiusKm: number | null };
};

type TaxonomyResponse = { ok: true; items: Array<{ id: string; name: string; slug: string }> };

function adminBase(): string {
  try {
    return getAdminBaseUrl() || getConfig().app.adminUrl;
  } catch {
    return process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
  }
}

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  try {
    return new URL(url, adminBase()).toString();
  } catch {
    return url;
  }
}

function absolutizePartner<T extends PublicPartnerListItemDto>(partner: T): T {
  return {
    ...partner,
    logo: partner.logo
      ? { ...partner.logo, url: resolveMediaUrl(partner.logo.url) || partner.logo.url }
      : null,
  };
}

function absolutizeDetail(partner: PublicPartnerDetailDto): PublicPartnerDetailDto {
  const base = absolutizePartner(partner);
  return {
    ...base,
    gallery: partner.gallery.map((g) => ({
      ...g,
      image: {
        ...g.image,
        url: resolveMediaUrl(g.image.url) || g.image.url,
      },
    })),
  };
}

export type FetchPartnersQuery = {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  category?: string;
  specialty?: string;
  partnerType?: string;
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  featured?: boolean;
  verified?: boolean;
  home?: boolean;
};

export async function fetchPublicPartners(
  query: FetchPartnersQuery = {},
): Promise<PartnersListResponse | null> {
  try {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.city) params.set('city', query.city);
    if (query.state) params.set('state', query.state);
    if (query.category) params.set('category', query.category);
    if (query.specialty) params.set('specialty', query.specialty);
    if (query.partnerType) params.set('partnerType', query.partnerType);
    if (query.q) params.set('q', query.q);
    if (query.lat != null) params.set('lat', String(query.lat));
    if (query.lng != null) params.set('lng', String(query.lng));
    if (query.radiusKm != null) params.set('radiusKm', String(query.radiusKm));
    if (query.featured) params.set('featured', '1');
    if (query.verified) params.set('verified', '1');
    if (query.home) params.set('home', '1');

    const res = await fetch(`${adminBase()}/api/omnia/public-partners?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PartnersListResponse | { ok: false };
    if (!data || data.ok !== true) return null;
    return {
      ...data,
      partners: data.partners.map(absolutizePartner),
    };
  } catch {
    return null;
  }
}

export async function fetchPublicPartnerBySlug(
  slug: string,
): Promise<PublicPartnerDetailDto | null> {
  try {
    const params = new URLSearchParams({ slug });
    const res = await fetch(`${adminBase()}/api/omnia/public-partner?${params}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: true; partner: PublicPartnerDetailDto } | { ok: false };
    if (!data || data.ok !== true) return null;
    return absolutizeDetail(data.partner);
  } catch {
    return null;
  }
}

export async function fetchPartnerCategories(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  try {
    const res = await fetch(`${adminBase()}/api/omnia/public-partner-categories`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TaxonomyResponse | { ok: false };
    if (!data || data.ok !== true) return [];
    return data.items;
  } catch {
    return [];
  }
}

export async function fetchPartnerSpecialties(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  try {
    const res = await fetch(`${adminBase()}/api/omnia/public-partner-specialties`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TaxonomyResponse | { ok: false };
    if (!data || data.ok !== true) return [];
    return data.items;
  } catch {
    return [];
  }
}
