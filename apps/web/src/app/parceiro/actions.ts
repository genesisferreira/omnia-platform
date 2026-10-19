'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { canTransitionQuote, parseBrlToCents, type QuoteStatus } from '@omnia/shared';

import {
  createListing,
  createQuoteEvent,
  getListing,
  getQuoteRequest,
  relationId,
  sendProposal,
  updateListing,
  updateQuoteRequest,
} from '@/lib/marketplace/client';
import {
  isListingIntent,
  planListingIntent,
  type ListingIntent,
} from '@/lib/marketplace/listing-status';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';
import { PARTNER_COOKIE } from '@/lib/marketplace/selected-partner';
import type { MarketplaceListingKind, PartnerContext } from '@/lib/marketplace/types';

export type ActionState = { error?: string; message?: string };

const ROUTE: Record<MarketplaceListingKind, string> = {
  product: '/parceiro/produtos',
  service: '/parceiro/servicos',
};

const PRICE_MODES = ['fixed', 'starting_at', 'on_request'] as const;

function field(formData: FormData, name: string, max = 500): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function multiline(formData: FormData, name: string, max = 4000): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim().slice(0, max) : '';
}

async function requireEditor(): Promise<
  { ok: true; ctx: PartnerContext; partnerId: string } | { ok: false; error: string }
> {
  const ctx = await requirePartnerContext();
  const selected = ctx.selected;
  if (!selected) return { ok: false, error: 'Nenhuma empresa vinculada à sua conta.' };
  if (!selected.canEdit) return { ok: false, error: 'Seu papel é somente de leitura nesta empresa.' };
  return { ok: true, ctx, partnerId: selected.partner.id };
}

