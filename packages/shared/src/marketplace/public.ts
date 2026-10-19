import { mapPublicPartnerMedia } from '../partners/map';
import { isPartnerPubliclyVisible } from '../partners/publication';
import type { PublicPartnerMediaDto } from '../partners/types';
import {
  MARKETPLACE_CURRENCY,
  PRICE_MODE_VALUES,
  QUOTE_SOURCE_TYPE_VALUES,
  type PriceMode,
  type QuoteSourceType,
} from './constants';

export type MarketplaceListingKind = 'product' | 'service';

export const PUBLIC_MARKETPLACE_LIST_DEFAULT_LIMIT = 12;
export const PUBLIC_MARKETPLACE_LIST_MAX_LIMIT = 48;
export const PUBLIC_MARKETPLACE_QUERY_MAX_LENGTH = 80;

export const MARKETPLACE_QUOTE_RATE_LIMIT_MAX = 10;
export const MARKETPLACE_QUOTE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const MARKETPLACE_QUOTE_MAX_BODY_BYTES = 16 * 1024;

export const MARKETPLACE_PROPOSAL_RATE_LIMIT_MAX = 30;
export const MARKETPLACE_RESPOND_RATE_LIMIT_MAX = 30;
export const MARKETPLACE_MEDIA_RATE_LIMIT_MAX = 60;
export const MARKETPLACE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const MARKETPLACE_QUOTE_DESCRIPTION_MIN = 10;
export const MARKETPLACE_QUOTE_DESCRIPTION_MAX = 4000;

/** Campos internos de listing que NUNCA saem na API pública. */
export const MARKETPLACE_LISTING_PRIVATE_FIELD_KEYS = [
  'status',
  'moderationNotes',
  'createdBy',
  'updatedBy',
  'sku',
  'createdAt',
  'updatedAt',
] as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t === '' ? null : t;
};

const asId = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  return null;
};

const asDateString = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  return asString(value);
};

/**
 * Visibilidade pública: listing `published` E parceiro aprovado + ativo + publicado.
 * `partner` deve ser o documento populado (depth >= 1).
 */
export function isMarketplaceListingPubliclyVisible(
  listing: { status?: unknown } | null | undefined,
  partner: { status?: unknown; active?: unknown; publishedAt?: unknown } | null | undefined,
): boolean {
  if (!listing || !partner) return false;
  if (listing.status !== 'published') return false;
  return isPartnerPubliclyVisible(partner);
}

export type PublicMarketplacePartnerDto = {
  id: string;
  slug: string;
  displayName: string;
  city: string | null;
  state: string | null;
  verified: boolean;
  logo: PublicPartnerMediaDto | null;
};

export type PublicMarketplaceListingDto = {
  id: string;
  kind: MarketplaceListingKind;
  slug: string;
  /** Slug sem ambiguidade entre parceiros: `{slug}-{id}`. Usado nas URLs públicas. */
  publicSlug: string;
  title: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  priceMode: PriceMode;
  priceCents: number | null;
  currency: string;
  images: Array<{ id: string; url: string; alt: string | null }>;
  /** Ficha técnica em PDF, somente quando liberada junto com o anúncio publicado. */
  datasheet: { id: string; url: string; title: string | null } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  partner: PublicMarketplacePartnerDto;
};

export function buildListingPublicSlug(slug: string, id: string | number): string {
  return `${slug}-${id}`;
}

/** Separa `{slug}-{id}`; sem sufixo numérico retorna só o slug (busca por slug). */
export function parseListingPublicSlug(value: string): { slug: string; id: string | null } {
  const trimmed = value.trim().toLowerCase();
  const match = /^(.+)-(\d{1,12})$/.exec(trimmed);
  if (!match) return { slug: trimmed, id: null };
  return { slug: match[1]!, id: match[2]! };
}

function mapListingPartner(raw: unknown): PublicMarketplacePartnerDto | null {
  const doc = asRecord(raw);
  if (!doc || !isPartnerPubliclyVisible(doc)) return null;
  const id = asId(doc.id);
  const slug = asString(doc.slug);
  if (!id || !slug) return null;
  return {
    id,
    slug,
    displayName: asString(doc.tradeName) ?? asString(doc.companyName) ?? 'Parceiro',
    city: asString(doc.city),
    state: asString(doc.state),
    verified: doc.verified === true,
    logo: mapPublicPartnerMedia(doc.logo),
  };
}

