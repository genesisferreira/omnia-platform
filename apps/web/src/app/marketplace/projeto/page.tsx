import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@omnia/ui';

import { ProjectQuoteForm } from '@/components/marketplace/ProjectQuoteForm';
import { getAdminLoginUrl } from '@/lib/auth/admin-url';
import { getSessionToken } from '@/lib/auth/session';
import { fetchPublicPartners } from '@/lib/cms-partners';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/marketplace/projeto',
    title: 'Tenho um projeto',
    description:
      'Descreva seu projeto de refrigeração ou climatização e solicite orçamento a um parceiro aprovado.',
    hostname,
  });
}

export default async function MarketplaceProjetoPage() {
  const token = await getSessionToken();
  const partners = await fetchPublicPartners({ limit: 48, page: 1 });
  const options =
    partners?.partners.map((partner) => ({
      id: partner.id,
      label: partner.displayName || partner.companyName || partner.slug,
    })) ?? [];

  return (
    <Container className="py-10 md:py-14">
      <header className="mb-8 max-w-2xl space-y-3">
        <p className="text-sm text-omnia-emerald">
          <Link href="/marketplace" className="underline">
            Marketplace
          </Link>{' '}
          / Projeto
        </p>
        <h1 className="font-heading text-3xl font-semibold text-omnia-deep-blue">
          Tenho um projeto
        </h1>
        <p className="text-omnia-graphite">
          Informe a necessidade técnica e escolha um parceiro aprovado. Sem IA nesta fase: o
          formulário estrutura o pré-escopo para cotação registrada no portal.
        </p>
      </header>
      {!token ? (
        <div className="rounded-lg border border-omnia-deep-blue/10 p-4 text-sm">
          <p className="mb-3">É necessário estar autenticado para enviar o projeto.</p>
          <a
            href={getAdminLoginUrl('/marketplace/projeto')}
            className="text-omnia-deep-blue underline"
          >
            Fazer login
          </a>
        </div>
      ) : options.length === 0 ? (
        <p className="text-sm text-omnia-graphite-light">
          Não há parceiros públicos disponíveis no momento.
        </p>
      ) : (
        <ProjectQuoteForm partners={options} />
      )}
    </Container>
  );
}
