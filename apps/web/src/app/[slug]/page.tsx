import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';

import { BlockRenderer } from '@/components/home/BlockRenderer';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPage } from '@/lib/cms';
import {
  buildFallbackMetadata,
  buildNotFoundMetadata,
  buildPageMetadata,
  buildWebPageJsonLd,
  SEO_FALLBACK_DESCRIPTION,
  SEO_FALLBACK_TITLE,
} from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

const RESERVED_SLUGS = new Set(['api', 'health', 'status']);

const loadPage = cache(async (slug: string) => {
  const siteContext = await getSiteContext();
  if (!siteContext.resolution.ok) {
    return { page: null, hostname: siteContext.hostname };
  }

  const page = await fetchPublicPage(siteContext.resolution.context.site.slug, slug);
  return { page, hostname: siteContext.hostname };
});

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();

  if (!slug || RESERVED_SLUGS.has(slug)) {
    return buildNotFoundMetadata();
  }

  if (slug === 'home') {
    return buildFallbackMetadata();
  }

  const { page, hostname } = await loadPage(slug);
  if (!page || page.pageType === 'home' || page.blocks.length === 0) {
    return buildNotFoundMetadata();
  }

  return buildPageMetadata({
    pathname: `/${slug}`,
    title: page.title,
    description: SEO_FALLBACK_DESCRIPTION,
    seo: page.seo,
    hostname,
  });
}

export default async function InstitutionalPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.trim().toLowerCase();

  if (!slug || RESERVED_SLUGS.has(slug)) {
    notFound();
  }

  if (slug === 'home') {
    permanentRedirect('/');
  }

  const { page, hostname } = await loadPage(slug);

  if (!page || page.pageType === 'home' || page.blocks.length === 0) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          pathname: `/${slug}`,
          title: page.seo.metaTitle ?? page.title ?? SEO_FALLBACK_TITLE,
          description: page.seo.metaDescription ?? SEO_FALLBACK_DESCRIPTION,
          hostname,
        })}
      />
      <BlockRenderer blocks={page.blocks} />
    </>
  );
}
