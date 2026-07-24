import Link from 'next/link';

import type { PublicPartnerListItemDto } from '@omnia/shared';

type PartnerCardProps = {
  partner: PublicPartnerListItemDto;
};

export function PartnerCard({ partner }: PartnerCardProps) {
  const location = [partner.city, partner.state].filter(Boolean).join(' / ');
  const categories = partner.categories.slice(0, 2).map((c) => c.name);
  const specialties = partner.specialties.slice(0, 2).map((s) => s.name);

  return (
    <article className="flex h-full flex-col border border-omnia-deep-blue/10 bg-omnia-white p-5 transition-shadow hover:shadow-md motion-reduce:transition-none">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-omnia-deep-blue/10 bg-omnia-deep-blue/5">
          {partner.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.logo.url}
              alt={partner.logo.alt || partner.displayName}
              className="h-full w-full object-contain p-1"
              width={56}
              height={56}
            />
          ) : (
            <span className="font-heading text-lg font-semibold text-omnia-deep-blue" aria-hidden>
              {partner.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold text-omnia-deep-blue truncate">
              {partner.displayName}
            </h3>
            {partner.verified ? (
              <span className="text-xs font-medium text-omnia-emerald">Verificado</span>
            ) : null}
            {partner.featured ? (
              <span className="text-xs font-medium text-omnia-copper">Destaque</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-omnia-graphite-light">
            {partner.partnerType === 'professional' ? 'Profissional' : 'Empresa'}
            {location ? ` · ${location}` : ''}
          </p>
          {partner.distanceKm != null ? (
            <p className="mt-1 text-sm text-omnia-deep-blue">
              A {partner.distanceKm.toFixed(1).replace('.', ',')} km
            </p>
          ) : null}
        </div>
      </div>

      {(categories.length > 0 || specialties.length > 0) && (
        <p className="mt-3 line-clamp-2 text-sm text-omnia-graphite-light">
          {[...categories, ...specialties].join(' · ')}
        </p>
      )}

      <div className="mt-auto pt-4">
        <Link
          href={`/parceiros/${partner.slug}`}
          className="inline-flex text-sm font-medium text-omnia-deep-blue underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
        >
          Ver perfil
        </Link>
      </div>
    </article>
  );
}
