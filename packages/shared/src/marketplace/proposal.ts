import { isValidPriceCents } from './public';

export const PROPOSAL_MAX_ITEMS = 30;
export const PROPOSAL_MAX_BODY_BYTES = 32 * 1024;

export type ProposalItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type ProposalInput = {
  quoteId: string | number;
  title: string;
  summary: string | null;
  items: ProposalItemInput[];
  discountCents: number;
  shippingCents: number;
  /** ISO 8601 (YYYY-MM-DD ou datetime). */
  validUntil: string | null;
  deliveryDays: number | null;
  paymentTerms: string | null;
  notes: string | null;
};

export type ProposalTotals = {
  subtotalCents: number;
  totalCents: number;
};

export type ValidateProposalResult =
  { ok: true; data: ProposalInput; totals: ProposalTotals } | { ok: false; message: string };

const SCRIPT_RE = /<\s*script|javascript:|on\w+\s*=/i;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function clean(value: unknown, max: number, multiline = false): string | null {
  if (typeof value !== 'string') return null;
  const t = multiline ? value.replace(/\r\n/g, '\n').trim() : value.replace(/\s+/g, ' ').trim();
  if (!t || SCRIPT_RE.test(t)) return null;
  return t.slice(0, max);
}

export function computeProposalTotals(
  items: ReadonlyArray<Pick<ProposalItemInput, 'quantity' | 'unitPriceCents'>>,
  discountCents: number,
  shippingCents: number,
): ProposalTotals | null {
  let subtotal = 0;
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return null;
    if (!isValidPriceCents(item.unitPriceCents)) return null;
    subtotal += item.quantity * item.unitPriceCents;
  }
  if (!Number.isSafeInteger(subtotal)) return null;
  if (!isValidPriceCents(discountCents) || !isValidPriceCents(shippingCents)) return null;
  if (discountCents > subtotal) return null;
  const total = subtotal - discountCents + shippingCents;
  if (!Number.isSafeInteger(total)) return null;
  return { subtotalCents: subtotal, totalCents: total };
}

function optionalCents(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && isValidPriceCents(n) ? n : null;
}

/** Whitelist do corpo de `POST /omnia/marketplace-proposal-send`. Valores monetários em centavos inteiros. */
export function validateProposalBody(
  body: unknown,
  now: Date = new Date(),
): ValidateProposalResult {
  const raw = asRecord(body);
  if (!raw) return { ok: false, message: 'Corpo da proposta inválido.' };

  const quoteRaw = raw.quoteId;
  const quoteId =
    typeof quoteRaw === 'number' && Number.isFinite(quoteRaw) && quoteRaw > 0
      ? quoteRaw
      : typeof quoteRaw === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(quoteRaw.trim())
        ? quoteRaw.trim()
        : null;
  if (quoteId == null) return { ok: false, message: 'Solicitação inválida.' };

  const title = clean(raw.title, 160);
  if (!title) return { ok: false, message: 'Informe o título da proposta.' };

  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    return { ok: false, message: 'Adicione ao menos um item à proposta.' };
  }
  if (raw.items.length > PROPOSAL_MAX_ITEMS) {
    return { ok: false, message: `Máximo de ${PROPOSAL_MAX_ITEMS} itens por proposta.` };
  }
  const items: ProposalItemInput[] = [];
  for (const entry of raw.items) {
    const row = asRecord(entry);
    const description = clean(row?.description, 200);
    const quantity = Number(row?.quantity);
    const unit =
      typeof row?.unitPriceCents === 'string' ? Number(row.unitPriceCents) : row?.unitPriceCents;
    if (!description) return { ok: false, message: 'Todos os itens precisam de descrição.' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      return { ok: false, message: 'Quantidade do item inválida (inteiro maior ou igual a 1).' };
    }
    if (typeof unit !== 'number' || !isValidPriceCents(unit)) {
      return { ok: false, message: 'Preço unitário inválido (centavos inteiros).' };
    }
    items.push({ description, quantity, unitPriceCents: unit });
  }

  const discountCents = optionalCents(raw.discountCents);
  const shippingCents = optionalCents(raw.shippingCents);
  if (discountCents == null) return { ok: false, message: 'Desconto inválido.' };
  if (shippingCents == null) return { ok: false, message: 'Frete inválido.' };

  const totals = computeProposalTotals(items, discountCents, shippingCents);
  if (!totals) return { ok: false, message: 'Desconto maior que o subtotal ou valores inválidos.' };

  let validUntil: string | null = null;
  if (raw.validUntil !== undefined && raw.validUntil !== null && raw.validUntil !== '') {
    const date = typeof raw.validUntil === 'string' ? new Date(raw.validUntil) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return { ok: false, message: 'Data de validade inválida.' };
    }
    if (date.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      return { ok: false, message: 'A validade da proposta não pode estar no passado.' };
    }
    validUntil = date.toISOString();
  }

  let deliveryDays: number | null = null;
  if (raw.deliveryDays !== undefined && raw.deliveryDays !== null && raw.deliveryDays !== '') {
    const n = Number(raw.deliveryDays);
    if (!Number.isInteger(n) || n < 0 || n > 3650) {
      return { ok: false, message: 'Prazo de entrega inválido (dias inteiros).' };
    }
    deliveryDays = n;
  }

  return {
    ok: true,
    totals,
    data: {
      quoteId,
      title,
      summary: clean(raw.summary, 2000, true),
      items,
      discountCents,
      shippingCents,
      validUntil,
      deliveryDays,
      paymentTerms: clean(raw.paymentTerms, 1000, true),
      notes: clean(raw.notes, 2000, true),
    },
  };
}
