import type { Metadata } from 'next';
import Link from 'next/link';

import { Button, Container } from '@omnia/ui';

import { fetchPublicMarketplaceListings } from '@/lib/marketplace/client';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/marketplace',
    title: 'Marketplace B2B',
    description:
      'Central de negócios Omnia Frigo: produtos, serviços e solicitações de orçamento em refrigeração e climatização.',
    hostname,
  });
}

export default async function MarketplaceHubPage() {
  const [products, services] = await Promise.all([
    fetchPublicMarketplaceListings('product', { limit: 4 }),
    fetchPublicMarketplaceListings('service', { limit: 4 }),
  ]);

  return (
    <Container className="py-10 md:py-14">
      <header className="mb-10 max-w-3xl space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-omnia-emerald">
          Marketplace B2B
        </p>
        <h1 className="font-heading text-3xl font-semibold text-omnia-deep-blue md:text-4xl">
          Equipamentos, peças e serviços para o mercado do frio
        </h1>
        <p className="text-omnia-graphite">
          Encontre fornecedores aprovados, compare anúncios técnicos e solicite orçamentos com
          registro no portal Omnia Frigo.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/marketplace/produtos">Ver produtos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/marketplace/servicos">Ver serviços</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/marketplace/projeto">Tenho um projeto</Link>
          </Button>
        </div>
      </header>

      <section className="mb-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-heading text-xl text-omnia-deep-blue">Produtos em destaque</h2>
          <Link href="/marketplace/produtos" className="text-sm text-omnia-deep-blue underline">
            Ver todos
          </Link>
        </div>
        {!products || products.items.length === 0 ? (
          <p className="text-sm text-omnia-graphite-light">Nenhum produto publicado no momento.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-omnia-deep-blue/10 p-4">
                <Link
                  href={`/marketplace/produtos/${item.publicSlug}`}
                  className="font-medium text-omnia-deep-blue hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-omnia-graphite-light">{item.partner.displayName}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-heading text-xl text-omnia-deep-blue">Serviços em destaque</h2>
          <Link href="/marketplace/servicos" className="text-sm text-omnia-deep-blue underline">
            Ver todos
          </Link>
        </div>
        {!services || services.items.length === 0 ? (
          <p className="text-sm text-omnia-graphite-light">Nenhum serviço publicado no momento.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-omnia-deep-blue/10 p-4">
                <Link
                  href={`/marketplace/servicos/${item.publicSlug}`}
                  className="font-medium text-omnia-deep-blue hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-omnia-graphite-light">{item.partner.displayName}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
