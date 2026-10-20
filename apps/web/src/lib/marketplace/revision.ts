import { effectiveRevisionValue, revisionFieldsFor } from '@omnia/shared';

import type { ListingDoc, MarketplaceListingKind } from './types';

/** Anúncio como o parceiro está editando: valores da revisão pendente sobre os publicados. */
export function withPendingRevision(kind: MarketplaceListingKind, listing: ListingDoc): ListingDoc {
  if (listing.revisionStatus !== 'pending' || !listing.pendingRevision?.changes) return listing;
  const merged: Record<string, unknown> = { ...listing };
  const doc = listing as unknown as Record<string, unknown>;
  for (const field of revisionFieldsFor(kind)) {
    if (field in (listing.pendingRevision.changes ?? {}))
      merged[field] = effectiveRevisionValue(doc, field);
  }
  return merged as unknown as ListingDoc;
}
