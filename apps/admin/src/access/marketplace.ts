import type { Access, CollectionSlug, Payload, Where } from 'payload';

import {
  MEMBERSHIP_ROLE_VALUES,
  roleHasCapability,
  type MembershipRole,
  type PartnerCapability,
} from '@omnia/shared';

import { getRelationId, hasStaffAccess } from './rbac';

type Id = string | number;

export type PartnerMembershipRef = { partnerId: Id; role: MembershipRole };

const MEMBERSHIPS_SLUG = 'partner-memberships' as CollectionSlug;

function normalizeUserId(userId: unknown): Id | null {
  return typeof userId === 'string' || typeof userId === 'number' ? userId : null;
}

/** Lookup interno (overrideAccess) das associações ativas do usuário. */
export async function getActiveMemberships(
  payload: Payload,
  userId: unknown,
): Promise<PartnerMembershipRef[]> {
  const id = normalizeUserId(userId);
  if (id == null) return [];

  const result = await payload.find({
    collection: MEMBERSHIPS_SLUG,
    where: {
      and: [{ user: { equals: id } }, { status: { equals: 'active' } }],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  const refs: PartnerMembershipRef[] = [];
  for (const doc of result.docs as unknown as Array<Record<string, unknown>>) {
    const partnerId = getRelationId(doc.partner);
    const role = doc.role;
    if (
      partnerId != null &&
      typeof role === 'string' &&
      (MEMBERSHIP_ROLE_VALUES as readonly string[]).includes(role)
    ) {
      refs.push({ partnerId, role: role as MembershipRole });
    }
  }
  return refs;
}

export async function getActivePartnerIds(payload: Payload, userId: unknown): Promise<Id[]> {
  const refs = await getActiveMemberships(payload, userId);
  return [...new Set(refs.map((ref) => ref.partnerId))];
}

export async function getPartnerIdsWithCapability(
  payload: Payload,
  userId: unknown,
  capability: PartnerCapability,
): Promise<Id[]> {
  const refs = await getActiveMemberships(payload, userId);
  return [
    ...new Set(
      refs.filter((ref) => roleHasCapability(ref.role, capability)).map((ref) => ref.partnerId),
    ),
  ];
}

export async function hasPartnerCapability(
  payload: Payload,
  userId: unknown,
  partnerId: unknown,
  capability: PartnerCapability,
): Promise<boolean> {
  const target = getRelationId(partnerId);
  if (target == null) return false;
  const refs = await getActiveMemberships(payload, userId);
  return refs.some(
    (ref) => String(ref.partnerId) === String(target) && roleHasCapability(ref.role, capability),
  );
}

function partnerIn(field: string, ids: Id[]): Where {
  return { [field]: { in: ids } };
}

/**
 * Acesso por associação: staff total; parceiro restrito aos próprios `partner`.
 * Retorna `Where` para read/update/delete.
 */
export function partnerMembershipScopedAccess(
  capability: PartnerCapability,
  partnerField = 'partner',
): Access {
  return async ({ req: { user, payload } }) => {
    if (!user) return false;
    if (hasStaffAccess(user)) return true;
    const ids = await getPartnerIdsWithCapability(payload, user.id, capability);
    if (ids.length === 0) return false;
    return partnerIn(partnerField, ids);
  };
}

/** Create: verifica a associação contra `data.partner` (Where não se aplica a create). */
export function partnerMembershipCreateAccess(
  capability: PartnerCapability,
  partnerField = 'partner',
): Access {
  return async ({ req: { user, payload }, data }) => {
    if (!user) return false;
    if (hasStaffAccess(user)) return true;
    const partnerId = getRelationId((data as Record<string, unknown> | undefined)?.[partnerField]);
    if (partnerId == null) return false;
    return hasPartnerCapability(payload, user.id, partnerId, capability);
  };
}

export type QuoteScopedReadOptions = {
  buyerField?: string | null;
  partnerField?: string;
  buyerExtraWhere?: Where;
};

/**
 * Leitura de cotações: staff total; comprador vê as próprias; parceiro vê as da(s) sua(s) empresa(s).
 * `buyerExtraWhere` restringe o que o comprador enxerga (ex.: propostas ainda em rascunho).
 */
export function quoteScopedReadAccess(options: QuoteScopedReadOptions = {}): Access {
  const buyerField = options.buyerField === undefined ? 'buyerUser' : options.buyerField;
  const partnerField = options.partnerField ?? 'partner';

  return async ({ req: { user, payload } }) => {
    if (!user) return false;
    if (hasStaffAccess(user)) return true;

    const clauses: Where[] = [];
    if (buyerField) {
      const buyerWhere: Where = { [buyerField]: { equals: user.id } };
      clauses.push(
        options.buyerExtraWhere ? { and: [buyerWhere, options.buyerExtraWhere] } : buyerWhere,
      );
    }
    const ids = await getActivePartnerIds(payload, user.id);
    if (ids.length > 0) clauses.push(partnerIn(partnerField, ids));

    const [first] = clauses;
    if (!first) return false;
    return clauses.length === 1 ? first : { or: clauses };
  };
}

/** Leitura de `quote-requests`: comprador dono ou parceiro associado. */
export const buyerOrPartnerQuoteAccess: Access = quoteScopedReadAccess();

/** Create de proposta/versão/evento: valida a cotação referenciada (parceiro com edição; comprador opcional). */
export function quoteChildCreateAccess(options: { allowBuyer?: boolean } = {}): Access {
  return async ({ req: { user, payload }, data }) => {
    if (!user) return false;
    if (hasStaffAccess(user)) return true;
    const quoteId = getRelationId((data as Record<string, unknown> | undefined)?.quoteRequest);
    if (quoteId == null) return false;

    let quote: Record<string, unknown> | null = null;
    try {
      quote = (await payload.findByID({
        collection: 'quote-requests' as CollectionSlug,
        id: quoteId,
        depth: 0,
        overrideAccess: true,
      })) as unknown as Record<string, unknown>;
    } catch {
      return false;
    }
    if (!quote) return false;

    if (options.allowBuyer) {
      const buyerId = getRelationId(quote.buyerUser);
      if (buyerId != null && String(buyerId) === String(user.id)) return true;
    }
    return hasPartnerCapability(payload, user.id, quote.partner, 'edit');
  };
}
