import type { MetadataRoute } from 'next';

import { fetchPublicPage } from '@/lib/cms';
import { fetchPublicPostCategories, fetchPublicPosts, fetchPublicPostTags } from '@/lib/cms-blog';
import { fetchPublicCompanies } from '@/lib/cms-companies';
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

  const companies = await fetchPublicCompanies();
  for (const company of companies) {
    const url =
      resolveCanonicalUrl({ pathname: `/empresas/${company.portalSlug}`, hostname }) ??
      `${getPublicSiteOrigin()}/empresas/${company.portalSlug}`;
    entries.push({
      url,
      changeFrequency: 'monthly',
      priority: 0.75,
    });
  }

  const blogUrl =
    resolveCanonicalUrl({ pathname: '/blog', hostname }) ?? `${getPublicSiteOrigin()}/blog`;
  entries.push({
    url: blogUrl,
    changeFrequency: 'daily',
    priority: 0.7,
  });

  const [posts, categories, tags] = await Promise.all([
    fetchPublicPosts({ siteSlug, page: 1, pageSize: 20 }),
    fetchPublicPostCategories(siteSlug),
    fetchPublicPostTags(siteSlug),
  ]);

  for (const post of posts.items) {
    const url =
      resolveCanonicalUrl({ pathname: `/blog/${post.slug}`, hostname }) ??
      `${getPublicSiteOrigin()}/blog/${post.slug}`;
    entries.push({
      url,
      changeFrequency: 'weekly',
      priority: 0.6,
      ...(post.publishedAt ? { lastModified: new Date(post.publishedAt) } : {}),
    });
  }

  for (const category of categories) {
    const url =
      resolveCanonicalUrl({ pathname: `/blog/categoria/${category.slug}`, hostname }) ??
      `${getPublicSiteOrigin()}/blog/categoria/${category.slug}`;
    entries.push({
      url,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  for (const tag of tags) {
    const url =
      resolveCanonicalUrl({ pathname: `/blog/tag/${tag.slug}`, hostname }) ??
      `${getPublicSiteOrigin()}/blog/tag/${tag.slug}`;
    entries.push({
      url,
      changeFrequency: 'weekly',
      priority: 0.4,
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
