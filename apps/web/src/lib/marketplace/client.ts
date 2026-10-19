import { getAdminBaseUrl } from '@/lib/auth/admin-url';
import { getSessionToken } from '@/lib/auth/session';
import { resolveMediaUrl } from '@/lib/cms-partners';

import type {
  ListingDoc,
  MarketplaceListingKind,
  MembershipDoc,
  PartnerDashboardResponse,
  PaginatedDocs,
  PayloadResult,
  PublicMarketplaceList,
  PublicMarketplaceListingDto,
  PublicMarketplaceQueryInput,
  QuoteEventDoc,
  QuoteProposalDoc,
  QuoteProposalVersionDoc,
  QuoteRequestDoc,
  RelationId,
} from './types';

const LISTING_COLLECTIONS: Record<MarketplaceListingKind, string> = {
  product: 'partner-product-listings',
  service: 'partner-service-listings',
};

const PUBLIC_PATHS: Record<MarketplaceListingKind, { list: string; detail: string }> = {
  product: {
    list: '/api/omnia/public-marketplace-products',
    detail: '/api/omnia/public-marketplace-product',
  },
  service: {
    list: '/api/omnia/public-marketplace-services',
    detail: '/api/omnia/public-marketplace-service',
  },
};

/* ------------------------------ Público (sem sessão) ------------------------------ */

function absolutizeListing(item: PublicMarketplaceListingDto): PublicMarketplaceListingDto {
  return {
    ...item,
    images: item.images.map((image) => ({ ...image, url: resolveMediaUrl(image.url) ?? image.url })),
    datasheet: item.datasheet
      ? { ...item.datasheet, url: resolveMediaUrl(item.datasheet.url) ?? item.datasheet.url }
      : null,
    partner: {
      ...item.partner,
      logo: item.partner.logo
        ? { ...item.partner.logo, url: resolveMediaUrl(item.partner.logo.url) ?? item.partner.logo.url }
        : null,
    },
  };
}

export async function fetchPublicMarketplaceListings(
  kind: MarketplaceListingKind,
  query: PublicMarketplaceQueryInput = {},
): Promise<PublicMarketplaceList | null> {
  try {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.category) params.set('category', query.category);
    if (query.brand && kind === 'product') params.set('brand', query.brand);
    if (query.partner) params.set('partner', query.partner);
    if (query.page && query.page > 1) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const response = await fetch(`${getAdminBaseUrl()}${PUBLIC_PATHS[kind].list}?${params}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as
      | { ok: true; items: PublicMarketplaceListingDto[]; pagination: PublicMarketplaceList['pagination'] }
      | { ok: false };
    if (!data || data.ok !== true) return null;
    return { items: data.items.map(absolutizeListing), pagination: data.pagination };
  } catch {
    return null;
  }
}

export async function fetchPublicMarketplaceListing(
  kind: MarketplaceListingKind,
  publicSlug: string,
): Promise<PublicMarketplaceListingDto | null> {
  try {
    const params = new URLSearchParams({ slug: publicSlug });
    const response = await fetch(`${getAdminBaseUrl()}${PUBLIC_PATHS[kind].detail}?${params}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as
      | { ok: true; item: PublicMarketplaceListingDto }
      | { ok: false };
    if (!data || data.ok !== true) return null;
    return absolutizeListing(data.item);
  } catch {
    return null;
  }
}

/** Todas as páginas publicadas (sitemap). Retorna null se o CMS estiver indisponível. */
export async function fetchAllPublicMarketplaceListings(
  kind: MarketplaceListingKind,
  maxPages = 20,
): Promise<PublicMarketplaceListingDto[] | null> {
  const first = await fetchPublicMarketplaceListings(kind, { page: 1, limit: 48 });
  if (!first) return null;
  const items = [...first.items];
  const pages = Math.min(first.pagination.totalPages, maxPages);
  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchPublicMarketplaceListings(kind, { page, limit: 48 });
    if (!next) break;
    items.push(...next.items);
  }
  return items;
}

/* ------------------------------ Autenticado (JWT do portal) ------------------------------ */

function extractError(status: number, payload: unknown): string {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  // Endpoints Omnia respondem `{ ok:false, code, message }` com texto já pronto para o usuário.
  if (typeof rec?.code === 'string' && typeof rec?.message === 'string' && rec.message) {
    return rec.message;
  }
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para esta ação.';
  const message = typeof rec?.message === 'string' ? rec.message : null;
  const errors = Array.isArray(rec?.errors) ? (rec.errors as Array<Record<string, unknown>>) : [];
  const first = errors[0];
  const nested = Array.isArray((first?.data as Record<string, unknown> | undefined)?.errors)
    ? (((first?.data as Record<string, unknown>).errors as Array<Record<string, unknown>>)[0]?.message as
        | string
        | undefined)
    : undefined;
  const candidate =
    nested ??
    (typeof first?.message === 'string' ? first.message : null) ??
    message ??
    (typeof (rec?.error as Record<string, unknown> | undefined)?.message === 'string'
      ? ((rec?.error as Record<string, unknown>).message as string)
      : null);
  return candidate || 'Não foi possível concluir a operação.';
}

