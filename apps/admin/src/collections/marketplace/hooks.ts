import { randomBytes } from 'node:crypto';

import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionSlug,
} from 'payload';
import { APIError } from 'payload';

import {
  canChangeMembershipRole,
  canTransitionListing,
  canTransitionQuote,
  diffListingRevision,
  isQuoteStatus,
  normalizePartnerSlug,
  requiresRevision,
  revisionFieldsFor,
  revisionPatchFrom,
  type ListingKind,
  type ListingStatus,
  type MembershipRole,
  type QuoteStatus,
  type RevisionChanges,
} from '@omnia/shared';

import { getActiveMemberships } from '../../access/marketplace';
import { getRelationId, hasStaffAccess } from '../../access/rbac';
import { recordMarketplaceAudit } from './MarketplaceAuditEvents';

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

  await assertListingFilesBelongToPartner(req, partnerId, data, originalDoc);
  await applyListingRevisionRules({
    data,
    operation,
    originalDoc,
    req,
    kind: collection.slug === 'partner-product-listings' ? 'product' : 'service',
    partnerId,
  });
  return data;
};

const REVISION_META_FIELDS = [
  'revisionStatus',
  'pendingRevision',
  'revisionSubmittedAt',
  'revisionSubmittedBy',
  'revisionNotes',
] as const;

type PendingRevision = {
  changes: RevisionChanges;
  submittedAt: string;
  submittedBy: string | number | null;
};

function pendingOf(doc: Record<string, unknown> | undefined): PendingRevision | null {
  const value = doc?.pendingRevision;
  if (!value || typeof value !== 'object') return null;
  const changes = (value as { changes?: unknown }).changes;
  if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) return null;
  return value as PendingRevision;
}

/** Ids de relação vindos do JSON da revisão voltam a número (ids seriais do Postgres). */
function relationValue(value: unknown): unknown {
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  if (Array.isArray(value)) {
    return value.map((row) =>
      row && typeof row === 'object'
        ? {
            ...(row as Record<string, unknown>),
            image: relationValue((row as Record<string, unknown>).image),
          }
        : row,
    );
  }
  return value;
}

function applyPendingInto(data: Record<string, unknown>, pending: PendingRevision): void {
  const patch = revisionPatchFrom(pending.changes);
  for (const [field, value] of Object.entries(patch)) {
    data[field] = field === 'images' || field === 'datasheet' ? relationValue(value) : value;
  }
}

/**
 * Anúncio publicado/suspenso: edições do parceiro vão para `pendingRevision` (o conteúdo público
 * não muda). Staff aprova (`revisionStatus = approved`) ou rejeita (`rejected` + notas).
 */
async function applyListingRevisionRules(args: {
  data: Record<string, unknown>;
  operation: string;
  originalDoc: Record<string, unknown> | undefined;
  req: Parameters<CollectionBeforeChangeHook>[0]['req'];
  kind: ListingKind;
  partnerId: string | number | null;
}): Promise<void> {
  const { data, operation, originalDoc, req, kind, partnerId } = args;
  const staff = hasStaffAccess(req.user);
  const collectionSlug =
    kind === 'product' ? 'partner-product-listings' : 'partner-service-listings';

  if (!staff) {
    for (const field of REVISION_META_FIELDS) delete data[field];
  }
  if (operation !== 'update' || !originalDoc) return;
  const pending = pendingOf(originalDoc);
  const now = new Date().toISOString();

  if (staff) {
    const decision = data.revisionStatus;
    if (decision === 'approved') {
      if (!pending) throw new APIError('Não há revisão pendente para aprovar.', 400);
      applyPendingInto(data, pending);
      await assertListingFilesBelongToPartner(req, partnerId, data, originalDoc);
      data.pendingRevision = null;
      data.revisionStatus = 'none';
      await recordMarketplaceAudit(req, {
        type: 'listing_revision_approved',
        partner: partnerId,
        subjectUser: pending.submittedBy,
        targetCollection: collectionSlug,
        targetId: originalDoc.id,
        data: { changes: pending.changes, notes: data.revisionNotes ?? null },
      });
    } else if (decision === 'rejected' && originalDoc.revisionStatus === 'pending') {
      const notes = typeof data.revisionNotes === 'string' ? data.revisionNotes.trim() : '';
      if (notes.length < 5) throw new APIError('Informe o motivo da rejeição da revisão.', 400);
      data.pendingRevision = null;
      await recordMarketplaceAudit(req, {
        type: 'listing_revision_rejected',
        partner: partnerId,
        subjectUser: pending?.submittedBy ?? null,
        targetCollection: collectionSlug,
        targetId: originalDoc.id,
        data: { changes: pending?.changes ?? {}, notes },
      });
    }
    return;
  }

  const nextStatus = (data.status ?? originalDoc.status) as ListingStatus;
  // Saiu do ar por decisão do parceiro (rascunho/moderação/arquivado): a revisão vira o conteúdo
  // e passa pela moderação normal na próxima publicação.
  if (!requiresRevision(nextStatus)) {
    if (pending) {
      const incoming = { ...data };
      applyPendingInto(data, pending);
      Object.assign(data, incoming);
      data.pendingRevision = null;
      data.revisionStatus = 'none';
    }
    return;
  }
  if (!requiresRevision(originalDoc.status)) return;

  const changes = diffListingRevision(kind, originalDoc, data);
  const merged: RevisionChanges = { ...(pending?.changes ?? {}) };
  for (const field of revisionFieldsFor(kind)) {
    if (!(field in data)) continue;
    if (changes[field]) merged[field] = changes[field];
    else delete merged[field];
    delete data[field];
  }
  const touched = Object.keys(changes).length > 0;
  if (Object.keys(merged).length === 0) {
    if (pending) {
      data.pendingRevision = null;
      data.revisionStatus = 'none';
    }
    return;
  }
  if (!touched && pending) return;
  data.pendingRevision = { changes: merged, submittedAt: now, submittedBy: req.user?.id ?? null };
  data.revisionStatus = 'pending';
  data.revisionSubmittedAt = now;
  data.revisionSubmittedBy = req.user?.id ?? null;
  data.revisionNotes = null;
  await recordMarketplaceAudit(req, {
    type: 'listing_revision_submitted',
    partner: partnerId,
    subjectUser: req.user?.id,
    targetCollection: collectionSlug,
    targetId: originalDoc.id,
    data: { changes },
  });
}

