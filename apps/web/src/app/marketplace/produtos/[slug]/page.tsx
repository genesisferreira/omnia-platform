import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatPriceCents } from '@omnia/shared';
import { Container } from '@omnia/ui';

import { ListingMedia } from '@/components/marketplace/ListingMedia';
import { QuoteRequestForm } from '@/components/marketplace/QuoteRequestForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { getAdminLoginUrl } from '@/lib/auth/admin-url';
import { getSessionToken } from '@/lib/auth/session';
import { fetchPublicMarketplaceListing } from '@/lib/marketplace/client';
import { PRICE_MODE_LABELS } from '@/lib/marketplace/labels';
import { buildPageMetadata, type JsonLdRecord } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await fetchPublicMarketplaceListing('product', slug);
  const { hostname } = await getSiteContext();
  if (!item) {
    return buildPageMetadata({
      pathname: `/marketplace/produtos/${slug}`,
      title: 'Produto',
      description: 'Anúncio do marketplace Omnia Frigo.',
      hostname,
      seo: { metaTitle: null, metaDescription: null, canonicalUrl: null, noIndex: true },
    });
  }
  return buildPageMetadata({
    pathname: `/marketplace/produtos/${item.publicSlug}`,
    title: item.title,
    description:
      item.description?.slice(0, 160) ||
      `Produto de ${item.partner.displayName} no marketplace Omnia.`,
    hostname,
  });
}

export default async function MarketplaceProdutoDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = await fetchPublicMarketplaceListing('product', slug);
  if (!item) notFound();

  const token = await getSessionToken();
  const loginUrl = getAdminLoginUrl(`/marketplace/produtos/${item.publicSlug}`);
  const priceLabel =
    item.priceMode === 'on_request' || item.priceCents == null
      ? PRICE_MODE_LABELS.on_request
      : `${PRICE_MODE_LABELS[item.priceMode] ?? ''} ${formatPriceCents(item.priceCents)}`.trim();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.title,
    description: item.description || undefined,
    brand: item.brand || undefined,
    image: item.images.length > 0 ? item.images.map((image) => image.url) : undefined,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'BRL',
      ...(item.priceCents != null ? { price: (item.priceCents / 100).toFixed(2) } : {}),
    },
  };

  return (
    <Container className="py-10 md:py-14">
      <JsonLd data={jsonLd as JsonLdRecord} />
      <p className="mb-4 text-sm text-omnia-emerald">
        <Link href="/marketplace/produtos" className="underline">
          Produtos
        </Link>
      </p>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <article className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold text-omnia-deep-blue">{item.title}</h1>
          <p className="text-sm text-omnia-graphite-light">
            Fornecedor:{' '}
            <Link
              href={`/parceiros/${item.partner.slug}`}
              className="text-omnia-deep-blue underline"
            >
              {item.partner.displayName}
            </Link>
          </p>
          <p className="text-lg font-medium text-omnia-deep-blue">{priceLabel}</p>
          <ListingMedia item={item} />
          {item.description ? (
            <div className="whitespace-pre-wrap text-omnia-graphite">{item.description}</div>
          ) : null}
        </article>
        <aside>
          {token ? (
            <QuoteRequestForm
              partnerId={item.partner.id}
              sourceType="product"
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
