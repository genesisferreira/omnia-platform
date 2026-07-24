import Link from 'next/link';

import { Container } from '@omnia/ui';

import { PartnerCard } from '@/components/partners/PartnerCard';
import { fetchPublicPartners } from '@/lib/cms-partners';

/**
 * Seção condicional da Home.
 * Soft-fail: se a API falhar ou não houver parceiros, não renderiza nada.
 */
export async function NearbyPartnersSection() {
  const data = await fetchPublicPartners({ home: true, limit: 4 });
  if (!data || data.partners.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="nearby-partners-heading"
      className="border-t border-omnia-deep-blue/10 bg-omnia-white py-14 md:py-16"
    >
      <Container>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="nearby-partners-heading"
              className="font-heading text-2xl font-semibold tracking-tight text-omnia-deep-blue md:text-3xl"
            >
              Parceiros próximos de você
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-omnia-graphite-light md:text-base">
              Rede de empresas e profissionais de refrigeração aprovados pela Omnia Frigo.
            </p>
          </div>
          <Link
            href="/parceiros"
            className="text-sm font-medium text-omnia-deep-blue underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
          >
            Ver todos os parceiros
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      </Container>
    </section>
  );
}
