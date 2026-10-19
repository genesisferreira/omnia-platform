'use server';

import { redirect } from 'next/navigation';

import { requirePortalSession } from '@/lib/auth/require-session';
import { createQuoteEvent, getQuoteRequest, relationId, respondToQuote } from '@/lib/marketplace/client';

export type BuyerActionState = { error?: string; message?: string };

const ACTIONS = ['accept', 'decline', 'negotiate'] as const;
type BuyerAction = (typeof ACTIONS)[number];

function text(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim().slice(0, max) : '';
}

/** Confere no servidor que a cotação pertence ao comprador da sessão antes de qualquer escrita. */
async function loadOwnQuote(quoteId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requirePortalSession(`/minhas-cotacoes/${quoteId}`);
  const quote = await getQuoteRequest(quoteId);
  if (!quote.ok) return { ok: false, error: quote.error };
  if (relationId(quote.data.buyerUser) !== String(user.id)) {
    return { ok: false, error: 'Solicitação não encontrada.' };
  }
  return { ok: true };
}

export async function respondQuoteAction(
  quoteId: string,
  _prev: BuyerActionState,
  formData: FormData,
): Promise<BuyerActionState> {
  const action = text(formData, 'action', 20) as BuyerAction;
  if (!ACTIONS.includes(action)) return { error: 'Ação inválida.' };
  const message = text(formData, 'message', 2000);
  if (action === 'negotiate' && message.length < 5) {
    return { error: 'Explique o que precisa ser revisto na proposta.' };
  }

  const own = await loadOwnQuote(quoteId);
  if (!own.ok) return { error: own.error };

  const result = await respondToQuote({ quoteId, action, message: message || undefined });
  if (!result.ok) return { error: result.error };
  redirect(`/minhas-cotacoes/${quoteId}?resposta=${action}`);
}

export async function buyerMessageAction(
  quoteId: string,
  _prev: BuyerActionState,
  formData: FormData,
): Promise<BuyerActionState> {
  const message = text(formData, 'message', 2000);
  if (message.length < 2) return { error: 'Escreva a mensagem.' };

  const own = await loadOwnQuote(quoteId);
  if (!own.ok) return { error: own.error };

  const created = await createQuoteEvent({
    quoteRequest: quoteId,
    type: 'message',
    visibility: 'shared',
    message,
  });
  if (!created.ok) return { error: created.error };
  redirect(`/minhas-cotacoes/${quoteId}?mensagem=ok`);
}