/** Arquivo do anúncio liberado para o público. `public: false` explícito nunca sai na API. */
function isPublicListingFile(value: unknown): boolean {
  const doc = asRecord(value);
  return Boolean(doc) && doc!.public !== false;
}

function isPriceMode(value: unknown): value is PriceMode {
  return typeof value === 'string' && (PRICE_MODE_VALUES as readonly string[]).includes(value);
}

/** Mapeia um listing populado para o DTO público; null se não visível/inválido. */
export function mapPublicMarketplaceListing(
  kind: MarketplaceListingKind,
  raw: unknown,
): PublicMarketplaceListingDto | null {
  const doc = asRecord(raw);
  if (!doc) return null;
  const partnerDoc = asRecord(doc.partner);
  if (!isMarketplaceListingPubliclyVisible(doc, partnerDoc)) return null;
  const partner = mapListingPartner(partnerDoc);
  const id = asId(doc.id);
  const slug = asString(doc.slug);
  const title = asString(doc.title);
  if (!partner || !id || !slug || !title) return null;

  const priceMode: PriceMode = isPriceMode(doc.priceMode) ? doc.priceMode : 'on_request';
  const rawPrice = typeof doc.price === 'number' ? doc.price : null;
  const priceCents =
    priceMode !== 'on_request' && rawPrice != null && Number.isInteger(rawPrice) && rawPrice >= 0
      ? rawPrice
      : null;

  const images: PublicMarketplaceListingDto['images'] = [];
  if (Array.isArray(doc.images)) {
    for (const item of doc.images) {
      const row = asRecord(item);
      if (!row || !isPublicListingFile(row.image)) continue;
      const media = mapPublicPartnerMedia(row.image);
      if (!media) continue;
      images.push({ id: media.id, url: media.url, alt: asString(row.alt) ?? media.alt });
    }
  }

  const datasheetDoc = asRecord(doc.datasheet);
  const datasheetUrl = isPublicListingFile(datasheetDoc) ? asString(datasheetDoc?.url) : null;
  const datasheet =
    datasheetDoc && datasheetUrl && datasheetDoc.mimeType === 'application/pdf'
      ? { id: asId(datasheetDoc.id) ?? '', url: datasheetUrl, title: asString(datasheetDoc.alt) }
      : null;

  const seo = asRecord(doc.seo);
  const isProduct = kind === 'product';

  return {
    id,
    kind,
    slug,
    publicSlug: buildListingPublicSlug(slug, id),
    title,
    description: asString(doc.description),
    category: asString(doc.category),
    brand: isProduct ? asString(doc.brand) : null,
    model: isProduct ? asString(doc.model) : null,
    priceMode,
    priceCents,
    currency: MARKETPLACE_CURRENCY,
    images,
    datasheet,
    seoTitle: isProduct ? asString(seo?.title) : null,
    seoDescription: isProduct ? asString(seo?.description) : null,
    publishedAt: asDateString(doc.publishedAt),
    partner,
  };
}

/* ------------------------------ Preço (centavos) ------------------------------ */

export function isValidPriceCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99_999_999_999;
}

/**
 * Converte texto em reais ("1.299,90", "129,9", "129") para centavos inteiros.
 * Retorna null quando inválido (sem arredondar silenciosamente).
 */
export function parseBrlToCents(input: unknown): number | null {
  if (typeof input === 'number') return isValidPriceCents(input) ? input : null;
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[R$\s]/gi, '');
  if (cleaned === '') return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || '0');
  return isValidPriceCents(cents) ? cents : null;
}

/** Centavos -> "1299,90" (sem símbolo), para preencher inputs. */
export function formatCentsForInput(cents: number | null | undefined): string {
  if (cents == null || !isValidPriceCents(cents)) return '';
  const reais = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `${reais},${rest}`;
}

export function formatPriceCents(cents: number | null | undefined): string {
  if (cents == null || !isValidPriceCents(cents)) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: MARKETPLACE_CURRENCY,
  }).format(cents / 100);
}

export function describePrice(
  priceMode: PriceMode | string | null | undefined,
  priceCents: number | null | undefined,
): string {
  if (priceMode === 'fixed' && priceCents != null) return formatPriceCents(priceCents);
  if (priceMode === 'starting_at' && priceCents != null) {
    return `A partir de ${formatPriceCents(priceCents)}`;
  }
  return 'Sob consulta';
}

