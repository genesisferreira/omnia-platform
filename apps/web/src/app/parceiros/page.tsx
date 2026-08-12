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
  const postalCode = first(sp.postalCode) || first(sp.zipCode);
  const nearCity = first(sp.nearCity);
  const nearState = first(sp.nearState);
  const category = first(sp.category);
  const specialty = first(sp.specialty);
  const partnerType = first(sp.partnerType);
  const lat = first(sp.lat);
  const lng = first(sp.lng);
  const radiusKm = first(sp.radiusKm);
  const includeOutside = first(sp.includeOutsideRadius) === '1';
  const page = Number(first(sp.page) || 1) || 1;

  const hasCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    !(Number(lat) === 0 && Number(lng) === 0);
  const hasLocationOrigin = hasCoords || Boolean(postalCode) || Boolean(nearCity && nearState);

  const [categories, specialties, data] = await Promise.all([
    fetchPartnerCategories(),
    fetchPartnerSpecialties(),
    fetchPublicPartners({
      page,
      q,
      city,
      state,
      postalCode,
      nearCity,
      nearState,
      category,
      specialty,
      partnerType,
      lat: hasCoords ? Number(lat) : undefined,
      lng: hasCoords ? Number(lng) : undefined,
      radiusKm: radiusKm != null ? Number(radiusKm) : undefined,
      includeOutsideRadius: includeOutside,
    }),
  ]);

  const partners = data?.partners ?? [];
  const pagination = data?.pagination;
  const originSource = data?.meta?.originSource ?? null;

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

        {!hasLocationOrigin ? (
          <p className="text-sm text-omnia-graphite-light" role="status">
            Sem localização: resultados por destaque e nome. Informe CEP, cidade/UF ou permita GPS
            para ordenar por proximidade.
          </p>
        ) : originSource ? (
          <p className="text-sm text-omnia-graphite-light" role="status">
            Ordenando por proximidade
            {originSource === 'gps'
              ? ' (GPS)'
              : originSource === 'postalCode'
                ? ' (CEP)'
                : ' (cidade)'}
            .
          </p>
        ) : null}

        {!data ? (
          <p role="alert" className="text-sm text-omnia-graphite-light">
            Não foi possível carregar os parceiros no momento. Tente novamente em instantes.
          </p>
        ) : partners.length === 0 ? (
          <div className="space-y-2 text-sm text-omnia-graphite-light">
            <p>
              {hasLocationOrigin
                ? 'Nenhum parceiro próximo encontrado com o raio atual.'
                : 'Nenhum parceiro encontrado com os filtros atuais.'}
            </p>
            {hasLocationOrigin && !includeOutside ? (
              <p>
                <Link
                  href={`/parceiros?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(postalCode ? { postalCode } : {}),
                    ...(nearCity ? { nearCity } : {}),
                    ...(nearState ? { nearState } : {}),
                    ...(hasCoords && lat && lng ? { lat, lng } : {}),
                    ...(radiusKm ? { radiusKm } : {}),
                    ...(category ? { category } : {}),
                    ...(specialty ? { specialty } : {}),
                    ...(partnerType ? { partnerType } : {}),
                    includeOutsideRadius: '1',
                  }).toString()}`}
                  className="font-medium text-omnia-deep-blue underline-offset-4 hover:underline"
                >
                  Ver parceiros de outras regiões
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            {includeOutside && hasLocationOrigin ? (
              <p className="text-sm text-omnia-copper" role="status">
                Exibindo também parceiros de outras regiões (fora do raio ou sem coordenadas).
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          </>
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
