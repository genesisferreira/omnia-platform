import { SEO_SITE_NAME } from './constants';

export type RssPostInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  authorName?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
};

export type BuildRssXmlArgs = {
  origin: string;
  channelPath?: string;
  posts: RssPostInput[];
};

const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function isValidRssSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && PUBLIC_SLUG_PATTERN.test(slug);
}

export function toAbsoluteFeedUrl(origin: string, pathname: string): string {
  const base = origin.replace(/\/+$/, '');
  if (pathname === '/' || pathname === '') {
    return base;
  }
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/**
 * Ordena por publishedAt decrescente; posts sem data válida vão ao final.
 * Nunca lança.
 */
export function sortPostsByDateDesc(posts: RssPostInput[]): RssPostInput[] {
  const copy = [...posts];
  copy.sort((a, b) => {
    const ta = typeof a.publishedAt === 'string' ? Date.parse(a.publishedAt) : Number.NaN;
    const tb = typeof b.publishedAt === 'string' ? Date.parse(b.publishedAt) : Number.NaN;
    const aOk = !Number.isNaN(ta);
    const bOk = !Number.isNaN(tb);
    if (aOk && bOk) {
      return tb - ta;
    }
    if (aOk) {
      return -1;
    }
    if (bOk) {
      return 1;
    }
    return 0;
  });
  return copy;
}

function formatPubDate(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return null;
  }
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toUTCString();
}

/**
 * Gera XML RSS 2.0 válido. Nunca lança.
 * Posts inválidos (sem slug/título) são omitidos.
 */
export function buildRssXml(args: BuildRssXmlArgs): string {
  try {
    const origin =
      typeof args.origin === 'string' && args.origin.trim()
        ? args.origin.trim().replace(/\/+$/, '')
        : 'http://localhost:3000';
    const channelPath = args.channelPath ?? '/blog';
    const channelLink = toAbsoluteFeedUrl(origin, channelPath);

    const validPosts = sortPostsByDateDesc(
      (args.posts ?? []).filter(
        (post) =>
          typeof post.title === 'string' &&
          post.title.trim() !== '' &&
          isValidRssSlug(post.slug),
      ),
    );

    const itemsXml = validPosts
      .map((post) => {
        const link = toAbsoluteFeedUrl(origin, `/blog/${post.slug}`);
        const pubDate = formatPubDate(post.publishedAt);
        const description = escapeXml(
          (typeof post.excerpt === 'string' && post.excerpt.trim()
            ? post.excerpt
            : post.title
          ).trim(),
        );
        const author =
          typeof post.authorName === 'string' && post.authorName.trim()
            ? `\n      <author>${escapeXml(post.authorName.trim())}</author>`
            : '';
        const category =
          typeof post.categoryName === 'string' && post.categoryName.trim()
            ? `\n      <category>${escapeXml(post.categoryName.trim())}</category>`
            : '';
        const enclosure =
          typeof post.imageUrl === 'string' && /^https?:\/\//i.test(post.imageUrl.trim())
            ? `\n      <enclosure url="${escapeXml(post.imageUrl.trim())}" type="image/jpeg" />`
            : '';
        const pubDateLine = pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : '';

        return `    <item>
      <title>${escapeXml(post.title.trim())}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>${pubDateLine}
      <description>${description}</description>${author}${category}${enclosure}
    </item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
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
  } catch {
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${SEO_SITE_NAME} — Blog`)}</title>
    <link>http://localhost:3000/blog</link>
    <description>${escapeXml('Artigos e novidades do ecossistema Omnia Frigo Holding.')}</description>
    <language>pt-BR</language>
  </channel>
</rss>
`;
  }
}

export const RSS_CONTENT_TYPE = 'application/rss+xml; charset=utf-8';