/* ------------------------------ Solicitação de cotação ------------------------------ */

export type QuoteRequestInput = {
  partnerId: string | number | null;
  sourceType: QuoteSourceType;
  listingId: string | number | null;
  description: string;
  quantity: number | null;
  city: string | null;
  state: string | null;
};

export type ValidateQuoteRequestResult =
  | { ok: true; data: QuoteRequestInput }
  | { ok: false; message: string };

const SCRIPT_RE = /<\s*script|javascript:|on\w+\s*=/i;

function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\s+/g, ' ').trim();
  if (!t || SCRIPT_RE.test(t)) return null;
  return t.slice(0, max);
}

function cleanMultiline(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.replace(/\r\n/g, '\n').trim();
  if (!t || SCRIPT_RE.test(t)) return null;
  return t.slice(0, max);
}

function normalizeRelId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.trim())) return value.trim();
  return null;
}

/** Whitelist do corpo de `POST /omnia/marketplace-quote-request`. */
export function validateQuoteRequestBody(body: unknown): ValidateQuoteRequestResult {
  const raw = asRecord(body);
  if (!raw) return { ok: false, message: 'Corpo da solicitação inválido.' };

  const sourceType = raw.sourceType;
  if (
    typeof sourceType !== 'string' ||
    !(QUOTE_SOURCE_TYPE_VALUES as readonly string[]).includes(sourceType)
  ) {
    return { ok: false, message: 'Origem da solicitação inválida.' };
  }
  const type = sourceType as QuoteSourceType;

  const partnerId = normalizeRelId(raw.partnerId);
  const listingId = normalizeRelId(raw.listingId);

  if (type === 'project' && partnerId == null) {
    return { ok: false, message: 'Selecione o parceiro para o seu projeto.' };
  }
  if (type !== 'project' && listingId == null) {
    return { ok: false, message: 'Selecione o item do catálogo para a cotação.' };
  }

  const description = cleanMultiline(raw.description, MARKETPLACE_QUOTE_DESCRIPTION_MAX);
  if (!description || description.length < MARKETPLACE_QUOTE_DESCRIPTION_MIN) {
    return {
      ok: false,
      message: `Descreva a necessidade (mínimo de ${MARKETPLACE_QUOTE_DESCRIPTION_MIN} caracteres).`,
    };
  }

  let quantity: number | null = null;
  if (raw.quantity !== undefined && raw.quantity !== null && raw.quantity !== '') {
    const n = Number(raw.quantity);
    if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
      return { ok: false, message: 'Quantidade inválida (inteiro maior ou igual a 1).' };
    }
    quantity = n;
  }

  const city = cleanLine(raw.city, 120);
  const stateRaw = cleanLine(raw.state, 8);
  const state = stateRaw ? stateRaw.toUpperCase() : null;
  if (stateRaw && !/^[A-Za-z]{2}$/.test(stateRaw)) {
    return { ok: false, message: 'UF inválida (2 letras).' };
  }

  return {
    ok: true,
    data: {
      partnerId,
      sourceType: type,
      listingId: type === 'project' ? null : listingId,
      description,
      quantity,
      city,
      state,
    },
  };
}

/* ------------------------------ Query pública ------------------------------ */

export type PublicMarketplaceQuery = {
  q: string | null;
  category: string | null;
  brand: string | null;
  page: number;
  limit: number;
};

export function parsePublicMarketplaceQuery(params: URLSearchParams): PublicMarketplaceQuery {
  const text = (key: string): string | null => {
    const value = params.get(key)?.replace(/\s+/g, ' ').trim();
    return value ? value.slice(0, PUBLIC_MARKETPLACE_QUERY_MAX_LENGTH) : null;
  };
  const page = Math.max(1, Math.floor(Number(params.get('page') || 1)) || 1);
  let limit = Math.floor(Number(params.get('limit') || PUBLIC_MARKETPLACE_LIST_DEFAULT_LIMIT));
  if (!Number.isFinite(limit) || limit < 1) limit = PUBLIC_MARKETPLACE_LIST_DEFAULT_LIMIT;
  limit = Math.min(limit, PUBLIC_MARKETPLACE_LIST_MAX_LIMIT);
  return { q: text('q'), category: text('category'), brand: text('brand'), page, limit };
}
