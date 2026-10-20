import type { PublicMarketplaceListingDto } from '@/lib/marketplace/types';

/** Galeria e ficha técnica públicas (só arquivos liberados pelo Admin chegam aqui). */
export function ListingMedia({ item }: { item: PublicMarketplaceListingDto }) {
  if (item.images.length === 0 && !item.datasheet) return null;
  return (
    <div className="space-y-4">
      {item.images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {item.images.map((image) => (
            <li key={image.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- arquivo do Admin, fora do domínio de otimização */}
              <img
                src={image.url}
                alt={image.alt ?? item.title}
                loading="lazy"
                className="aspect-square w-full rounded-md border border-omnia-deep-blue/10 object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {item.datasheet ? (
        <a
          href={item.datasheet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-omnia-deep-blue underline"
        >
          Baixar ficha técnica (PDF){item.datasheet.title ? ` — ${item.datasheet.title}` : ''}
        </a>
      ) : null}
    </div>
  );
}
