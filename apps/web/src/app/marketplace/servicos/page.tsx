import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@omnia/ui';

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
    pathname: '/marketplace/servicos',
    title: 'Serviços no Marketplace',
    description: 'Serviços técnicos de refrigeração e climatização de parceiros aprovados.',
    hostname,
  });
}

export default async function MarketplaceServicosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = first(sp.q);
  const category = first(sp.category);
  const page = Math.max(1, Number(first(sp.page) || 1) || 1);
  const data = await fetchPublicMarketplaceListings('service', { q, category, page, limit: 24 });

  return (
    <Container className="py-10 md:py-14">
      <header className="mb-8 space-y-2">
        <p className="text-sm text-omnia-emerald">
          <Link href="/marketplace" className="underline">
            Marketplace
          </Link>{' '}
          / Serviços
        </p>
        <h1 className="font-heading text-3xl font-semibold text-omnia-deep-blue">Serviços</h1>
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
          <button
            type="submit"
            className="h-10 rounded-md bg-omnia-deep-blue px-4 text-sm text-white"
          >
            Filtrar
          </button>
        </form>
      </header>
      {!data || data.items.length === 0 ? (
        <p className="text-sm text-omnia-graphite-light">Nenhum serviço encontrado.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
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
    </Container>
  );
}
