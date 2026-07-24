import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  Where,
} from 'payload';
import { APIError } from 'payload';

import { isPlatformAdmin } from '../../access/rbac';
import {
  isValidPartnerSlug,
  normalizePartnerSlug,
  slugSourceFromPartner,
} from './partner-rules';

/**
 * beforeValidate — gera slug a partir do nome fantasia (ou razão social) se omitido.
 */
export const partnerBeforeValidate: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => {
  if (!data) {
    return data;
  }

  const source = slugSourceFromPartner({
    slug: data.slug,
    tradeName: data.tradeName ?? originalDoc?.tradeName,
    companyName: data.companyName ?? originalDoc?.companyName,
  });

  if (source) {
    data.slug = source;
  }

  return data;
};

/**
 * beforeChange — slug, status, cobertura e preparação para integrações futuras.
 *
 * Futuro:
 * - geocode (CEP → lat/lng) quando endereço mudar
 * - sincronização parcial com CRM (CrmCompanies / Contacts)
 * - invalidação de cache de busca geográfica
 * - notificação de fila de moderação
 */
export const partnerBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) {
    return data;
  }

  // --- Slug (URL pública futura) ---
  const slugCandidate =
    normalizePartnerSlug(data.slug) ??
    (typeof originalDoc?.slug === 'string'
      ? normalizePartnerSlug(originalDoc.slug)
      : undefined) ??
    slugSourceFromPartner({
      tradeName: data.tradeName ?? originalDoc?.tradeName,
      companyName: data.companyName ?? originalDoc?.companyName,
    });

  if (!slugCandidate || !isValidPartnerSlug(slugCandidate)) {
    throw new APIError(
      'Slug inválido. Use letras minúsculas, números e hífen (gerado a partir do nome fantasia).',
      400,
    );
  }

  data.slug = slugCandidate;

  const slugWhere: Where = { slug: { equals: slugCandidate } };
  if (operation === 'update' && originalDoc?.id != null) {
    slugWhere.id = { not_equals: originalDoc.id };
  }

  const existing = await req.payload.find({
    collection: 'partners',
    where: slugWhere,
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  if (existing.totalDocs > 0) {
    throw new APIError(`Já existe um parceiro com o slug "${slugCandidate}".`, 400);
  }

  // --- coverageRadius: não negativo ---
  if (typeof data.coverageRadius === 'number' && data.coverageRadius < 0) {
    throw new APIError('O raio de cobertura não pode ser negativo.', 400);
  }

  if (operation === 'create') {
    // Novo parceiro inicia sempre como Pending.
    data.status = 'pending';
    data.approvedAt = null;
    data.approvedBy = null;
    data.publishedAt = null;
    if (data.featured !== true) {
      data.featured = false;
    }
    if (data.verified !== true) {
      data.verified = false;
    }
    if (!data.plan) {
      data.plan = 'free';
    }
    // Responsável pelo cadastro (não confundir com approvedBy).
    if (data.ownerUser == null && req.user?.id != null) {
      data.ownerUser = req.user.id;
    }
    return data;
  }

  const previousStatus =
    typeof originalDoc?.status === 'string' ? originalDoc.status : undefined;

  if (
    typeof data.status === 'string' &&
    previousStatus !== undefined &&
    data.status !== previousStatus
  ) {
    if (!isPlatformAdmin(req.user)) {
      throw new APIError(
        'Somente administradores podem alterar o status do parceiro (Approved, Rejected, Suspended).',
        403,
      );
    }

    if (data.status === 'approved' && previousStatus !== 'approved') {
      const now = new Date().toISOString();
      // Última aprovação — rastreabilidade operacional.
      data.approvedAt = now;
      if (req.user?.id != null) {
        data.approvedBy = req.user.id;
      }
      // Primeira publicação pública: não sobrescreve se já existir.
      const previousPublishedAt = originalDoc?.publishedAt;
      if (previousPublishedAt == null && data.publishedAt == null) {
        data.publishedAt = now;
      }
    }

    // Saída de approved: mantém approvedAt / approvedBy / publishedAt (rastreabilidade).
  }

  return data;
};

/**
 * afterChange — hooks preparados para integrações futuras.
 *
 * Futuro:
 * - espelho de PartnerLead / Activity no CRM
 * - indexação geoespacial / fila de reindex
 * - e-mail de aprovação / rejeição ao parceiro
 * - publicação condicional no diretório público
 * - webhooks / Neurofrigo IA (enriquecimento de perfil)
 */
export const partnerAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  void previousDoc;
  void operation;
  void req;
  return doc;
};
