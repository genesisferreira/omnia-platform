'use server';

import { submitQuoteRequest } from '@/lib/marketplace/client';

export type QuoteActionState = { error?: string; message?: string; publicId?: string };

export async function submitMarketplaceQuoteAction(
  _prev: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const partnerId = String(formData.get('partnerId') ?? '').trim();
  const sourceType = String(formData.get('sourceType') ?? '').trim();
  const listingId = String(formData.get('listingId') ?? '').trim() || undefined;
  const description = String(formData.get('description') ?? '').trim();
  const quantityRaw = String(formData.get('quantity') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim() || undefined;
  const state = String(formData.get('state') ?? '').trim() || undefined;

  if (!partnerId) return { error: 'Selecione o parceiro destinatário.' };
  if (!['product', 'service', 'project'].includes(sourceType)) {
    return { error: 'Tipo de solicitação inválido.' };
  }
  if (description.length < 10) return { error: 'Descreva a necessidade com mais detalhes.' };

  const result = await submitQuoteRequest({
    partnerId,
    sourceType,
    listingId,
    description,
    quantity: quantityRaw ? Number(quantityRaw) : undefined,
    city,
    state,
  });
  if (!result.ok) return { error: result.error };
  return {
    message: 'Solicitação registrada com sucesso.',
    publicId: result.data.quote.publicId ?? undefined,
  };
}
