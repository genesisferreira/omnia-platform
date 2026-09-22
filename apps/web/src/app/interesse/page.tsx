import type { Metadata } from 'next';

import { Container } from '@omnia/ui';

import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { buildPageMetadata, buildWebPageJsonLd } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';
import { JsonLd } from '@/components/seo/JsonLd';

import { LeadCaptureForm, type PublicOrgOption } from './LeadCaptureForm';

export const dynamic = 'force-dynamic';

const BENEFITS = [
  'Atuação nacional em refrigeração, HVAC-R e eficiência energética',
  'Tecnologia aplicada: Neurofrigo Command IA e Neurofrigo Carga',
  'Educação técnica e especialização profissional com Sapientia',
  'Ecossistema integrado: Holding, Renovação, Fred do Frio e CTE',
];

const INTEREST_PILLARS = [
  { title: 'Engenharia', text: 'Projetos, especificação e performance de sistemas térmicos.' },
  { title: 'Tecnologia', text: 'IA, automação e operação inteligente de ativos frigoríficos.' },
  { title: 'Educação', text: 'Formação técnica alinhada à prática de campo e à indústria.' },
  { title: 'Negócios', text: 'Parcerias, consultoria e soluções para operação em escala.' },
];

async function fetchPublicOrganizations(): Promise<PublicOrgOption[]> {
  try {
    const response = await fetch(`${getAdminBaseUrl()}/api/omnia/public-organizations`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      docs?: Array<{ id?: string | number; name?: string; slug?: string }>;
    } | null;

    if (!response.ok || !payload?.ok || !Array.isArray(payload.docs)) {
      return [];
    }

    return payload.docs
      .map((doc) => {
        if (doc.id == null || !doc.name || !doc.slug) {
          return null;
        }
        return { id: String(doc.id), name: doc.name, slug: doc.slug };
      })
      .filter((entry): entry is PublicOrgOption => entry !== null);
  } catch {
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { hostname } = await getSiteContext();
  return buildPageMetadata({
    pathname: '/interesse',
    title: 'Fale com a Omnia Frigo',
    description:
      'Manifeste interesse no ecossistema Omnia Frigo — refrigeração, engenharia, educação e tecnologia.',
    hostname,
  });
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function InteressePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const organizations = await fetchPublicOrganizations();
  const { hostname } = await getSiteContext();

  const initialQuery = {
    produto: firstParam(params.produto),
    empresa: firstParam(params.empresa),
    origem: firstParam(params.origem),
    utm_source: firstParam(params.utm_source),
    utm_medium: firstParam(params.utm_medium),
    utm_campaign: firstParam(params.utm_campaign),
    utm_content: firstParam(params.utm_content),
    utm_term: firstParam(params.utm_term),
    gclid: firstParam(params.gclid),
    fbclid: firstParam(params.fbclid),
  };

  const webPageLd = buildWebPageJsonLd({
    pathname: '/interesse',
    title: 'Fale com a Omnia Frigo',
    description: 'Landing de pré-cadastro comercial do ecossistema Omnia Frigo Holding.',
    hostname,
  });

  return (
    <>
      <JsonLd data={webPageLd} />

      <section className="relative isolate overflow-hidden bg-omnia-deep-blue text-omnia-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-omnia-deep-blue via-omnia-deep-blue to-omnia-emerald"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-10 h-80 w-80 rounded-full bg-omnia-emerald/30 blur-3xl motion-safe:animate-pulse"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-omnia-copper/20 blur-3xl"
        />
        <Container className="relative py-20 md:py-28">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-omnia-emerald">
            Omnia Frigo Holding
          </p>
          <h1 className="mt-4 max-w-3xl font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Tecnologia, engenharia e educação para a refrigeração brasileira
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-omnia-white/85">
            Conte-nos seu interesse. Nossa equipe comercial responde com a vertical certa do
            ecossistema — sem criar conta nesta etapa.
          </p>
          <div className="mt-8">
            <a
              href="#formulario"
              className="inline-flex items-center rounded-md bg-omnia-emerald px-5 py-3 text-sm font-semibold text-omnia-white transition hover:bg-omnia-emerald/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-omnia-white"
            >
              Quero ser contatado
            </a>
          </div>
        </Container>
      </section>

      <section className="bg-omnia-ice py-16 md:py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-heading text-3xl font-bold text-omnia-deep-blue">
              Proposta de valor
            </h2>
            <p className="mt-3 text-omnia-graphite-light">
              Um grupo nacional que une operação de campo, projetos de engenharia, formação técnica
              e inteligência artificial aplicada à cadeia do frio.
            </p>
          </div>
          <ul className="space-y-3">
            {BENEFITS.map((item) => (
              <li key={item} className="border-l-2 border-omnia-emerald pl-4 text-omnia-graphite">
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <h2 className="font-heading text-3xl font-bold text-omnia-deep-blue">
            Áreas de interesse
          </h2>
          <p className="mt-2 max-w-2xl text-omnia-graphite-light">
            Escolha o foco no formulário. Abaixo, o mapa de atuação do ecossistema.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INTEREST_PILLARS.map((pillar) => (
              <div key={pillar.title} className="space-y-2">
                <h3 className="font-heading text-xl font-semibold text-omnia-deep-blue">
                  {pillar.title}
                </h3>
                <p className="text-sm text-omnia-graphite-light">{pillar.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section id="formulario" className="scroll-mt-24 bg-omnia-ice py-16 md:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <h2 className="font-heading text-3xl font-bold text-omnia-deep-blue">
              Pré-cadastro comercial
            </h2>
            <p className="text-omnia-graphite-light">
              Esta página não cria usuário nem senha. Seu interesse vira contato e lead no CRM para
              qualificação pela equipe Omnia.
            </p>
            <div className="space-y-3 text-sm text-omnia-graphite-light">
              <p>
                <strong className="text-omnia-deep-blue">Autoridade:</strong> décadas de experiência
                em refrigeração industrial e comercial.
              </p>
              <p>
                <strong className="text-omnia-deep-blue">Ecossistema:</strong> Omnia Frigo Holding,
                Renovação Refrigeração, Fred do Frio, CTE, Neurofrigo, Neurofrigo Carga e Sapientia.
              </p>
            </div>
          </div>
          <LeadCaptureForm organizations={organizations} initialQuery={initialQuery} />
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <p className="text-center text-xs text-omnia-graphite-light">
            Ao enviar, você autoriza contato comercial relacionado a esta solicitação. Não
            utilizamos este consentimento para marketing irrestrito. Política vigente registrada na
            captura (versão 2026-07-01).
          </p>
        </Container>
      </section>
    </>
  );
}
