import type { Metadata } from 'next';
import { cache } from 'react';

import { ContactSection } from '@/components/contact/ContactSection';
import { BlockRenderer } from '@/components/home/BlockRenderer';
import { JsonLd } from '@/components/seo/JsonLd';
import { fetchPublicPage } from '@/lib/cms';
import { buildPageMetadata, buildWebPageJsonLd } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

const CONTACT_TITLE = 'Contato | Omnia Frigo Holding';
const CONTACT_DESCRIPTION =
  'Fale com a Omnia Frigo Holding pelo WhatsApp (31) 2888-0650, pelo e-mail contato@omniafrigoholding.com.br ou pelo formulário: refrigeração, cursos técnicos, automação e parcerias.';

const loadContactPage = cache(async () => {
  const siteContext = await getSiteContext();
  if (!siteContext.resolution.ok) {
    return { page: null, hostname: siteContext.hostname };
  }
  const page = await fetchPublicPage(siteContext.resolution.context.site.slug, 'contato').catch(
    () => null,
  );
  return { page, hostname: siteContext.hostname };
});

export async function generateMetadata(): Promise<Metadata> {
  const { page, hostname } = await loadContactPage();
  return buildPageMetadata({
    pathname: '/contato',
    title: CONTACT_TITLE,
    description: CONTACT_DESCRIPTION,
    seo: page
      ? { ...page.seo, metaTitle: CONTACT_TITLE, metaDescription: CONTACT_DESCRIPTION }
      : null,
    hostname,
  });
}

export default async function ContactPage() {
  const { page, hostname } = await loadContactPage();
  const heroBlocks = (page?.blocks ?? []).filter((block) => block.blockType === 'hero');

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          pathname: '/contato',
          title: CONTACT_TITLE,
          description: CONTACT_DESCRIPTION,
          hostname,
          type: 'ContactPage',
        })}
      />
      {heroBlocks.length > 0 ? <BlockRenderer blocks={heroBlocks} /> : null}
      <ContactSection headingLevel={heroBlocks.length > 0 ? 'h2' : 'h1'} />
    </>
  );
}
