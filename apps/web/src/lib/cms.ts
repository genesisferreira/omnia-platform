import { getConfig } from '@omnia/config';

export type CmsCompany = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
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

export async function fetchCompanies(): Promise<CmsCompany[]> {
  try {
    const base = getAdminApiUrl();
    const res = await fetch(`${base}/api/omnia/public-companies`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!isPublicCompaniesResponse(data)) return [];
    return data.companies;
  } catch {
    return [];
  }
}

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
