import Link from 'next/link';

import type { PublicCompaniesBlockDto } from '@omnia/shared';
import { Container, SectionTitle } from '@omnia/ui';

import type { CmsCompany } from '@/lib/cms';
import { fetchCompanies } from '@/lib/cms';

type CompanyCardsProps = {
  companies: CmsCompany[];
  title?: string | null;
  subtitle?: string | null;
  showRole?: boolean;
  showDescription?: boolean;
  layout?: PublicCompaniesBlockDto['layout'];
};

/** Diferencia papéis só com a paleta oficial (borda + badge). */
const roleTone = (role: string): { badge: string; accent: string } => {
  const normalized = role.trim().toLowerCase();

  if (normalized === 'holding') {
    return {
      badge: 'border-omnia-deep-blue/25 bg-omnia-deep-blue/5 text-omnia-deep-blue',
      accent: 'from-omnia-deep-blue',
    };
  }
  if (normalized === 'tecnologia') {
    return {
      badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700',
      accent: 'from-cyan-600',
    };
  }
  if (normalized === 'engenharia') {
    return {
      badge: 'border-teal-700/30 bg-teal-700/10 text-teal-800',
      accent: 'from-teal-700',
    };
  }
  if (normalized === 'formação técnica' || normalized === 'formacao tecnica') {
    return {
      badge: 'border-omnia-graphite/30 bg-omnia-graphite/10 text-omnia-graphite',
      accent: 'from-omnia-graphite',
    };
  }
  if (normalized === 'educação' || normalized === 'educacao') {
    return {
      badge: 'border-omnia-emerald/30 bg-omnia-emerald/10 text-omnia-emerald',
      accent: 'from-omnia-emerald',
    };
  }
  if (normalized === 'serviços' || normalized === 'servicos') {
    return {
      badge: 'border-omnia-emerald/25 bg-omnia-emerald/[0.06] text-omnia-emerald',
      accent: 'from-omnia-emerald',
    };
  }

  return {
    badge: 'border-omnia-graphite-light/40 bg-omnia-graphite/[0.03] text-omnia-graphite',
    accent: 'from-omnia-graphite-light',
  };
};

export function CompanyCards({
  companies,
  title = 'Empresas do ecossistema',
  subtitle = 'Conheça as frentes complementares da Omnia Frigo Holding.',
  showRole = true,
  showDescription = true,
  layout = 'grid',
}: CompanyCardsProps) {
  const gridClass =
    layout === 'list'
      ? 'mt-12 grid gap-4 md:grid-cols-1'
      : 'mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-2';

  return (
    <section
      id="empresas"
      className="relative scroll-mt-20 border-t border-omnia-deep-blue/10 bg-omnia-graphite/[0.03] py-20 md:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(14,45,77,0.08) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <Container className="relative">
        <SectionTitle
          title={title ?? 'Empresas do ecossistema'}
          subtitle={subtitle ?? undefined}
          align="center"
        />

        {companies.length === 0 ? (
          <p className="mt-12 text-center text-omnia-graphite-light">
            Nenhuma empresa cadastrada ainda. Execute o seed no admin ou cadastre via Payload CMS.
          </p>
        ) : (
          <div className={gridClass}>
            {companies.map((company) => {
              const tone = roleTone(company.ecosystemRole);
              const href = `/empresas/${company.portalSlug || company.slug}`;

              return (
                <article
                  key={company.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-omnia-deep-blue/10 bg-omnia-white transition-[border-color,box-shadow] duration-200 hover:border-omnia-emerald/30 hover:shadow-[0_16px_32px_-24px_rgba(14,45,77,0.45)] focus-within:border-omnia-emerald/40 focus-within:ring-2 focus-within:ring-omnia-emerald/25 motion-reduce:transition-none"
                >
                  <div
                    aria-hidden="true"
                    className={`h-1 w-full bg-gradient-to-r ${tone.accent} to-transparent opacity-80`}
                  />

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading text-lg font-semibold leading-snug tracking-tight text-omnia-deep-blue">
                        <Link href={href} className="hover:text-omnia-emerald">
                          {company.name}
                        </Link>
                      </h3>
                      {showRole ? (
                        <span
                          className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tone.badge}`}
                        >
                          {company.ecosystemRole}
                        </span>
                      ) : null}
                    </div>

                    {showDescription ? (
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-omnia-graphite-light">
                        {company.positioning ?? company.shortDescription}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-omnia-deep-blue/10 pt-4">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-omnia-emerald transition-colors hover:text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald focus-visible:ring-offset-2"
                      >
                        Ver página
                        <span aria-hidden="true">→</span>
                      </Link>
                      {company.externalSite ? (
                        <a
                          href={company.externalSite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-omnia-copper transition-colors hover:text-omnia-deep-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-copper focus-visible:ring-offset-2"
                        >
                          Site oficial
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/contato"
            className="inline-flex h-11 items-center rounded-md bg-omnia-deep-blue px-5 text-sm font-medium text-omnia-white hover:bg-omnia-deep-blue/90"
          >
            Falar com a Holding
          </Link>
        </div>
      </Container>
    </section>
  );
}

type CompaniesBlockProps = {
  block: PublicCompaniesBlockDto;
};

/** Busca empresas via endpoint público existente (não REST Companies). */
export async function CompaniesBlockView({ block }: CompaniesBlockProps) {
  const companies = await fetchCompanies(block.limit);
  return (
    <CompanyCards
      companies={companies}
      title={block.title}
      subtitle={block.subtitle}
      showRole={block.showRole}
      showDescription={block.showDescription}
      layout={block.layout}
    />
  );
}