const LISTING_MEDIA = 'partner-listing-media' as CollectionSlug;

type ListingFileRefs = { images: Array<string | number>; datasheet: string | number | null };

function listingFileRefs(doc: Record<string, unknown> | null | undefined): ListingFileRefs {
  const images: Array<string | number> = [];
  if (Array.isArray(doc?.images)) {
    for (const row of doc.images as Array<Record<string, unknown> | null>) {
      const id = getRelationId(row?.image);
      if (id != null) images.push(id);
    }
  }
  return { images, datasheet: getRelationId(doc?.datasheet) };
}

/**
 * Anexos só do próprio parceiro e do tipo certo. Sem isso, um parceiro poderia referenciar o
 * arquivo privado de outra empresa e torná-lo público ao publicar o anúncio.
 */
async function assertListingFilesBelongToPartner(
  req: Parameters<CollectionBeforeChangeHook>[0]['req'],
  partnerId: string | number | null,
  data: Record<string, unknown>,
  originalDoc: Record<string, unknown> | undefined,
): Promise<void> {
  const touchesImages = 'images' in data;
  const touchesDatasheet = 'datasheet' in data;
  if (!touchesImages && !touchesDatasheet) return;

  const refs = listingFileRefs({
    images: touchesImages ? data.images : originalDoc?.images,
    datasheet: touchesDatasheet ? data.datasheet : originalDoc?.datasheet,
  });
  const ids = [
    ...new Set([...refs.images, ...(refs.datasheet != null ? [refs.datasheet] : [])].map(String)),
  ];
  if (ids.length === 0) return;
  if (partnerId == null) throw new APIError('Parceiro obrigatório para anexar arquivos.', 400);

  const found = await req.payload.find({
    collection: LISTING_MEDIA,
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const byId = new Map(
    (found.docs as unknown as Array<Record<string, unknown>>).map((doc) => [String(doc.id), doc]),
  );
  const check = (id: string | number, kind: 'image' | 'datasheet') => {
    const doc = byId.get(String(id));
    if (!doc || String(getRelationId(doc.partner)) !== String(partnerId)) {
      throw new APIError('Arquivo inválido para este parceiro.', 403);
    }
    if (doc.kind !== kind) {
      throw new APIError(
        kind === 'image' ? 'Use uma imagem na galeria.' : 'A ficha técnica deve ser um PDF.',
        400,
      );
    }
  };
  refs.images.forEach((id) => check(id, 'image'));
  if (refs.datasheet != null) check(refs.datasheet, 'datasheet');
}

/**
 * Mantém `public` dos anexos alinhado ao status do anúncio: só publicado expõe arquivos;
 * anexos removidos voltam a ser privados.
 */
export const listingAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const current = listingFileRefs(doc as Record<string, unknown>);
  const previous = listingFileRefs(previousDoc as Record<string, unknown> | undefined);
  const attached = [
    ...current.images,
    ...(current.datasheet != null ? [current.datasheet] : []),
  ].map(String);
  const detached = [...previous.images, ...(previous.datasheet != null ? [previous.datasheet] : [])]
    .map(String)
    .filter((id) => !attached.includes(id));
  const visible = (doc as Record<string, unknown>).status === 'published';

  // Sem isso, um arquivo recém-enviado na mesma requisição seria regravado em cada anexo.
  const pendingFile = req.file;
  req.file = undefined;
  try {
    if (attached.length > 0) {
      await req.payload.update({
        collection: LISTING_MEDIA,
        where: { id: { in: attached } },
        data: { public: visible } as never,
        overrideAccess: true,
        req,
      });
    }
    if (detached.length > 0) {
      await req.payload.update({
        collection: LISTING_MEDIA,
        where: { id: { in: detached } },
        data: { public: false } as never,
        overrideAccess: true,
        req,
      });
    }
  } finally {
    req.file = pendingFile;
  }
  return doc;
};

export const membershipBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;
  // Aceite de convite validado no endpoint (token, e-mail, conta ativa): o próprio convidado
  // cria/reativa sua associação. Contexto só definível no servidor.
  if (req.context?.marketplaceInvitationAccept === true) return data;
  const user = req.user;
  if (operation === 'create' && user && !data.invitedBy) data.invitedBy = user.id;
  if (!user || hasStaffAccess(user)) return data;

  // Entrada na equipe só por convite aceito; nunca associação direta sem consentimento.
  if (operation === 'create') {
    throw new APIError('Use um convite para adicionar pessoas à equipe.', 403);
  }

  const targetUserId = getRelationId(data.user ?? originalDoc?.user);
  if (targetUserId != null && String(targetUserId) === String(user.id)) {
    throw new APIError('Não é possível alterar a própria associação.', 403);
  }

  const partnerId = getRelationId(data.partner ?? originalDoc?.partner);
  const refs = await getActiveMemberships(req.payload, user.id);
  const actorRole = refs.find((ref) => String(ref.partnerId) === String(partnerId))?.role;
  if (actorRole !== 'owner' && actorRole !== 'manager') {
    throw new APIError('Sem permissão para gerenciar a equipe desta empresa.', 403);
  }

  if (
    data.status !== undefined &&
    data.status !== originalDoc?.status &&
    data.status !== 'revoked'
  ) {
    throw new APIError('Para reativar alguém, envie um novo convite.', 403);
  }

  const currentRole = originalDoc?.role as MembershipRole | undefined;
  const nextRole = (data.role ?? currentRole) as MembershipRole | undefined;
  if (currentRole && nextRole && !canChangeMembershipRole(actorRole, currentRole, nextRole)) {
    throw new APIError('Somente um proprietário pode atribuir ou alterar proprietários.', 403);
  }
  if (currentRole === 'owner' && actorRole !== 'owner') {
    throw new APIError('Somente um proprietário pode atribuir ou alterar proprietários.', 403);
  }

  if (operation === 'update' && originalDoc?.partner && data.partner) {
    if (String(getRelationId(originalDoc.partner)) !== String(getRelationId(data.partner))) {
      throw new APIError('Não é possível mover a associação para outro parceiro.', 403);
    }
  }
  return data;
};

