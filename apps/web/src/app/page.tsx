import type { Metadata } from 'next';
import { cache } from 'react';

import { BlockRenderer } from '@/components/home/BlockRenderer';
import { CompanyCards } from '@/components/home/CompanyCards';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { Hero } from '@/components/home/Hero';
import { fetchCompanies, fetchGlobalSettings, fetchPublicPage } from '@/lib/cms';
import { getSiteContext } from '@/lib/site-context';

const FALLBACK_TITLE = 'Omnia Frigo Holding';
const FALLBACK_DESCRIPTION = 'Tradição, Educação e Inteligência Artificial em Refrigeração.';

/**
 * Deduplica resolve-site + public-page entre generateMetadata e a página
 * na mesma renderização RSC. Não compartilha entre hosts/sites diferentes.
 */
const loadHomePage = cache(async () => {
  const siteContext = await getSiteContext();
  if (!siteContext.resolution.ok) {
    return null;
  }

  return fetchPublicPage(siteContext.resolution.context.site.slug, 'home');
});

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadHomePage();
  if (!page) {
    return {
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
    };
  }

  const title = page.seo.metaTitle ?? page.title ?? FALLBACK_TITLE;
  const description = page.seo.metaDescription ?? FALLBACK_DESCRIPTION;

  return {
    title,
    description,
    ...(page.seo.canonicalUrl ? { alternates: { canonical: page.seo.canonicalUrl } } : {}),
    ...(page.seo.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
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
  const page = await loadHomePage();

  if (!page || page.blocks.length === 0) {
    return <FallbackHome />;
  }

  return <BlockRenderer blocks={page.blocks} />;
}