export async function selectPartnerAction(formData: FormData): Promise<void> {
  const ctx = await requirePartnerContext();
  const requested = field(formData, 'partnerId', 64);
  if (ctx.memberships.some((entry) => entry.partner.id === requested)) {
    const store = await cookies();
    store.set(PARTNER_COOKIE, requested, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/parceiro',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  redirect('/parceiro');
}

/* ------------------------------ Produtos / serviços ------------------------------ */

function readListingContent(
  kind: MarketplaceListingKind,
  formData: FormData,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const title = field(formData, 'title', 160);
  if (title.length < 3) return { ok: false, error: 'Informe o título (mínimo de 3 caracteres).' };

  const priceModeRaw = field(formData, 'priceMode', 20);
  const priceMode = (PRICE_MODES as readonly string[]).includes(priceModeRaw) ? priceModeRaw : '';
  if (!priceMode) return { ok: false, error: 'Selecione o modo de preço.' };

  let price: number | null = null;
  if (priceMode !== 'on_request') {
    price = parseBrlToCents(field(formData, 'price', 24));
    if (price == null) {
      return { ok: false, error: 'Informe um preço válido em reais (ex.: 129,90).' };
    }
  }

  const data: Record<string, unknown> = {
    title,
    category: field(formData, 'category', 120) || null,
    description: multiline(formData, 'description', 4000) || null,
    priceMode,
    price,
  };
  if (kind === 'product') {
    data.brand = field(formData, 'brand', 120) || null;
    data.model = field(formData, 'model', 120) || null;
    data.sku = field(formData, 'sku', 80) || null;
  }
  return { ok: true, data };
}

/**
 * Cria (id = null) ou atualiza um produto/serviço do parceiro selecionado.
 * `intent`: save | submit (moderação) | draft | archive. Publicar é exclusivo da equipe Omnia.
 */
export async function saveListingAction(
  kind: MarketplaceListingKind,
  id: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireEditor();
  if (!gate.ok) return { error: gate.error };

  const intentRaw = field(formData, 'intent', 20);
  if (!isListingIntent(intentRaw)) return { error: 'Ação inválida.' };
  const intent: ListingIntent = intentRaw;

  let savedId = id;

  if (id == null) {
    const plan = planListingIntent(null, intent);
    if (!plan.ok) return { error: plan.message };
    const content = readListingContent(kind, formData);
    if (!content.ok) return { error: content.error };
    const created = await createListing(kind, {
      ...content.data,
      partner: gate.partnerId,
      status: plan.status,
    });
    if (!created.ok) return { error: created.error };
    savedId = String(created.data.id);
  } else {
    const current = await getListing(kind, id);
    if (!current.ok) return { error: current.error };
    if (relationId(current.data.partner) !== gate.partnerId) {
      return { error: 'Item não pertence à empresa selecionada.' };
    }
    const plan = planListingIntent(current.data.status, intent);
    if (!plan.ok) return { error: plan.message };

    const patch: Record<string, unknown> = {};
    if (plan.writeContent) {
      const content = readListingContent(kind, formData);
      if (!content.ok) return { error: content.error };
      Object.assign(patch, content.data);
    }
    if (plan.status) patch.status = plan.status;
    if (Object.keys(patch).length > 0) {
      const updated = await updateListing(kind, id, patch);
      if (!updated.ok) return { error: updated.error };
    }
  }

  redirect(`${ROUTE[kind]}/${savedId}?salvo=1`);
}

/** Remove uma imagem da galeria ou a ficha técnica. O Admin torna o arquivo privado de novo. */
export async function removeListingFileAction(
  kind: MarketplaceListingKind,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireEditor();
  if (!gate.ok) return { error: gate.error };
  const target = field(formData, 'target', 20);
  const mediaId = field(formData, 'mediaId', 20);

  const current = await getListing(kind, id);
  if (!current.ok) return { error: current.error };
  if (relationId(current.data.partner) !== gate.partnerId) {
    return { error: 'Item não pertence à empresa selecionada.' };
  }

  let patch: Record<string, unknown>;
  if (target === 'datasheet') {
    patch = { datasheet: null };
  } else if (target === 'image' && /^\d{1,12}$/.test(mediaId)) {
    const images = (current.data.images ?? []).filter((row) => relationId(row.image) !== mediaId);
    patch = { images: images.map((row) => ({ image: relationId(row.image), alt: row.alt ?? undefined })) };
  } else {
    return { error: 'Arquivo inválido.' };
  }
  const updated = await updateListing(kind, id, patch);
  if (!updated.ok) return { error: updated.error };
  redirect(`${ROUTE[kind]}/${id}?arquivo=removido`);
}

/* ------------------------------ Solicitações ------------------------------ */

async function loadOwnQuote(quoteId: string, partnerId: string) {
  const quote = await getQuoteRequest(quoteId);
  if (!quote.ok) return { ok: false as const, error: quote.error };
  if (relationId(quote.data.partner) !== partnerId) {
    return { ok: false as const, error: 'Solicitação não pertence à empresa selecionada.' };
  }
  return { ok: true as const, quote: quote.data };
}

const PARTNER_QUOTE_TARGETS: readonly QuoteStatus[] = ['in_review', 'declined'];

export async function quoteStatusAction(
  quoteId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireEditor();
  if (!gate.ok) return { error: gate.error };

  const target = field(formData, 'status', 20) as QuoteStatus;
  if (!PARTNER_QUOTE_TARGETS.includes(target)) return { error: 'Status inválido.' };

  const loaded = await loadOwnQuote(quoteId, gate.partnerId);
  if (!loaded.ok) return { error: loaded.error };
  const from = loaded.quote.status;
  if (!canTransitionQuote(from, target)) {
    return { error: 'Esta mudança de status não é permitida agora.' };
  }

  const updated = await updateQuoteRequest(quoteId, { status: target });
  if (!updated.ok) return { error: updated.error };
  await createQuoteEvent({
    quoteRequest: quoteId,
    type: 'status_changed',
    visibility: 'shared',
    fromStatus: from,
    toStatus: target,
  });
  redirect(`/parceiro/solicitacoes/${quoteId}?status=ok`);
}

export async function quoteMessageAction(
  quoteId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireEditor();
  if (!gate.ok) return { error: gate.error };

  const message = multiline(formData, 'message', 2000);
  if (message.length < 2) return { error: 'Escreva a mensagem.' };
  const internal = field(formData, 'visibility', 10) === 'internal';

  const loaded = await loadOwnQuote(quoteId, gate.partnerId);
  if (!loaded.ok) return { error: loaded.error };

  const created = await createQuoteEvent({
    quoteRequest: quoteId,
    type: internal ? 'note' : 'message',
    visibility: internal ? 'internal' : 'shared',
    message,
  });
  if (!created.ok) return { error: created.error };
  redirect(`/parceiro/solicitacoes/${quoteId}?mensagem=ok`);
}

/* ------------------------------ Proposta ------------------------------ */

export async function sendProposalAction(
  quoteId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await requireEditor();
  if (!gate.ok) return { error: gate.error };

  const loaded = await loadOwnQuote(quoteId, gate.partnerId);
  if (!loaded.ok) return { error: loaded.error };

  const descriptions = formData.getAll('itemDescription');
  const quantities = formData.getAll('itemQuantity');
  const prices = formData.getAll('itemPrice');
  const items: Array<{ description: string; quantity: number; unitPriceCents: number }> = [];
  for (let index = 0; index < descriptions.length; index += 1) {
    const description = String(descriptions[index] ?? '').trim();
    const rawQuantity = String(quantities[index] ?? '').trim();
    const rawPrice = String(prices[index] ?? '').trim();
    // Linha totalmente vazia é ignorada.
    if (!description && !rawQuantity && !rawPrice) continue;
    const unitPriceCents = parseBrlToCents(rawPrice);
    if (unitPriceCents == null) {
      return { error: `Preço inválido no item ${index + 1} (use reais, ex.: 129,90).` };
    }
    items.push({ description, quantity: Number(rawQuantity), unitPriceCents });
  }

  const optionalMoney = (name: string): { ok: true; value: number } | { ok: false } => {
    const raw = field(formData, name, 24);
    if (!raw) return { ok: true, value: 0 };
    const cents = parseBrlToCents(raw);
    return cents == null ? { ok: false } : { ok: true, value: cents };
  };
  const discount = optionalMoney('discount');
  if (!discount.ok) return { error: 'Desconto inválido (use reais, ex.: 50,00).' };
  const shipping = optionalMoney('shipping');
  if (!shipping.ok) return { error: 'Frete inválido (use reais, ex.: 25,00).' };

  const sent = await sendProposal({
    quoteId,
    title: field(formData, 'title', 160),
    summary: multiline(formData, 'summary', 2000) || undefined,
    items,
    discountCents: discount.value,
    shippingCents: shipping.value,
    validUntil: field(formData, 'validUntil', 30) || undefined,
    deliveryDays: field(formData, 'deliveryDays', 6) || undefined,
    paymentTerms: multiline(formData, 'paymentTerms', 1000) || undefined,
    notes: multiline(formData, 'notes', 2000) || undefined,
  });
  if (!sent.ok) return { error: sent.error };
  redirect(`/parceiro/solicitacoes/${quoteId}?proposta=enviada`);
}
