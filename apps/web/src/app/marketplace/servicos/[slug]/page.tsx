import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Container } from '@omnia/ui';

import { ListingMedia } from '@/components/marketplace/ListingMedia';
import { QuoteRequestForm } from '@/components/marketplace/QuoteRequestForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { getAdminLoginUrl } from '@/lib/auth/admin-url';
import { getSessionToken } from '@/lib/auth/session';
import { fetchPublicMarketplaceListing } from '@/lib/marketplace/client';
import { buildPageMetadata, type JsonLdRecord } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await fetchPublicMarketplaceListing('service', slug);
  const { hostname } = await getSiteContext();
  if (!item) {
    return buildPageMetadata({
      pathname: `/marketplace/servicos/${slug}`,
      title: 'Serviço',
      description: 'Anúncio do marketplace Omnia Frigo.',
      hostname,
      seo: { metaTitle: null, metaDescription: null, canonicalUrl: null, noIndex: true },
    });
  }
  return buildPageMetadata({
    pathname: `/marketplace/servicos/${item.publicSlug}`,
    title: item.title,
    description:
      item.description?.slice(0, 160) ||
      `Serviço de ${item.partner.displayName} no marketplace Omnia.`,
    hostname,
  });
}

export default async function MarketplaceServicoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await fetchPublicMarketplaceListing('service', slug);
  if (!item) notFound();

  const token = await getSessionToken();
  const loginUrl = getAdminLoginUrl(`/marketplace/servicos/${item.publicSlug}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: item.title,
    description: item.description || undefined,
    provider: { '@type': 'Organization', name: item.partner.displayName },
  };

  return (
    <Container className="py-10 md:py-14">
      <JsonLd data={jsonLd as JsonLdRecord} />
      <p className="mb-4 text-sm text-omnia-emerald">
        <Link href="/marketplace/servicos" className="underline">
          Serviços
        </Link>
      </p>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <article className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold text-omnia-deep-blue">{item.title}</h1>
          <p className="text-sm text-omnia-graphite-light">
            Prestador:{' '}
            <Link href={`/parceiros/${item.partner.slug}`} className="text-omnia-deep-blue underline">
              {item.partner.displayName}
            </Link>
          </p>
          <ListingMedia item={item} />
          {item.description ? (
            <div className="whitespace-pre-wrap text-omnia-graphite">{item.description}</div>
          ) : null}
        </article>
        <aside>
          {token ? (
            <QuoteRequestForm
              partnerId={item.partner.id}
              sourceType="service"
              listingId={item.id}
              listingTitle={item.title}
            />
          ) : (
            <div className="rounded-lg border border-omnia-deep-blue/10 p-4 text-sm">
              <p className="mb-3 text-omnia-graphite">
                Entre na sua conta Omnia para solicitar orçamento com registro no portal.
              </p>
              <a href={loginUrl} className="font-medium text-omnia-deep-blue underline">
                Fazer login
              </a>
            </div>
          )}
        </aside>
      </div>
    </Container>
  );
}
