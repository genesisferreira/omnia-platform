import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PARTNER_WHATSAPP_PREFILL, buildWhatsAppUrl } from '@omnia/shared';
import { Button, Container } from '@omnia/ui';

import { TrustIndicators } from '@/components/partners/TrustIndicators';
import { fetchPublicPartnerBySlug } from '@/lib/cms-partners';
import { buildNotFoundMetadata, buildPageMetadata } from '@/lib/seo';
import { getSiteContext } from '@/lib/site-context';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { hostname } = await getSiteContext();
  const partner = await fetchPublicPartnerBySlug(slug);
  if (!partner) {
    return buildNotFoundMetadata();
  }

  const description =
    partner.description?.slice(0, 160) ||
    `${partner.displayName} — parceiro Omnia Frigo em ${[partner.city, partner.state].filter(Boolean).join('/')}.`;

  return buildPageMetadata({
    pathname: `/parceiros/${partner.slug}`,
    title: partner.displayName,
    description,
    hostname,
    image: partner.logo ? { url: partner.logo.url, alt: partner.logo.alt } : null,
  });
}

export default async function PartnerProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const partner = await fetchPublicPartnerBySlug(slug);
  if (!partner) {
    notFound();
  }

  const wa = buildWhatsAppUrl(partner.whatsapp, PARTNER_WHATSAPP_PREFILL);
  const location = [partner.city, partner.state].filter(Boolean).join(' / ');

  return (
    <main className="bg-omnia-white py-10 md:py-14">
      <Container className="max-w-4xl space-y-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-omnia-deep-blue/10 bg-omnia-deep-blue/5">
            {partner.logo?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.logo.url}
                alt={partner.logo.alt || partner.displayName}
                className="h-full w-full object-contain p-2"
                width={96}
                height={96}
              />
            ) : (
              <span className="font-heading text-3xl font-semibold text-omnia-deep-blue">
                {partner.displayName.slice(0, 1)}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-omnia-deep-blue">
              {partner.displayName}
            </h1>
            {partner.tradeName && partner.tradeName !== partner.companyName ? (
              <p className="text-sm text-omnia-graphite-light">{partner.companyName}</p>
            ) : null}
            <p className="text-sm text-omnia-graphite-light">
              {partner.partnerType === 'professional' ? 'Profissional' : 'Empresa'}
              {location ? ` · ${location}` : ''}
            </p>
            <TrustIndicators partner={partner} />
          </div>
        </header>

        {partner.description ? (
          <section aria-labelledby="about-heading" className="space-y-2">
            <h2
              id="about-heading"
              className="font-heading text-xl font-semibold text-omnia-deep-blue"
            >
              Sobre
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-omnia-graphite-light">
              {partner.description}
            </p>
          </section>
        ) : null}

        <section aria-labelledby="coverage-heading" className="space-y-2">
          <h2
            id="coverage-heading"
            className="font-heading text-xl font-semibold text-omnia-deep-blue"
          >
            Área de atendimento
          </h2>
          <p className="text-sm text-omnia-graphite-light">
            {partner.showFullAddress && partner.addressLine
              ? partner.addressLine
              : location || 'Localização sob consulta'}
            {partner.coverageRadius != null ? ` · Raio de ${partner.coverageRadius} km` : ''}
          </p>
          {partner.serviceCities.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-sm">
              {partner.serviceCities.map((c) => (
                <li
                  key={`${c.city}-${c.state}`}
                  className="border border-omnia-deep-blue/10 px-2 py-1"
                >
                  {[c.city, c.state].filter(Boolean).join('/')}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {partner.categories.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue">Categorias</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {partner.categories.map((c) => (
                <li key={c.id} className="border border-omnia-deep-blue/10 px-2 py-1">
                  {c.name}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {partner.specialties.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue">
              Especialidades
            </h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {partner.specialties.map((s) => (
                <li key={s.id} className="border border-omnia-deep-blue/10 px-2 py-1">
                  {s.name}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {partner.servicesDescription ? (
          <section className="space-y-2">
            <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue">Serviços</h2>
            <p className="whitespace-pre-line text-sm text-omnia-graphite-light">
              {partner.servicesDescription}
            </p>
          </section>
        ) : null}

        {partner.brandsServed.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue">
              Marcas atendidas
            </h2>
            <p className="text-sm text-omnia-graphite-light">{partner.brandsServed.join(', ')}</p>
          </section>
        ) : null}

        {partner.gallery.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-omnia-deep-blue">Galeria</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {partner.gallery.map((item) => (
                <figure
                  key={item.image.id}
                  className="overflow-hidden border border-omnia-deep-blue/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image.url}
                    alt={item.caption || item.image.alt || partner.displayName}
                    className="aspect-video w-full object-cover"
                  />
                  {item.caption ? (
                    <figcaption className="p-2 text-xs text-omnia-graphite-light">
                      {item.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-wrap gap-3 border-t border-omnia-deep-blue/10 pt-6">
          {wa ? (
            <Button asChild>
              <a href={wa} target="_blank" rel="noopener noreferrer">
                Solicitar orçamento (WhatsApp)
              </a>
            </Button>
          ) : partner.phone ? (
            <Button asChild>
              <a href={`tel:${partner.phone}`}>Ligar</a>
            </Button>
          ) : partner.website ? (
            <Button asChild>
              <a href={partner.website} target="_blank" rel="noopener noreferrer">
                Visitar site
              </a>
            </Button>
          ) : (
            <p className="text-sm text-omnia-graphite-light">
              Canal de contato indisponível no momento.
            </p>
          )}
          {partner.website ? (
            <Button asChild variant="outline">
              <a href={partner.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </Button>
          ) : null}
          {partner.social.instagram ? (
            <Button asChild variant="outline">
              <a href={partner.social.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </Button>
          ) : null}
          {partner.social.linkedin ? (
            <Button asChild variant="outline">
              <a href={partner.social.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </Button>
          ) : null}
        </section>

        <p>
          <Link href="/parceiros" className="text-sm text-omnia-deep-blue underline">
            Voltar à busca de parceiros
          </Link>
        </p>
      </Container>
    </main>
  );
}
