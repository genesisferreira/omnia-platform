import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@omnia/ui';

import { ListingCard } from '@/components/marketplace/ListingCard';
import { fetchPublicMarketplaceListings } from '@/lib/marketplace/client';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/marketplace/produtos',
    title: 'Produtos no Marketplace',
    description:
      'Catálogo público de produtos de refrigeração e climatização de parceiros aprovados.',
    hostname,
  });
}

export default async function MarketplaceProdutosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = first(sp.q);
  const category = first(sp.category);
  const brand = first(sp.brand);
  const page = Math.max(1, Number(first(sp.page) || 1) || 1);
  const data = await fetchPublicMarketplaceListings('product', {
    q,
    category,
    brand,
    page,
    limit: 24,
  });

  return (
    <Container className="py-10 md:py-14">
      <header className="mb-8 space-y-2">
        <p className="text-sm text-omnia-emerald">
          <Link href="/marketplace" className="underline">
            Marketplace
          </Link>{' '}
          / Produtos
        </p>
        <h1 className="font-heading text-3xl font-semibold text-omnia-deep-blue">Produtos</h1>
        <form className="flex flex-wrap gap-2 pt-2" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar"
            className="h-10 rounded-md border px-3 text-sm"
          />
          <input
            name="category"
            defaultValue={category}
            placeholder="Categoria"
            className="h-10 rounded-md border px-3 text-sm"
          />
          <input
            name="brand"
            defaultValue={brand}
            placeholder="Marca"
            className="h-10 rounded-md border px-3 text-sm"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-omnia-deep-blue px-4 text-sm text-white"
          >
            Filtrar
          </button>
        </form>
      </header>
      {!data ? (
        <p className="text-sm text-omnia-graphite-light">
          Catálogo temporariamente indisponível. Tente novamente em instantes.
        </p>
      ) : data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-omnia-deep-blue/20 p-6 text-sm text-omnia-graphite">
          <p className="font-medium text-omnia-deep-blue">Nenhum produto encontrado.</p>
          <p className="mt-1">
            Ajuste os filtros ou{' '}
            <Link href="/marketplace/projeto" className="underline">
              descreva o que precisa
            </Link>{' '}
            para receber propostas.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <li key={item.id} className="relative">
              <ListingCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
