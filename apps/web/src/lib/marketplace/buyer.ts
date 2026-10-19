import type { QuoteStatus } from '@omnia/shared';

import type { QuoteRequestDoc } from './types';

/** Nome do parceiro quando a relação vem populada (depth >= 1). */
export function quotePartnerName(quote: Pick<QuoteRequestDoc, 'partner'>): string {
  const partner = quote.partner;
  if (partner && typeof partner === 'object') {
    return partner.tradeName || partner.companyName || `Parceiro #${partner.id}`;
  }
  return `Parceiro #${partner}`;
}

/** Título do item de catálogo de origem, quando houver. */
export function quoteListingTitle(quote: Pick<QuoteRequestDoc, 'productListing' | 'serviceListing'>): string | null {
  const listing = quote.productListing ?? quote.serviceListing;
  return listing && typeof listing === 'object' && listing.title ? listing.title : null;
}

/** Ações do comprador permitidas pela máquina de estados (espelha o Admin). */
export function buyerActionsFor(status: QuoteStatus, hasSentProposal: boolean) {
  const open = status === 'proposal_sent' || status === 'negotiating';
  return {
    canAccept: open && hasSentProposal,
    canNegotiate: status === 'proposal_sent' && hasSentProposal,
    canDecline: open,
  };
}
