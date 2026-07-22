import type { MetadataRoute } from 'next';

import { fetchPublicPage } from '@/lib/cms';
import { classifyFetchFailure, logFeedFailure } from '@/lib/seo/feed-log';
import {
  fetchFeedCompanies,
  fetchFeedPosts,
  fetchFeedTaxonomies,
} from '@/lib/seo/cms-feed-client';
import {
  getPublicSiteOrigin,
  resolveCanonicalUrl,
  resolveSeoHostname,
  SEO_PUBLIC_PAGE_CANDIDATES,
} from '@/lib/seo';
import { buildSitemapEntries, buildStaticSitemapEntries } from '@/lib/seo/sitemap-entries';
import { getSiteContext } from '@/lib/site-context';

async function resolveFeedSite(): Promise<{ hostname: string; siteSlug: string }> {
  let hostname = resolveSeoHostname(null);
  let siteSlug = 'omnia-hub';

  try {
    const siteContext = await getSiteContext();
    hostname = resolveSeoHostname(siteContext.hostname || null);
    if (siteContext.resolution.ok) {
      const slug = siteContext.resolution.context.site.slug;
      if (typeof slug === 'string' && slug.trim()) {
        siteSlug = slug.trim().toLowerCase();
      }
    }
  } catch {
    // Sem headers / S2S — usa defaults públicos.
  }

  return { hostname, siteSlug };
}

/**
 * Sitemap resiliente (Release 2.1.1).
 * Nunca lança: sob falha do CMS retorna rotas estáticas absolutas.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const started = Date.now();
  let siteSlug = 'omnia-hub';

  try {
    const resolved = await resolveFeedSite();
    siteSlug = resolved.siteSlug;
    const hostname = resolved.hostname;
    const origin =
      resolveCanonicalUrl({ pathname: '/', hostname })?.replace(/\/$/, '') ?? getPublicSiteOrigin();

    const pages = [];
    for (const candidate of SEO_PUBLIC_PAGE_CANDIDATES) {
      try {
        const page = await fetchPublicPage(siteSlug, candidate.slug);
        if (!page) {
          continue;
        }
        pages.push({
          pathname: candidate.pathname,
          slug: candidate.slug,
          noIndex: page.seo?.noIndex === true,
          pageType: page.pageType ?? null,
          canonicalUrl: page.seo?.canonicalUrl ?? null,
        });
      } catch (error) {
        logFeedFailure({
          module: 'sitemap',
          endpoint: 'public-page',
          failureType: classifyFetchFailure(error),
          durationMs: Date.now() - started,
          siteSlug,
          fallbackApplied: true,
        });
      }
    }

    let companies: { portalSlug: string }[] = [];
    let posts: { slug: string; publishedAt?: string | null }[] = [];
    let categories: { slug: string }[] = [];
    let tags: { slug: string }[] = [];

    try {
      const [companyList, postList, categoryList, tagList] = await Promise.all([
        fetchFeedCompanies(),
        fetchFeedPosts(siteSlug, 20),
        fetchFeedTaxonomies(siteSlug, 'categories'),
        fetchFeedTaxonomies(siteSlug, 'tags'),
      ]);
      companies = companyList;
      posts = postList.map((p) => ({ slug: p.slug, publishedAt: p.publishedAt }));
      categories = categoryList;
      tags = tagList;
    } catch (error) {
      logFeedFailure({
        module: 'sitemap',
        endpoint: 'public-cms-batch',
        failureType: classifyFetchFailure(error),
        durationMs: Date.now() - started,
        siteSlug,
        fallbackApplied: true,
      });
      return buildStaticSitemapEntries(origin);
    }

    return buildSitemapEntries({
      origin,
      hostname,
      pages,
      companies,
      posts,
      categories,
      tags,
    });
  } catch (error) {
    logFeedFailure({
      module: 'sitemap',
      endpoint: 'sitemap',
      failureType: classifyFetchFailure(error),
      durationMs: Date.now() - started,
      siteSlug,
      fallbackApplied: true,
    });
    try {
      return buildStaticSitemapEntries(getPublicSiteOrigin());
    } catch {
      return [{ url: 'https://omniafrigo.com.br', changeFrequency: 'weekly', priority: 1 }];
    }
  }
}