async function authedFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<PayloadResult<T>> {
  const token = options.token ?? (await getSessionToken());
  if (!token) return { ok: false, status: 401, error: extractError(401, null) };
  try {
    const response = await fetch(`${getAdminBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) return { ok: false, status: response.status, error: extractError(response.status, payload) };
    return { ok: true, status: response.status, data: payload as T };
  } catch {
    return { ok: false, status: 503, error: 'Serviço temporariamente indisponível. Tente novamente.' };
  }
}

type QueryValue = string | number | boolean | undefined | null;

/** Constrói `where[campo][op]=valor` do Payload REST. */
export function buildPayloadQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function relationId(value: RelationId | { id: RelationId } | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'object') return String(value.id);
  return String(value);
}

type FindOptions = {
  page?: number;
  limit?: number;
  sort?: string;
  depth?: number;
  where?: Record<string, QueryValue>;
  token?: string | null;
};

function find<T>(collection: string, options: FindOptions = {}): Promise<PayloadResult<PaginatedDocs<T>>> {
  const query = buildPayloadQuery({
    page: options.page,
    limit: options.limit ?? 20,
    sort: options.sort ?? '-updatedAt',
    depth: options.depth ?? 0,
    ...options.where,
  });
  return authedFetch<PaginatedDocs<T>>(`/api/${collection}${query}`, { token: options.token });
}

async function findById<T>(collection: string, id: RelationId, depth = 0): Promise<PayloadResult<T>> {
  return authedFetch<T>(`/api/${collection}/${encodeURIComponent(String(id))}${buildPayloadQuery({ depth })}`);
}

async function create<T>(collection: string, data: unknown): Promise<PayloadResult<T>> {
  const result = await authedFetch<{ doc: T }>(`/api/${collection}`, { method: 'POST', body: data });
  return result.ok ? { ok: true, status: result.status, data: result.data.doc } : result;
}

async function update<T>(collection: string, id: RelationId, data: unknown): Promise<PayloadResult<T>> {
  const result = await authedFetch<{ doc: T }>(`/api/${collection}/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: data,
  });
  return result.ok ? { ok: true, status: result.status, data: result.data.doc } : result;
}

/* Memberships / painel */

export function listMemberships(token?: string | null): Promise<PayloadResult<PaginatedDocs<MembershipDoc>>> {
  return find<MembershipDoc>('partner-memberships', {
    where: { 'where[status][equals]': 'active' },
    limit: 50,
    token,
  });
}

export async function fetchPartnerDashboard(
  options: { partnerId?: string | null; stats?: boolean; token?: string | null } = {},
): Promise<PayloadResult<PartnerDashboardResponse>> {
  const result = await authedFetch<PartnerDashboardResponse & { ok: boolean }>(
    `/api/omnia/partner-dashboard${buildPayloadQuery({
      partnerId: options.partnerId ?? undefined,
      stats: options.stats === false ? '0' : undefined,
    })}`,
    { token: options.token },
  );
  return result;
}

/* Listings */

export type ListingListOptions = {
  partnerId: string;
  status?: string;
  page?: number;
  limit?: number;
};

export function listListings(
  kind: MarketplaceListingKind,
  options: ListingListOptions,
): Promise<PayloadResult<PaginatedDocs<ListingDoc>>> {
  return find<ListingDoc>(LISTING_COLLECTIONS[kind], {
    page: options.page,
    limit: options.limit,
    where: {
      'where[partner][equals]': options.partnerId,
      'where[status][equals]': options.status,
    },
  });
}

export function getListing(kind: MarketplaceListingKind, id: RelationId): Promise<PayloadResult<ListingDoc>> {
  return findById<ListingDoc>(LISTING_COLLECTIONS[kind], id);
}

export function createListing(kind: MarketplaceListingKind, data: Record<string, unknown>) {
  return create<ListingDoc>(LISTING_COLLECTIONS[kind], data);
}

export function updateListing(kind: MarketplaceListingKind, id: RelationId, data: Record<string, unknown>) {
  return update<ListingDoc>(LISTING_COLLECTIONS[kind], id, data);
}

/* Cotações */

