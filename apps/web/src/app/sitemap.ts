import type { MetadataRoute } from 'next';

import { fetchPublicPage } from '@/lib/cms';
import {
  getPublicSiteOrigin,
  resolveCanonicalUrl,
  resolveSeoHostname,
  SEO_PUBLIC_PAGE_CANDIDATES,
} from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let hostname = resolveSeoHostname(null);
  let siteSlug = 'omnia-hub';

  try {
    const siteContext = await getSiteContext();
    hostname = resolveSeoHostname(siteContext.hostname || null);
    if (siteContext.resolution.ok) {
      siteSlug = siteContext.resolution.context.site.slug;
    }
  } catch {
    // Build/runtime sem request headers — usa origem pública.
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const candidate of SEO_PUBLIC_PAGE_CANDIDATES) {
    const page = await fetchPublicPage(siteSlug, candidate.slug);
    if (!page || page.seo.noIndex) {
      continue;
    }

    if (candidate.slug !== 'home' && page.pageType === 'home') {
      continue;
    }

    const url =
      resolveCanonicalUrl({
        pathname: candidate.pathname,
        editorialCanonical: page.seo.canonicalUrl,
        hostname,
      }) ?? `${getPublicSiteOrigin()}${candidate.pathname === '/' ? '' : candidate.pathname}`;

    entries.push({
      url,
      changeFrequency: candidate.pathname === '/' ? 'weekly' : 'monthly',
      priority: candidate.pathname === '/' ? 1 : 0.8,
    });
  }

  if (entries.length === 0) {
    const fallback = resolveCanonicalUrl({ pathname: '/', hostname }) ?? getPublicSiteOrigin();
    return [
      {
        url: fallback,
        changeFrequency: 'weekly',
        priority: 1,
      },
    ];
  }

  return entries;
}
