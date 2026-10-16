import { canTransitionListing, isListingStatus, type ListingStatus } from '@omnia/shared';

export type ListingIntent = 'save' | 'submit' | 'draft' | 'archive';

export const LISTING_INTENTS: readonly ListingIntent[] = ['save', 'submit', 'draft', 'archive'];

/** Status em que o parceiro pode alterar o conteúdo (published volta para moderação). */
export const PARTNER_EDITABLE_STATUSES: readonly ListingStatus[] = ['draft', 'rejected', 'published'];

export function isListingIntent(value: unknown): value is ListingIntent {
  return typeof value === 'string' && (LISTING_INTENTS as readonly string[]).includes(value);
}

export type ListingIntentPlan =
  | { ok: true; /** Atualiza os campos de conteúdo? */ writeContent: boolean; status: ListingStatus | undefined }
  | { ok: false; message: string };

/**
 * Traduz a ação do formulário em status inicial/transição.
 * O parceiro só alcança draft / pending / archived — publicar, rejeitar e suspender são da equipe.
 */
export function planListingIntent(
  current: ListingStatus | string | null,
  intent: ListingIntent,
): ListingIntentPlan {
  if (current == null) {
    if (intent === 'draft' || intent === 'save') return { ok: true, writeContent: true, status: 'draft' };
    if (intent === 'submit') return { ok: true, writeContent: true, status: 'pending' };
    return { ok: false, message: 'Ação indisponível para um item novo.' };
  }
  if (!isListingStatus(current)) return { ok: false, message: 'Status atual inválido.' };

  const editable = PARTNER_EDITABLE_STATUSES.includes(current);

  if (intent === 'save') {
    if (!editable) return { ok: false, message: 'Este item não pode ser editado no status atual.' };
    return { ok: true, writeContent: true, status: current === 'published' ? 'pending' : undefined };
  }
  if (intent === 'submit') {
    if (!editable) return { ok: false, message: 'Este item não pode ser enviado para moderação agora.' };
    return { ok: true, writeContent: true, status: 'pending' };
  }
  if (intent === 'draft') {
    if (current === 'draft') return { ok: true, writeContent: false, status: undefined };
    if (!canTransitionListing(current, 'draft')) {
      return { ok: false, message: 'Não é possível voltar este item para rascunho.' };
    }
    return { ok: true, writeContent: false, status: 'draft' };
  }
  if (!canTransitionListing(current, 'archived')) {
    return { ok: false, message: 'Não é possível arquivar este item no status atual.' };
  }
  return { ok: true, writeContent: false, status: 'archived' };
}

/** Ações de status exibidas para o parceiro na tela de edição. */
export function availableStatusIntents(current: ListingStatus | string): ListingIntent[] {
  const out: ListingIntent[] = [];
  if (!isListingStatus(current)) return out;
  if (PARTNER_EDITABLE_STATUSES.includes(current)) out.push('save', 'submit');
  if (current !== 'draft' && canTransitionListing(current, 'draft')) out.push('draft');
  if (canTransitionListing(current, 'archived')) out.push('archive');
  return out;
}
