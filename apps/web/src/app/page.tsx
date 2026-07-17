import type { Metadata } from 'next';
import { cache } from 'react';

import { BlockRenderer } from '@/components/home/BlockRenderer';
import { CompanyCards } from '@/components/home/CompanyCards';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { Hero } from '@/components/home/Hero';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchCompanies, fetchGlobalSettings, fetchPublicPage } from '@/lib/cms';
import {
  buildFallbackMetadata,
  buildPageMetadata,
  buildWebPageJsonLd,
  SEO_FALLBACK_DESCRIPTION,
  SEO_FALLBACK_TITLE,
} from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

/**
 * Deduplica resolve-site + public-page entre generateMetadata e a página
 * na mesma renderização RSC. Não compartilha entre hosts/sites diferentes.
 */
const loadHomePage = cache(async () => {
  const siteContext = await getSiteContext();
  if (!siteContext.resolution.ok) {
    return { page: null, hostname: siteContext.hostname };
  }

  const page = await fetchPublicPage(siteContext.resolution.context.site.slug, 'home');
  return { page, hostname: siteContext.hostname };
});

export async function generateMetadata(): Promise<Metadata> {
  const { page, hostname } = await loadHomePage();
  if (!page) {
    return buildFallbackMetadata(hostname);
  }

  return buildPageMetadata({
    pathname: '/',
    title: page.title,
    description: SEO_FALLBACK_DESCRIPTION,
    seo: page.seo,
    hostname,
  });
}

async function FallbackHome() {
  const [settings, companies] = await Promise.all([fetchGlobalSettings(), fetchCompanies()]);

  return (
    <>
      <Hero settings={settings} />
      <FeaturesSection />
      <CompanyCards companies={companies} />
    </>
  );
}

export default async function HomePage() {
  const { page, hostname } = await loadHomePage();

  const webPageLd = buildWebPageJsonLd({
    pathname: '/',
    title: page?.seo.metaTitle ?? page?.title ?? SEO_FALLBACK_TITLE,
    description: page?.seo.metaDescription ?? SEO_FALLBACK_DESCRIPTION,
    hostname,
  });

  if (!page || page.blocks.length === 0) {
    return (
      <>
        <JsonLd data={webPageLd} />
        <FallbackHome />
      </>
    );
  }

  return (
    <>
      <JsonLd data={webPageLd} />
      <BlockRenderer blocks={page.blocks} />
    </>
  );
}
