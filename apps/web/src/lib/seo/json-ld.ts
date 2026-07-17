import { SEO_FALLBACK_DESCRIPTION, SEO_FALLBACK_TITLE, SEO_SITE_NAME } from './constants';
import { getPublicSiteOrigin, resolveCanonicalUrl } from './site-url';

export type JsonLdRecord = Record<string, unknown>;

export function buildOrganizationJsonLd(args?: { hostname?: string | null }): JsonLdRecord {
  const url =
    resolveCanonicalUrl({ pathname: '/', hostname: args?.hostname }) ?? getPublicSiteOrigin();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_SITE_NAME,
    url,
    description: SEO_FALLBACK_DESCRIPTION,
    slogan: SEO_FALLBACK_DESCRIPTION,
  };
}

export function buildWebSiteJsonLd(args?: { hostname?: string | null }): JsonLdRecord {
  const url =
    resolveCanonicalUrl({ pathname: '/', hostname: args?.hostname }) ?? getPublicSiteOrigin();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_SITE_NAME,
    url,
    description: SEO_FALLBACK_DESCRIPTION,
    inLanguage: 'pt-BR',
    publisher: {
      '@type': 'Organization',
      name: SEO_SITE_NAME,
    },
  };
}

export function buildWebPageJsonLd(args: {
  pathname: string;
  title?: string | null;
  description?: string | null;
  hostname?: string | null;
}): JsonLdRecord {
  const url =
    resolveCanonicalUrl({
      pathname: args.pathname,
      hostname: args.hostname,
    }) ?? `${getPublicSiteOrigin()}${args.pathname === '/' ? '' : args.pathname}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: args.title ?? SEO_FALLBACK_TITLE,
    description: args.description ?? SEO_FALLBACK_DESCRIPTION,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: SEO_SITE_NAME,
      url: resolveCanonicalUrl({ pathname: '/', hostname: args.hostname }) ?? getPublicSiteOrigin(),
    },
    inLanguage: 'pt-BR',
  };
}

export function buildArticleJsonLd(args: {
  pathname: string;
  headline: string;
  description?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string | null;
  imageUrl?: string | null;
  hostname?: string | null;
  schemaType?: string | null;
}): JsonLdRecord {
  const url =
    resolveCanonicalUrl({
      pathname: args.pathname,
      hostname: args.hostname,
    }) ?? `${getPublicSiteOrigin()}${args.pathname}`;

  const type =
    args.schemaType === 'Article' || args.schemaType === 'BlogPosting'
      ? args.schemaType
      : 'BlogPosting';

  const record: JsonLdRecord = {
    '@context': 'https://schema.org',
    '@type': type,
    headline: args.headline,
    description: args.description ?? SEO_FALLBACK_DESCRIPTION,
    url,
    mainEntityOfPage: url,
    inLanguage: 'pt-BR',
    publisher: {
      '@type': 'Organization',
      name: SEO_SITE_NAME,
    },
  };

  if (args.datePublished) {
    record.datePublished = args.datePublished;
  }
  if (args.dateModified) {
    record.dateModified = args.dateModified;
  }
  if (args.authorName) {
    record.author = {
      '@type': 'Person',
      name: args.authorName,
    };
  }
  if (args.imageUrl) {
    record.image = [args.imageUrl];
  }

  return record;
}

export function buildCompanyOrganizationJsonLd(args: {
  pathname: string;
  name: string;
  description?: string | null;
  url?: string | null;
  hostname?: string | null;
}): JsonLdRecord {
  const pageUrl =
    resolveCanonicalUrl({
      pathname: args.pathname,
      hostname: args.hostname,
    }) ?? `${getPublicSiteOrigin()}${args.pathname}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: args.name,
    description: args.description ?? SEO_FALLBACK_DESCRIPTION,
    url: args.url ?? pageUrl,
    parentOrganization: {
      '@type': 'Organization',
      name: SEO_SITE_NAME,
      url: resolveCanonicalUrl({ pathname: '/', hostname: args.hostname }) ?? getPublicSiteOrigin(),
    },
  };
}

export function buildBreadcrumbJsonLd(args: {
  hostname?: string | null;
  items: Array<{ name: string; pathname: string }>;
}): JsonLdRecord {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: args.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item:
        resolveCanonicalUrl({
          pathname: item.pathname,
          hostname: args.hostname,
        }) ?? `${getPublicSiteOrigin()}${item.pathname === '/' ? '' : item.pathname}`,
    })),
  };
}
