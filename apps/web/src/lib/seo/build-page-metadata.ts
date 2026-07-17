import type { Metadata } from 'next';

import type { PublicPageSeoDto } from '@omnia/shared';

import {
  SEO_DEFAULT_OG_IMAGE_ALT,
  SEO_DEFAULT_OG_IMAGE_PATH,
  SEO_FALLBACK_DESCRIPTION,
  SEO_FALLBACK_TITLE,
  SEO_LOCALE,
  SEO_SITE_NAME,
} from './constants';
import { resolveCanonicalUrl } from './site-url';

export type BuildPageMetadataArgs = {
  pathname: string;
  title?: string | null;
  description?: string | null;
  seo?: PublicPageSeoDto | null;
  hostname?: string | null;
};

/**
 * Metadata pública compartilhada (Home + /[slug]).
 * Reutiliza o contrato SEO já exposto por PublicPageSeoDto.
 */
export function buildPageMetadata(args: BuildPageMetadataArgs): Metadata {
  const title = args.seo?.metaTitle ?? args.title ?? SEO_FALLBACK_TITLE;
  const description = args.seo?.metaDescription ?? args.description ?? SEO_FALLBACK_DESCRIPTION;
  const canonical = resolveCanonicalUrl({
    pathname: args.pathname,
    editorialCanonical: args.seo?.canonicalUrl,
    hostname: args.hostname,
  });
  const noIndex = args.seo?.noIndex === true;
  const images = [{ url: SEO_DEFAULT_OG_IMAGE_PATH, alt: SEO_DEFAULT_OG_IMAGE_ALT }];

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: SEO_LOCALE,
      siteName: SEO_SITE_NAME,
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SEO_DEFAULT_OG_IMAGE_PATH],
    },
  };
}

export function buildFallbackMetadata(hostname?: string | null): Metadata {
  return buildPageMetadata({
    pathname: '/',
    hostname,
  });
}

/** Metadata para rotas que renderizam 404 institucional. */
export function buildNotFoundMetadata(): Metadata {
  return {
    title: `Página não encontrada | ${SEO_SITE_NAME}`,
    description: SEO_FALLBACK_DESCRIPTION,
    robots: { index: false, follow: false },
  };
}