/** Auditoria de mudanças de papel/status de membros (o aceite de convite registra o próprio evento). */
export const membershipAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || req.context?.marketplaceInvitationAccept === true) return doc;
  const before = previousDoc as Record<string, unknown> | undefined;
  const after = doc as Record<string, unknown>;
  const base = {
    partner: after.partner,
    subjectUser: after.user,
    targetCollection: 'partner-memberships',
    targetId: after.id,
  };
  if (before?.role !== after.role) {
    await recordMarketplaceAudit(req, {
      type: 'membership_role_changed',
      ...base,
      data: { from: before?.role ?? null, to: after.role },
    });
  }
  if (before?.status !== after.status) {
    await recordMarketplaceAudit(req, {
      type: 'membership_status_changed',
      ...base,
      data: { from: before?.status ?? null, to: after.status },
    });
  }
  return doc;
};

/** Decisões exclusivas do comprador; `declined` também pode vir do parceiro (recusar a solicitação). */
const BUYER_ONLY_QUOTE_STATUSES: readonly QuoteStatus[] = ['accepted', 'negotiating'];
const BUYER_ALLOWED_QUOTE_STATUSES: readonly QuoteStatus[] = [
  'accepted',
  'negotiating',
  'declined',
];

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
      throw new APIError(
        `Transição de status inválida: ${originalDoc.status} → ${data.status}.`,
        400,
      );
    }
    if (!staff) {
      const buyerId = getRelationId(originalDoc.buyerUser);
      const isBuyer = user != null && buyerId != null && String(user.id) === String(buyerId);
      const next = data.status as QuoteStatus;
      if (BUYER_ONLY_QUOTE_STATUSES.includes(next)) {
        if (!isBuyer) {
          throw new APIError('Somente o comprador pode aceitar ou renegociar.', 403);
        }
      } else if (isBuyer && !BUYER_ALLOWED_QUOTE_STATUSES.includes(next)) {
        throw new APIError('O comprador não pode aplicar este status.', 403);
      }
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
