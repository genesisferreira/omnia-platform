import type { MetadataRoute } from 'next';

import { getConfig } from '@omnia/config';

import { fetchPublicPage } from '@/lib/cms';
import { fetchPublicPostCategories, fetchPublicPosts, fetchPublicPostTags } from '@/lib/cms-blog';
import { fetchPublicCompanies } from '@/lib/cms-companies';
import { getPublicSiteOrigin, SEO_PUBLIC_PAGE_CANDIDATES } from '@/lib/seo';
import {
  assertSitemapPagination,
  assembleSitemapEntries,
  SITEMAP_PAGE_SIZE,
  SitemapSourceError,
  type SitemapPostInput,
} from '@/lib/seo/sitemap-entries';

export const dynamic = 'force-dynamic';

const PUBLIC_SITE_SLUG = 'omnia-hub';

async function assertCmsReachable(adminUrl: string): Promise<void> {
  try {
    const response = await fetch(`${adminUrl}/api/health`, { cache: 'no-store' });
    if (!response.ok) {
      throw new SitemapSourceError('cms_unavailable');
    }
  } catch (error) {
    if (error instanceof SitemapSourceError) throw error;
    throw new SitemapSourceError('cms_unavailable');
  }
}

async function collectPosts(siteSlug: string): Promise<SitemapPostInput[]> {
  const first = await fetchPublicPosts({
    siteSlug,
    page: 1,
    pageSize: SITEMAP_PAGE_SIZE,
  });
  assertSitemapPagination(first.totalPages);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchPublicPosts({
      siteSlug,
      page,
      pageSize: SITEMAP_PAGE_SIZE,
    });
    items.push(...next.items);
  }
  return items.map((post) => ({
    slug: post.slug,
    publishedAt: post.publishedAt,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteOrigin();
  await assertCmsReachable(getConfig().app.adminUrl);

  const pages = [];
  for (const candidate of SEO_PUBLIC_PAGE_CANDIDATES) {
    const page = await fetchPublicPage(PUBLIC_SITE_SLUG, candidate.slug);
    if (!page || page.seo.noIndex) continue;
    if (candidate.slug !== 'home' && page.pageType === 'home') continue;
    pages.push({
      pathname: candidate.pathname,
      noIndex: false,
      changeFrequency:
        candidate.pathname === '/' ? ('weekly' as const) : ('monthly' as const),
      priority: candidate.pathname === '/' ? 1 : 0.8,
    });
  }

  pages.push(
    { pathname: '/blog', changeFrequency: 'daily' as const, priority: 0.7 },
    { pathname: '/interesse', changeFrequency: 'monthly' as const, priority: 0.7 },
    { pathname: '/cursos', changeFrequency: 'weekly' as const, priority: 0.6 },
  );

  const [companies, posts, categories, tags] = await Promise.all([
    fetchPublicCompanies(),
    collectPosts(PUBLIC_SITE_SLUG),
    fetchPublicPostCategories(PUBLIC_SITE_SLUG),
    fetchPublicPostTags(PUBLIC_SITE_SLUG),
  ]);

  return assembleSitemapEntries({
    origin,
    pages,
    companySlugs: companies.map((company) => company.portalSlug),
    posts,
    categorySlugs: categories.map((category) => category.slug),
    tagSlugs: tags.map((tag) => tag.slug),
  });
}