export function listQuoteRequests(options: {
  partnerId: string;
  status?: string;
  statuses?: readonly string[];
  page?: number;
  limit?: number;
}): Promise<PayloadResult<PaginatedDocs<QuoteRequestDoc>>> {
  return find<QuoteRequestDoc>('quote-requests', {
    page: options.page,
    limit: options.limit,
    sort: '-createdAt',
    where: {
      'where[partner][equals]': options.partnerId,
      'where[status][equals]': options.status,
      'where[status][in]': options.statuses?.join(','),
    },
  });
}

export function getQuoteRequest(id: RelationId): Promise<PayloadResult<QuoteRequestDoc>> {
  return findById<QuoteRequestDoc>('quote-requests', id, 1);
}

export function updateQuoteRequest(id: RelationId, data: Record<string, unknown>) {
  return update<QuoteRequestDoc>('quote-requests', id, data);
}

export function listQuoteEvents(quoteId: RelationId): Promise<PayloadResult<PaginatedDocs<QuoteEventDoc>>> {
  return find<QuoteEventDoc>('quote-events', {
    limit: 100,
    sort: 'createdAt',
    where: { 'where[quoteRequest][equals]': String(quoteId) },
  });
}

export function createQuoteEvent(data: Record<string, unknown>) {
  return create<QuoteEventDoc>('quote-events', data);
}

/* Propostas */

export function listProposals(options: {
  partnerId: string;
  quoteId?: RelationId;
  page?: number;
  limit?: number;
}): Promise<PayloadResult<PaginatedDocs<QuoteProposalDoc>>> {
  return find<QuoteProposalDoc>('quote-proposals', {
    page: options.page,
    limit: options.limit,
    depth: 1,
    where: {
      'where[partner][equals]': options.partnerId,
      'where[quoteRequest][equals]': options.quoteId != null ? String(options.quoteId) : undefined,
    },
  });
}

export function getProposal(id: RelationId): Promise<PayloadResult<QuoteProposalDoc>> {
  return findById<QuoteProposalDoc>('quote-proposals', id, 1);
}

export function createProposal(data: Record<string, unknown>) {
  return create<QuoteProposalDoc>('quote-proposals', data);
}

export function updateProposal(id: RelationId, data: Record<string, unknown>) {
  return update<QuoteProposalDoc>('quote-proposals', id, data);
}

export function listProposalVersions(
  proposalIds: readonly RelationId[],
): Promise<PayloadResult<PaginatedDocs<QuoteProposalVersionDoc>>> {
  return find<QuoteProposalVersionDoc>('quote-proposal-versions', {
    limit: 200,
    sort: '-versionNumber',
    where: { 'where[proposal][in]': proposalIds.map(String).join(',') || '0' },
  });
}

export function createProposalVersion(data: Record<string, unknown>) {
  return create<QuoteProposalVersionDoc>('quote-proposal-versions', data);
}

/** Envio atômico (proposta + versão + status + eventos) pelo endpoint do Admin. */
export function sendProposal(body: Record<string, unknown>) {
  return authedFetch<{
    ok: true;
    message: string;
    proposal: { id: RelationId; versionNumber: number; totalCents: number };
    quote: { id: RelationId; status: string };
  }>('/api/omnia/marketplace-proposal-send', { method: 'POST', body });
}

/* Comprador */

/** Cotações do próprio comprador (a ACL do Admin já restringe; o filtro evita misturar com as do parceiro). */
export function listBuyerQuoteRequests(options: {
  buyerId: string;
  page?: number;
  limit?: number;
}): Promise<PayloadResult<PaginatedDocs<QuoteRequestDoc>>> {
  return find<QuoteRequestDoc>('quote-requests', {
    page: options.page,
    limit: options.limit ?? 20,
    sort: '-createdAt',
    depth: 1,
    where: { 'where[buyerUser][equals]': options.buyerId },
  });
}

/** Propostas visíveis ao comprador (rascunhos ficam ocultos pela ACL). */
export function listBuyerProposals(quoteId: RelationId): Promise<PayloadResult<PaginatedDocs<QuoteProposalDoc>>> {
  return find<QuoteProposalDoc>('quote-proposals', {
    limit: 20,
    sort: '-createdAt',
    where: { 'where[quoteRequest][equals]': String(quoteId) },
  });
}

export function respondToQuote(body: { quoteId: string; action: 'accept' | 'decline' | 'negotiate'; message?: string }) {
  return authedFetch<{
    ok: true;
    message: string;
    quote: { id: RelationId; publicId: string | null; status: string };
  }>('/api/omnia/marketplace-quote-respond', { method: 'POST', body });
}

/** Cotação criada pelo comprador autenticado (valida e aplica rate limit no Admin). */
export function submitQuoteRequest(body: Record<string, unknown>) {
  return authedFetch<{
    ok: true;
    message: string;
    quote: { id: RelationId; publicId: string | null; status: string };
  }>('/api/omnia/marketplace-quote-request', { method: 'POST', body });
}
