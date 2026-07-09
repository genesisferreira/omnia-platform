import { getConfig } from '@omnia/config';

export type CmsCompany = {
  id: string | number;
  name: string;
  slug: string;
  shortDescription: string;
  ecosystemRole: string;
  displayOrder: number;
  externalSite?: string | null;
  status: string;
  logo?: {
    url?: string;
    alt?: string;
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

function getAdminApiUrl(): string {
  return getConfig().app.adminUrl;
}

export async function fetchCompanies(): Promise<CmsCompany[]> {
  try {
    const base = getAdminApiUrl();
    const res = await fetch(
      `${base}/api/companies?where[status][equals]=active&sort=displayOrder&limit=20&depth=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: CmsCompany[] };
    return data.docs ?? [];
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
