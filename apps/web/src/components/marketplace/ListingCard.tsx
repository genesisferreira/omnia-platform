import Link from 'next/link';

import { formatPriceCents } from '@omnia/shared';

import { PRICE_MODE_LABELS } from '@/lib/marketplace/labels';
import type { PublicMarketplaceListingDto } from '@/lib/marketplace/types';

function priceLabel(item: PublicMarketplaceListingDto): string {
  if (item.priceMode === 'on_request' || item.priceCents == null)
    return PRICE_MODE_LABELS.on_request;
  const prefix = item.priceMode === 'starting_at' ? `${PRICE_MODE_LABELS.starting_at} ` : '';
  return `${prefix}${formatPriceCents(item.priceCents)}`;
}

/** Card público de produto/serviço; imagem só quando o anúncio tiver uma liberada. */
export function ListingCard({ item }: { item: PublicMarketplaceListingDto }) {
  const href = `/marketplace/${item.kind === 'product' ? 'produtos' : 'servicos'}/${item.publicSlug}`;
  const image = item.images[0];
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-omnia-deep-blue/10 bg-white transition-shadow hover:shadow-md">
      <div className="aspect-[4/3] bg-gradient-to-br from-omnia-deep-blue/5 to-omnia-emerald/10">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- arquivo do Admin, fora do domínio de otimização
          <img
            src={image.url}
            alt={image.alt ?? item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-medium uppercase tracking-wide text-omnia-deep-blue/40">
            {item.kind === 'product' ? 'Produto' : 'Serviço'}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {item.category ? (
          <p className="text-xs font-medium uppercase tracking-wide text-omnia-emerald">
            {item.category}
          </p>
        ) : null}
        <h3 className="font-medium text-omnia-deep-blue">
          <Link
            href={href}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
          >
            {item.title}
          </Link>
        </h3>
        <p className="text-xs text-omnia-graphite-light">
          {item.partner.displayName}
          {item.partner.verified ? ' · verificado' : ''}
        </p>
        <p className="mt-auto pt-2 text-sm font-medium text-omnia-deep-blue">{priceLabel(item)}</p>
      </div>
    </article>
  );
}
