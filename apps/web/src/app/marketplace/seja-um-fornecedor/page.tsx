import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@omnia/ui';

import { PartnerRegisterForm } from '@/components/partners/PartnerRegisterForm';
import { fetchPartnerCategories, fetchPartnerSpecialties } from '@/lib/cms-partners';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/marketplace/seja-um-fornecedor',
    title: 'Quero vender no Marketplace',
    description:
      'Fornecedores de equipamentos, peças e serviços de refrigeração: solicite participação no Marketplace B2B Omnia Frigo. Cadastro sujeito a análise.',
    hostname,
  });
}

const BENEFITS = [
  {
    title: 'Demanda qualificada',
    text: 'Compradores do mercado do frio pedem orçamento direto pelo portal, com necessidade, quantidade e local descritos.',
  },
  {
    title: 'Vitrine técnica',
    text: 'Produtos e serviços com descrição, fotos e ficha técnica em PDF, moderados pela equipe Omnia.',
  },
  {
    title: 'Propostas organizadas',
    text: 'Envie propostas com itens, condições e validade. Cada versão fica registrada para você e para o comprador.',
  },
  {
    title: 'Ecossistema Omnia Frigo',
    text: 'Presença ao lado das empresas do grupo e da Rede de Parceiros, com perfil público verificado.',
  },
] as const;

const STEPS = [
  'Envie os dados da empresa e o que deseja oferecer.',
  'A equipe Omnia analisa o cadastro. Não há aprovação automática.',
  'Aprovado, o responsável recebe um convite pessoal para acessar o painel do fornecedor.',
  'Cadastre produtos e serviços. Cada anúncio, e cada alteração, passa por moderação antes de ir ao ar.',
  'Receba solicitações de orçamento e responda com propostas pelo painel.',
] as const;

export default async function SejaUmFornecedorPage() {
  const [categories, specialties] = await Promise.all([
    fetchPartnerCategories(),
    fetchPartnerSpecialties(),
  ]);

  return (
    <main className="bg-omnia-white">
      <section className="border-b border-omnia-deep-blue/10 bg-gradient-to-b from-omnia-emerald/5 to-transparent">
        <Container className="max-w-5xl space-y-5 py-12 md:py-16">
          <p className="text-sm font-medium uppercase tracking-wide text-omnia-emerald">
            Marketplace B2B · Fornecedores
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-omnia-deep-blue md:text-5xl">
            Quero vender no Marketplace
          </h1>
          <p className="max-w-3xl text-lg text-omnia-graphite">
            Equipamentos, componentes, peças e serviços de refrigeração e climatização para quem
            compra com critério técnico.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#cadastro"
              className="inline-flex items-center rounded-md bg-omnia-emerald px-5 py-3 text-sm font-semibold text-white hover:bg-omnia-emerald/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2"
            >
              Solicitar participação
            </a>
            <Link
              href="/parceiros/cadastro"
              className="inline-flex items-center rounded-md border border-omnia-deep-blue/20 px-5 py-3 text-sm font-semibold text-omnia-deep-blue hover:bg-omnia-deep-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2"
            >
              Seja um parceiro Omnia Frigo
            </Link>
          </div>
        </Container>
      </section>

      <Container className="max-w-5xl space-y-14 py-12 md:py-16">
        <section aria-labelledby="beneficios">
          <h2
            id="beneficios"
            className="mb-6 font-heading text-2xl font-semibold text-omnia-deep-blue"
          >
            Por que vender aqui
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.title}
                className="rounded-lg border border-omnia-deep-blue/10 bg-white p-5"
              >
                <h3 className="font-heading text-lg text-omnia-deep-blue">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-omnia-graphite">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="como-funciona">
          <h2
            id="como-funciona"
            className="mb-6 font-heading text-2xl font-semibold text-omnia-deep-blue"
          >
            Como funciona
          </h2>
          <ol className="grid gap-4 md:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step} className="rounded-lg border border-omnia-deep-blue/10 bg-white p-4">
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-omnia-deep-blue text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-omnia-graphite">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-omnia-graphite-light">
            Nesta fase não há cobrança, pagamento ou comissão pelo portal. O fechamento comercial é
            feito diretamente entre fornecedor e comprador.
          </p>
        </section>

        <section id="cadastro" aria-labelledby="titulo-cadastro" className="scroll-mt-24 space-y-4">
          <h2
            id="titulo-cadastro"
            className="font-heading text-2xl font-semibold text-omnia-deep-blue"
          >
            Solicitar participação
          </h2>
          <p className="text-sm text-omnia-graphite-light">
            O mesmo cadastro da Rede de Parceiros Omnia Frigo. Campos com * são obrigatórios.
          </p>
          <PartnerRegisterForm
            categories={categories}
            specialties={specialties}
            variant="marketplace"
          />
        </section>
      </Container>
    </main>
  );
}
