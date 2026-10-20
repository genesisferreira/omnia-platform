import type { Metadata } from 'next';
import Link from 'next/link';

import { Button, Container } from '@omnia/ui';

import { ListingCard } from '@/components/marketplace/ListingCard';
import { fetchPublicMarketplaceListings } from '@/lib/marketplace/client';
import type { PublicMarketplaceListingDto } from '@/lib/marketplace/types';
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

const ENTRIES = [
  {
    href: '/marketplace/produtos',
    title: 'Produtos',
    text: 'Compressores, evaporadores, componentes e peças de fornecedores aprovados.',
  },
  {
    href: '/marketplace/servicos',
    title: 'Serviços',
    text: 'Instalação, manutenção, projetos e assistência técnica por região.',
  },
  {
    href: '/marketplace/projeto',
    title: 'Tenho um projeto',
    text: 'Descreva a necessidade e receba propostas de um parceiro especializado.',
  },
] as const;

const BUYER_STEPS = [
  'Encontre o produto ou serviço, ou descreva seu projeto.',
  'Envie a solicitação com quantidade, local e prazo.',
  'Receba propostas versionadas e compare as condições.',
  'Aceite, peça ajustes ou recuse em Minhas cotações.',
] as const;

/** Fornecedores distintos entre os anúncios exibidos (todos já aprovados e publicados). */
function suppliersOf(lists: Array<PublicMarketplaceListingDto[] | undefined>) {
  const seen = new Map<string, PublicMarketplaceListingDto['partner']>();
  for (const list of lists) for (const item of list ?? []) seen.set(item.partner.id, item.partner);
  return [...seen.values()].slice(0, 8);
}

function EmptyShelf({ kind }: { kind: 'produtos' | 'serviços' }) {
  return (
    <div className="rounded-lg border border-dashed border-omnia-deep-blue/20 p-6 text-sm text-omnia-graphite">
      <p className="font-medium text-omnia-deep-blue">Ainda não há {kind} publicados.</p>
      <p className="mt-1">
        Precisa de algo específico?{' '}
        <Link href="/marketplace/projeto" className="text-omnia-deep-blue underline">
          Descreva seu projeto
        </Link>{' '}
        e um parceiro da rede responde. Fornece {kind}?{' '}
        <Link href="/marketplace/seja-um-fornecedor" className="text-omnia-emerald underline">
          Quero vender no Marketplace
        </Link>
        .
      </p>
    </div>
  );
}

export default async function MarketplaceHubPage() {
  const [products, services] = await Promise.all([
    fetchPublicMarketplaceListings('product', { limit: 4 }),
    fetchPublicMarketplaceListings('service', { limit: 4 }),
  ]);
  const suppliers = suppliersOf([products?.items, services?.items]);

  return (
    <>
      <section className="border-b border-omnia-deep-blue/10 bg-gradient-to-b from-omnia-emerald/5 to-transparent">
        <Container className="grid gap-10 py-12 md:py-16 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-omnia-emerald">
              Marketplace B2B
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-omnia-deep-blue md:text-5xl">
              Equipamentos, peças e serviços para o mercado do frio
            </h1>
            <p className="max-w-2xl text-lg text-omnia-graphite">
              Fornecedores aprovados pela Omnia Frigo, anúncios técnicos moderados e orçamentos com
              registro no portal — da peça avulsa ao projeto completo.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/marketplace/produtos">Encontrar fornecedores</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/marketplace/projeto">Solicitar orçamento de projeto</Link>
              </Button>
            </div>
          </div>
          <aside className="rounded-xl border border-omnia-emerald/30 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-omnia-emerald">
              Para fornecedores
            </p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-omnia-deep-blue">
              Quero vender no Marketplace
            </h2>
            <p className="mt-2 text-sm text-omnia-graphite">
              Divulgue produtos e serviços para compradores do setor e responda solicitações pelo
              painel do fornecedor. Participação sujeita a análise.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild>
                <Link href="/marketplace/seja-um-fornecedor">Quero vender no Marketplace</Link>
              </Button>
              <Link
                href="/parceiros/cadastro"
                className="text-center text-sm text-omnia-deep-blue underline"
              >
                Seja um parceiro Omnia Frigo
              </Link>
            </div>
          </aside>
        </Container>
      </section>

      <Container className="space-y-14 py-12 md:py-14">
        <section aria-label="Navegar pelo marketplace">
          <ul className="grid gap-4 md:grid-cols-3">
            {ENTRIES.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="block h-full rounded-lg border border-omnia-deep-blue/10 bg-white p-5 transition-colors hover:border-omnia-emerald/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
                >
                  <p className="font-heading text-lg font-semibold text-omnia-deep-blue">
                    {entry.title} →
                  </p>
                  <p className="mt-1 text-sm text-omnia-graphite">{entry.text}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="destaque-produtos">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="destaque-produtos" className="font-heading text-2xl text-omnia-deep-blue">
              Produtos em destaque
            </h2>
            <Link href="/marketplace/produtos" className="text-sm text-omnia-deep-blue underline">
              Ver todos os produtos
            </Link>
          </div>
          {!products ? (
            <p className="text-sm text-omnia-graphite-light">
              Catálogo temporariamente indisponível. Tente novamente em instantes.
            </p>
          ) : products.items.length === 0 ? (
            <EmptyShelf kind="produtos" />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.items.map((item) => (
                <li key={item.id} className="relative">
                  <ListingCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="destaque-servicos">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="destaque-servicos" className="font-heading text-2xl text-omnia-deep-blue">
              Serviços em destaque
            </h2>
            <Link href="/marketplace/servicos" className="text-sm text-omnia-deep-blue underline">
              Ver todos os serviços
            </Link>
          </div>
          {!services ? (
            <p className="text-sm text-omnia-graphite-light">
              Catálogo temporariamente indisponível. Tente novamente em instantes.
            </p>
          ) : services.items.length === 0 ? (
            <EmptyShelf kind="serviços" />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.items.map((item) => (
                <li key={item.id} className="relative">
                  <ListingCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {suppliers.length > 0 ? (
          <section aria-labelledby="fornecedores">
            <h2 id="fornecedores" className="mb-4 font-heading text-2xl text-omnia-deep-blue">
              Fornecedores aprovados
            </h2>
            <ul className="flex flex-wrap gap-3">
              {suppliers.map((partner) => (
                <li key={partner.id}>
                  <Link
                    href={`/parceiros/${partner.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-omnia-deep-blue/15 bg-white px-4 py-2 text-sm text-omnia-deep-blue hover:border-omnia-emerald/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
                  >
                    {partner.displayName}
                    {partner.verified ? (
                      <span className="text-xs text-omnia-emerald">verificado</span>
                    ) : null}
                    {partner.city ? (
                      <span className="text-xs text-omnia-graphite-light">
                        {partner.city}
                        {partner.state ? `/${partner.state}` : ''}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          aria-labelledby="como-comprar"
          className="rounded-xl bg-omnia-deep-blue/5 p-6 md:p-8"
        >
          <h2 id="como-comprar" className="mb-4 font-heading text-2xl text-omnia-deep-blue">
            Como funciona para compradores
          </h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {BUYER_STEPS.map((step, index) => (
              <li key={step} className="text-sm text-omnia-graphite">
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-omnia-deep-blue text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-omnia-graphite-light">
            O portal registra solicitações e propostas; não há pagamento online nesta fase.
          </p>
        </section>
      </Container>
    </>
  );
}
