import Link from 'next/link';

import type { PublicCompanyDto } from '@omnia/shared';
import { Container, SectionTitle } from '@omnia/ui';

import { companyThemeTokens } from './company-theme';

type CompanyPageViewProps = {
  company: PublicCompanyDto;
};

export function CompanyPageView({ company }: CompanyPageViewProps) {
  const theme = companyThemeTokens[company.brandTheme];
  const primary = company.primaryCta;
  const secondary = company.secondaryCta;

  return (
    <div className={theme.shell}>
      <section className={`${theme.hero} py-16 md:py-24`}>
        <Container>
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-white">
                  Início
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/empresas" className="hover:text-white">
                  Empresas
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white" aria-current="page">
                {company.name}
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl space-y-5">
            <span
              className={`inline-flex rounded-sm border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${theme.badge}`}
            >
              {company.ecosystemRole}
            </span>
            <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
              {company.name}
            </h1>
            <p className="text-lg text-white/85 md:text-xl">
              {company.positioning ?? company.shortDescription}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {primary ? (
                <a
                  href={primary.href}
                  className={`inline-flex h-11 items-center rounded-md px-5 text-sm font-medium transition-colors ${theme.cta}`}
                  {...(primary.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {primary.label}
                </a>
              ) : null}
              {secondary ? (
                <Link
                  href={secondary.href}
                  className="inline-flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-medium text-white hover:bg-white/10"
                >
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 md:py-20">
        <Container className="space-y-14">
          <div className={`rounded-xl border p-6 md:p-8 ${theme.panel}`}>
            <SectionTitle
              title="Papel no ecossistema"
              subtitle="Como esta empresa complementa a Holding e as demais frentes."
            />
            <p className="mt-6 max-w-3xl text-base leading-relaxed opacity-90">
              {company.positioning ?? company.shortDescription}
            </p>
          </div>

          {(company.institutionalText || company.mission || company.vision) && (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="font-heading text-2xl font-bold tracking-tight">Sobre</h2>
                {company.institutionalText ? (
                  <p className="text-base leading-relaxed opacity-90">
                    {company.institutionalText}
                  </p>
                ) : null}
              </div>
              <div className="space-y-4">
                {company.mission ? (
                  <div className={`rounded-lg border p-4 ${theme.panel}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Missão</h3>
                    <p className="mt-2 text-sm leading-relaxed opacity-90">{company.mission}</p>
                  </div>
                ) : null}
                {company.vision ? (
                  <div className={`rounded-lg border p-4 ${theme.panel}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">Visão</h3>
                    <p className="mt-2 text-sm leading-relaxed opacity-90">{company.vision}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {company.offerings.length > 0 ? (
            <div>
              <SectionTitle
                title="Soluções, serviços e produtos"
                subtitle="Ofertas que sustentam o posicionamento da empresa."
              />
              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {company.offerings.map((item) => (
                  <li key={item.title} className={`rounded-lg border p-4 ${theme.panel}`}>
                    <p className="font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="mt-2 text-sm opacity-80">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {company.differentiators.length > 0 ? (
            <div>
              <SectionTitle
                title="Diferenciais"
                subtitle="O que torna esta frente única no grupo."
              />
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {company.differentiators.map((item) => (
                  <article key={item.title} className={`rounded-lg border p-5 ${theme.panel}`}>
                    <h3 className="font-heading text-lg font-semibold">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-2 text-sm leading-relaxed opacity-85">{item.description}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {company.authorityStats.length > 0 ? (
            <div>
              <SectionTitle title="Números e provas" subtitle="Sinais de autoridade e escala." />
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {company.authorityStats.map((stat) => (
                  <div
                    key={`${stat.value}-${stat.label}`}
                    className={`rounded-lg border p-5 ${theme.panel}`}
                  >
                    <dt className={`font-heading text-3xl font-bold ${theme.accent}`}>
                      {stat.value}
                    </dt>
                    <dd className="mt-1 text-sm opacity-80">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {company.audiences.length > 0 ? (
            <div>
              <SectionTitle
                title="Públicos atendidos"
                subtitle="Para quem esta empresa entrega valor."
              />
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {company.audiences.map((item) => (
                  <li key={item.title} className={`rounded-lg border p-5 ${theme.panel}`}>
                    <p className="font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="mt-2 text-sm opacity-85">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {company.values.length > 0 ? (
            <div>
              <SectionTitle title="Valores" />
              <ul className="mt-6 grid gap-3 md:grid-cols-3">
                {company.values.map((item) => (
                  <li key={item.title} className={`rounded-lg border p-4 ${theme.panel}`}>
                    <p className="font-medium">{item.title}</p>
                    {item.description ? (
                      <p className="mt-2 text-sm opacity-85">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {company.siblings.length > 0 ? (
            <div>
              <SectionTitle
                title="Integração com o ecossistema"
                subtitle="As demais frentes que completam a jornada Omnia Frigo."
              />
              <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {company.siblings.map((sibling) => (
                  <Link
                    key={sibling.id}
                    href={`/empresas/${sibling.portalSlug}`}
                    className={`rounded-lg border p-5 transition-colors hover:border-omnia-emerald/40 ${theme.panel}`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                      {sibling.ecosystemRole}
                    </p>
                    <p className="mt-2 font-heading text-lg font-semibold">{sibling.name}</p>
                    <p className="mt-2 text-sm opacity-80">{sibling.shortDescription}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className={`rounded-xl border p-8 text-center ${theme.panel}`}>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Pronto para conhecer o site oficial?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm opacity-85">
              Esta página apresenta a empresa no hub da Holding. O site oficial permanece a
              experiência completa da marca.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {company.externalSite ? (
                <a
                  href={company.externalSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 items-center rounded-md px-5 text-sm font-medium ${theme.cta}`}
                >
                  Visitar site oficial
                </a>
              ) : null}
              <Link
                href="/empresas"
                className="inline-flex h-11 items-center rounded-md border border-current/20 px-5 text-sm font-medium"
              >
                Voltar ao ecossistema
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
