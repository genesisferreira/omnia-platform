import { fetchPublicPosts } from '@/lib/cms-blog';
import {
  getPublicSiteOrigin,
  resolveCanonicalUrl,
  resolveSeoHostname,
  SEO_SITE_NAME,
} from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(): Promise<Response> {
  let hostname = resolveSeoHostname(null);
  let siteSlug = 'omnia-hub';

  try {
    const siteContext = await getSiteContext();
    hostname = resolveSeoHostname(siteContext.hostname || null);
    if (siteContext.resolution.ok) {
      siteSlug = siteContext.resolution.context.site.slug;
    }
  } catch {
    // Build/runtime sem request headers.
  }

  const list = await fetchPublicPosts({ siteSlug, page: 1, pageSize: 20 });
  const channelLink =
    resolveCanonicalUrl({ pathname: '/blog', hostname }) ?? `${getPublicSiteOrigin()}/blog`;

  const itemsXml = list.items
    .map((post) => {
      const link =
        resolveCanonicalUrl({ pathname: `/blog/${post.slug}`, hostname }) ??
        `${getPublicSiteOrigin()}/blog/${post.slug}`;
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date().toUTCString();
      const description = escapeXml(post.excerpt ?? post.title);

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${SEO_SITE_NAME} — Blog`)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml('Artigos e novidades do ecossistema Omnia Frigo Holding.')}</description>
    <language>pt-BR</language>
${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
