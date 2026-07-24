import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { Container } from '@omnia/ui';

import { PartnerCard } from '@/components/partners/PartnerCard';
import { PartnerSearchForm } from '@/components/partners/PartnerSearchForm';
import {
  fetchPartnerCategories,
  fetchPartnerSpecialties,
  fetchPublicPartners,
} from '@/lib/cms-partners';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/parceiros',
    title: 'Rede de Parceiros',
    description:
      'Encontre empresas e profissionais de refrigeração aprovados na Rede de Parceiros Omnia Frigo.',
    hostname,
  });
}

export default async function ParceirosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = first(sp.q);
  const city = first(sp.city);
  const state = first(sp.state);
  const category = first(sp.category);
  const specialty = first(sp.specialty);
  const partnerType = first(sp.partnerType);
  const lat = first(sp.lat);
  const lng = first(sp.lng);
  const radiusKm = first(sp.radiusKm);
  const page = Number(first(sp.page) || 1) || 1;

  const [categories, specialties, data] = await Promise.all([
    fetchPartnerCategories(),
    fetchPartnerSpecialties(),
    fetchPublicPartners({
      page,
      q,
      city,
      state,
      category,
      specialty,
      partnerType,
      lat: lat != null ? Number(lat) : undefined,
      lng: lng != null ? Number(lng) : undefined,
      radiusKm: radiusKm != null ? Number(radiusKm) : undefined,
    }),
  ]);

  const partners = data?.partners ?? [];
  const pagination = data?.pagination;

  return (
    <main className="bg-omnia-white py-10 md:py-14">
      <Container className="space-y-8">
        <header className="max-w-3xl space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-omnia-deep-blue md:text-4xl">
            Rede de Parceiros
          </h1>
          <p className="text-base text-omnia-graphite-light">
            Localize parceiros de refrigeração por proximidade, categoria e especialidade.
          </p>
          <p>
            <Link
              href="/parceiros/cadastro"
              className="text-sm font-medium text-omnia-deep-blue underline-offset-4 hover:underline"
            >
              Seja um parceiro
            </Link>
          </p>
        </header>

        <Suspense fallback={<div className="h-40 animate-pulse bg-omnia-deep-blue/5" />}>
          <PartnerSearchForm categories={categories} specialties={specialties} />
        </Suspense>

        {!data ? (
          <p role="alert" className="text-sm text-omnia-graphite-light">
            Não foi possível carregar os parceiros no momento. Tente novamente em instantes.
          </p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-omnia-graphite-light">
            Nenhum parceiro encontrado com os filtros atuais.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {partners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <nav aria-label="Paginação" className="flex gap-3 text-sm">
            {pagination.page > 1 ? (
              <Link href={`/parceiros?page=${pagination.page - 1}`} className="underline">
                Anterior
              </Link>
            ) : null}
            <span>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            {pagination.hasNextPage ? (
              <Link href={`/parceiros?page=${pagination.page + 1}`} className="underline">
                Próxima
              </Link>
            ) : null}
          </nav>
        ) : null}
      </Container>
    </main>
  );
}
