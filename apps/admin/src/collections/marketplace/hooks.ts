import { randomBytes } from 'node:crypto';

import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionSlug,
} from 'payload';
import { APIError } from 'payload';

import {
  canTransitionListing,
  canTransitionQuote,
  isQuoteStatus,
  normalizePartnerSlug,
  type ListingStatus,
} from '@omnia/shared';

import { getActiveMemberships } from '../../access/marketplace';
import { getRelationId, hasStaffAccess } from '../../access/rbac';

const PARTNER_LISTING_STATUSES: readonly ListingStatus[] = ['draft', 'pending', 'archived'];

export const listingBeforeValidate: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data;
  const source = data.slug ?? originalDoc?.slug ?? data.title ?? originalDoc?.title;
  const slug = normalizePartnerSlug(source);
  if (slug) data.slug = slug;
  return data;
};

export const listingBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
  collection,
}) => {
  if (!data) return data;
  const user = req.user;
  const staff = hasStaffAccess(user);

  const nextStatus = (data.status ?? originalDoc?.status ?? 'draft') as ListingStatus;
  if (operation === 'create') {
    if (!staff && !PARTNER_LISTING_STATUSES.includes(nextStatus)) {
      throw new APIError('Status inicial inválido para o parceiro.', 403);
    }
    if (user) data.createdBy = user.id;
  } else if (originalDoc?.status && data.status && data.status !== originalDoc.status) {
    if (!canTransitionListing(originalDoc.status, data.status)) {
      throw new APIError(
        `Transição de status inválida: ${originalDoc.status} → ${data.status}.`,
        400,
      );
    }
    if (!staff && !PARTNER_LISTING_STATUSES.includes(data.status as ListingStatus)) {
      throw new APIError('Somente a equipe Omnia pode publicar, rejeitar ou suspender.', 403);
    }
  }
  if (user) data.updatedBy = user.id;

  const priceMode = data.priceMode ?? originalDoc?.priceMode;
  const price = data.price !== undefined ? data.price : originalDoc?.price;
  if (priceMode === 'on_request') {
    data.price = null;
  } else if (priceMode && (price == null || !Number.isInteger(price) || price < 0)) {
    throw new APIError('Informe o preço em centavos (inteiro, maior ou igual a zero).', 400);
  }
  data.currency = 'BRL';

  if (data.status === 'published' && !data.publishedAt && !originalDoc?.publishedAt) {
    data.publishedAt = new Date().toISOString();
  }

  const partnerId = getRelationId(data.partner ?? originalDoc?.partner);
  const slug = data.slug ?? originalDoc?.slug;
  if (partnerId != null && slug) {
    const existing = await req.payload.find({
      collection: collection.slug as CollectionSlug,
      where: {
        and: [
          { partner: { equals: partnerId } },
          { slug: { equals: slug } },
          ...(originalDoc?.id != null ? [{ id: { not_equals: originalDoc.id } }] : []),
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      throw new APIError(`Já existe um item com o slug "${slug}" para este parceiro.`, 400);
    }
  }

  return data;
};

export const membershipBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;
  const user = req.user;
  if (operation === 'create' && user && !data.invitedBy) data.invitedBy = user.id;
  if (!user || hasStaffAccess(user)) return data;

  const targetUserId = getRelationId(data.user ?? originalDoc?.user);
  if (targetUserId != null && String(targetUserId) === String(user.id)) {
    throw new APIError('Não é possível alterar a própria associação.', 403);
  }

  const touchesOwner = data.role === 'owner' || originalDoc?.role === 'owner';
  if (touchesOwner) {
    const partnerId = getRelationId(data.partner ?? originalDoc?.partner);
    const refs = await getActiveMemberships(req.payload, user.id);
    const isOwner = refs.some(
      (ref) => String(ref.partnerId) === String(partnerId) && ref.role === 'owner',
    );
    if (!isOwner) {
      throw new APIError('Somente um proprietário pode atribuir ou alterar proprietários.', 403);
    }
  }

  if (operation === 'update' && originalDoc?.partner && data.partner) {
    if (String(getRelationId(originalDoc.partner)) !== String(getRelationId(data.partner))) {
      throw new APIError('Não é possível mover a associação para outro parceiro.', 403);
    }
  }
  return data;
};

const PUBLIC_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateQuotePublicId(): string {
  const bytes = randomBytes(10);
  let id = '';
  for (const byte of bytes) id += PUBLIC_ID_ALPHABET[byte % PUBLIC_ID_ALPHABET.length];
  return `COT-${id.slice(0, 5)}-${id.slice(5)}`;
}

export const quoteRequestBeforeValidate: CollectionBeforeValidateHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (!data) return data;
  if (operation === 'create' && !data.publicId) data.publicId = generateQuotePublicId();
  if (operation === 'update' && originalDoc?.publicId) data.publicId = originalDoc.publicId;
  return data;
};

export const quoteRequestBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;
  const user = req.user;
  const staff = hasStaffAccess(user);

  if (operation === 'create') {
    if (!staff) {
      if (!user) throw new APIError('Autenticação obrigatória.', 401);
      data.buyerUser = user.id;
      data.status = 'submitted';
    } else if (!data.buyerUser && user) {
      data.buyerUser = user.id;
    }
    data.statusChangedAt = new Date().toISOString();

    const partnerId = getRelationId(data.partner);
    if (partnerId == null) throw new APIError('Parceiro obrigatório.', 400);
    if (!staff) {
      const partner = await req.payload
        .findByID({ collection: 'partners', id: partnerId, depth: 0, overrideAccess: true })
        .catch(() => null);
      if (!partner || partner.status !== 'approved' || partner.active !== true) {
        throw new APIError('Parceiro indisponível para cotações.', 400);
      }
    }

    const listingField =
      data.sourceType === 'product'
        ? 'productListing'
        : data.sourceType === 'service'
          ? 'serviceListing'
          : null;
    if (data.sourceType !== 'product') data.productListing = null;
    if (data.sourceType !== 'service') data.serviceListing = null;
    if (listingField) {
      const listingId = getRelationId(data[listingField]);
      if (listingId == null) {
        throw new APIError('Selecione o item do catálogo para esta solicitação.', 400);
      }
      const listing = await req.payload
        .findByID({
          collection: (listingField === 'productListing'
            ? 'partner-product-listings'
            : 'partner-service-listings') as CollectionSlug,
          id: listingId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null);
      const listingDoc = listing as unknown as Record<string, unknown> | null;
      if (
        !listingDoc ||
        String(getRelationId(listingDoc.partner)) !== String(partnerId) ||
        (!staff && listingDoc.status !== 'published')
      ) {
        throw new APIError('Item do catálogo inválido para o parceiro informado.', 400);
      }
    }
    return data;
  }

  if (originalDoc && data.status && data.status !== originalDoc.status) {
    if (!isQuoteStatus(data.status) || !canTransitionQuote(originalDoc.status, data.status)) {
      throw new APIError(`Transição de status inválida: ${originalDoc.status} → ${data.status}.`, 400);
    }
    if (!staff && data.status === 'accepted') {
      throw new APIError('A aceitação é uma decisão do comprador.', 403);
    }
    data.statusChangedAt = new Date().toISOString();
  }
  return data;
};

/** Proposta/versão/evento: denormaliza parceiro e comprador a partir da cotação (escopo de ACL). */
export const quoteChildBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;

  if (operation === 'update') {
    if (originalDoc?.quoteRequest) data.quoteRequest = originalDoc.quoteRequest;
    return data;
  }

  const quoteId = getRelationId(data.quoteRequest);
  if (quoteId == null) throw new APIError('Cotação obrigatória.', 400);
  const quote = (await req.payload
    .findByID({
      collection: 'quote-requests' as CollectionSlug,
      id: quoteId,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)) as unknown as Record<string, unknown> | null;
  if (!quote) throw new APIError('Cotação não encontrada.', 404);

  data.partner = getRelationId(quote.partner);
  data.buyerUser = getRelationId(quote.buyerUser);
  return data;
};

export const quoteEventBeforeChange: CollectionBeforeChangeHook = async (args) => {
  const data = await quoteChildBeforeChange(args);
  const user = args.req.user;
  if (data && args.operation === 'create' && user && (!data.actor || !hasStaffAccess(user))) {
    data.actor = user.id;
  }
  if (data && args.operation === 'create' && !hasStaffAccess(user)) {
    const buyerId = getRelationId(data.buyerUser);
    const isBuyer = buyerId != null && String(buyerId) === String(user?.id);
    if (isBuyer && data.visibility !== 'shared') data.visibility = 'shared';
  }
  return data;
};
