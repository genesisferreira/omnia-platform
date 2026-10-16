import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';

import {
  LISTING_STATUS_VALUES,
  PROPOSAL_STATUS_VALUES,
  QUOTE_STATUS_VALUES,
  QUOTE_TERMINAL_STATUSES,
  roleHasCapability,
  type MembershipRole,
  type QuoteStatus,
} from '@omnia/shared';

import { getActiveMemberships } from '../access/marketplace';
import { getRelationId, hasStaffAccess } from '../access/rbac';

const COLLECTIONS = {
  products: 'partner-product-listings' as CollectionSlug,
  services: 'partner-service-listings' as CollectionSlug,
  quotes: 'quote-requests' as CollectionSlug,
  proposals: 'quote-proposals' as CollectionSlug,
};

const STATS_MAX_DOCS = 5000;

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const error = (status: number, code: string, message: string): Response =>
  json(status, { ok: false, error: { code, message } });

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** Resumo do parceiro para o painel. Nunca inclui documento, notas internas ou aprovador. */
function mapPartnerSummary(doc: Record<string, unknown>) {
  const id = getRelationId(doc.id);
  return {
    id: id == null ? null : String(id),
    slug: str(doc.slug),
    companyName: str(doc.companyName),
    tradeName: str(doc.tradeName),
    displayName: str(doc.tradeName) ?? str(doc.companyName) ?? 'Parceiro',
    partnerType: doc.partnerType === 'professional' ? 'professional' : 'company',
    status: str(doc.status),
    plan: str(doc.plan) ?? 'free',
    active: doc.active === true,
    verified: doc.verified === true,
    featured: doc.featured === true,
    publishedAt: str(doc.publishedAt),
    city: str(doc.city),
    state: str(doc.state),
    email: str(doc.email),
    phone: str(doc.phone),
    whatsapp: str(doc.whatsapp),
    website: str(doc.website),
    description: str(doc.description),
  };
}

type StatusCounts = { total: number; byStatus: Record<string, number> };

async function tallyByStatus(
  req: PayloadRequest,
  collection: CollectionSlug,
  partnerId: string | number,
  statuses: readonly string[],
): Promise<StatusCounts & { truncated: boolean }> {
  const result = await req.payload.find({
    collection,
    where: { partner: { equals: partnerId } },
    limit: STATS_MAX_DOCS,
    pagination: false,
    depth: 0,
    select: { status: true },
    overrideAccess: true,
  });
  const byStatus: Record<string, number> = Object.fromEntries(statuses.map((s) => [s, 0]));
  for (const doc of result.docs as unknown as Array<{ status?: unknown }>) {
    const status = typeof doc.status === 'string' ? doc.status : 'unknown';
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  const total = result.docs.length;
  return { total, byStatus, truncated: total >= STATS_MAX_DOCS };
}

/**
 * GET /omnia/partner-dashboard?partnerId=&stats=0
 * Requer autenticação + associação ativa (ou staff). Sem `partnerId`, usa a primeira associação.
 * Contadores reais por status; nenhuma métrica estimada.
 */
export const partnerDashboardEndpoint: Endpoint = {
  path: '/omnia/partner-dashboard',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      const user = req.user;
      if (!user) return error(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');

      const url = new URL(req.url || 'http://local', 'http://local');
      const requested = url.searchParams.get('partnerId')?.trim() || null;
      const withStats = url.searchParams.get('stats') !== '0';
      const staff = hasStaffAccess(user);

      const refs = await getActiveMemberships(req.payload, user.id);
      const roleByPartner = new Map<string, MembershipRole>();
      for (const ref of refs) roleByPartner.set(String(ref.partnerId), ref.role);

      if (requested && !staff && !roleByPartner.has(requested)) {
        return error(403, 'FORBIDDEN', 'Você não tem acesso a este parceiro.');
      }

      const partnerIds = [...roleByPartner.keys()];
      const summaries = [];
      for (const id of partnerIds) {
        const doc = (await req.payload
          .findByID({ collection: 'partners', id, depth: 0, overrideAccess: true })
          .catch(() => null)) as unknown as Record<string, unknown> | null;
        if (!doc) continue;
        const role = roleByPartner.get(id)!;
        summaries.push({
          partner: mapPartnerSummary(doc),
          role,
          canEdit: roleHasCapability(role, 'edit'),
          canManage: roleHasCapability(role, 'manage'),
        });
      }

      const selectedId = requested ?? summaries[0]?.partner.id ?? null;
      let selected = summaries.find((entry) => entry.partner.id === selectedId) ?? null;

      if (!selected && staff && requested) {
        const doc = (await req.payload
          .findByID({ collection: 'partners', id: requested, depth: 0, overrideAccess: true })
          .catch(() => null)) as unknown as Record<string, unknown> | null;
        if (!doc) return error(404, 'NOT_FOUND', 'Parceiro não encontrado.');
        selected = {
          partner: mapPartnerSummary(doc),
          role: 'owner',
          canEdit: true,
          canManage: true,
        };
      }

      if (!selected) {
        return json(200, { ok: true, memberships: summaries, selected: null, stats: null });
      }

      let stats: unknown = null;
      if (withStats && selected.partner.id) {
        const partnerId = selected.partner.id;
        const [products, services, quotes, proposals] = await Promise.all([
          tallyByStatus(req, COLLECTIONS.products, partnerId, LISTING_STATUS_VALUES),
          tallyByStatus(req, COLLECTIONS.services, partnerId, LISTING_STATUS_VALUES),
          tallyByStatus(req, COLLECTIONS.quotes, partnerId, QUOTE_STATUS_VALUES),
          tallyByStatus(req, COLLECTIONS.proposals, partnerId, PROPOSAL_STATUS_VALUES),
        ]);
        const terminal = new Set<string>(QUOTE_TERMINAL_STATUSES);
        const open = QUOTE_STATUS_VALUES.filter((s: QuoteStatus) => !terminal.has(s)).reduce(
          (sum, s) => sum + (quotes.byStatus[s] ?? 0),
          0,
        );
        stats = {
          products,
          services,
          quotes: { ...quotes, open },
          proposals,
        };
      }

      return json(200, {
        ok: true,
        memberships: summaries,
        selected,
        stats,
      });
    } catch {
      req.payload.logger.error('partner-dashboard: failed');
      return error(500, 'INTERNAL_ERROR', 'Não foi possível carregar o painel.');
    }
  },
};
