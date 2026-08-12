import type { Metadata } from 'next';

import { Container } from '@omnia/ui';

import { PartnerRegisterForm } from '@/components/partners/PartnerRegisterForm';
import { fetchPartnerCategories, fetchPartnerSpecialties } from '@/lib/cms-partners';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/parceiros/cadastro',
    title: 'Seja um parceiro',
    description:
      'Cadastre sua empresa ou atuação profissional na Rede de Parceiros Omnia Frigo. Publicação após análise.',
    hostname,
    seo: {
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      noIndex: true,
    },
  });
}

export default async function PartnerRegisterPage() {
  const [categories, specialties] = await Promise.all([
    fetchPartnerCategories(),
    fetchPartnerSpecialties(),
  ]);

  return (
    <main className="bg-omnia-white py-10 md:py-14">
      <Container className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-omnia-deep-blue">
            Seja um parceiro
          </h1>
          <p className="text-base text-omnia-graphite-light">
            Envie seu cadastro para análise. A publicação na rede ocorre somente após aprovação da
            equipe Omnia.
          </p>
        </header>
        <PartnerRegisterForm categories={categories} specialties={specialties} />
      </Container>
    </main>
  );
}
