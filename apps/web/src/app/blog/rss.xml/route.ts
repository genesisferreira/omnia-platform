import { classifyFetchFailure, logFeedFailure } from '@/lib/seo/feed-log';
import { fetchFeedPosts } from '@/lib/seo/cms-feed-client';
import { buildRssXml, RSS_CONTENT_TYPE } from '@/lib/seo/rss-feed';
import { getPublicSiteOrigin, resolveCanonicalUrl, resolveSeoHostname } from '@/lib/seo';
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

function emptyFeedResponse(origin: string): Response {
  const xml = buildRssXml({ origin, posts: [] });
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': RSS_CONTENT_TYPE,
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}

/**
 * RSS resiliente (Release 2.1.1).
 * Sempre HTTP 200 com XML válido; sob falha CMS → canal vazio.
 */
export async function GET(): Promise<Response> {
  const started = Date.now();
  let siteSlug = 'omnia-hub';
  let origin = getPublicSiteOrigin();

  try {
    const resolved = await resolveFeedSite();
    siteSlug = resolved.siteSlug;
    origin =
      resolveCanonicalUrl({ pathname: '/', hostname: resolved.hostname })?.replace(/\/$/, '') ??
      getPublicSiteOrigin();

    let posts: {
      title: string;
      slug: string;
      excerpt?: string | null;
      publishedAt?: string | null;
      authorName?: string | null;
      imageUrl?: string | null;
      categoryName?: string | null;
    }[] = [];

    try {
      posts = await fetchFeedPosts(siteSlug, 20);
    } catch (error) {
      logFeedFailure({
        module: 'rss',
        endpoint: 'public-posts',
        failureType: classifyFetchFailure(error),
        durationMs: Date.now() - started,
        siteSlug,
        fallbackApplied: true,
      });
      return emptyFeedResponse(origin);
    }

    const xml = buildRssXml({ origin, posts });
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': RSS_CONTENT_TYPE,
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    logFeedFailure({
      module: 'rss',
      endpoint: 'rss',
      failureType: classifyFetchFailure(error),
      durationMs: Date.now() - started,
      siteSlug,
      fallbackApplied: true,
    });
    try {
      return emptyFeedResponse(origin || getPublicSiteOrigin());
    } catch {
      return emptyFeedResponse('https://omniafrigo.com.br');
    }
  }
}
