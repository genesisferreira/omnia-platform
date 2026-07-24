import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  Where,
} from 'payload';
import { APIError } from 'payload';

import { isPlatformAdmin } from '../../access/rbac';
import { applyPartnerLocationResolution } from '../../lib/partners/resolve-partner-location';
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
 * beforeChange — slug, status, cobertura, CEP e geocodificação.
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

  if (typeof data.coverageRadius === 'number' && data.coverageRadius < 0) {
    throw new APIError('O raio de cobertura não pode ser negativo.', 400);
  }

  if (req.context?.skipPartnerGeocode !== true) {
    const force =
      req.context?.forcePartnerGeocode === true || data.geocodingStatus === 'pending';
    const previous = originalDoc
      ? {
          zipCode: originalDoc.zipCode as string | null | undefined,
          address: originalDoc.address as string | null | undefined,
          addressNumber: originalDoc.addressNumber as string | null | undefined,
          neighborhood: originalDoc.neighborhood as string | null | undefined,
          city: originalDoc.city as string | null | undefined,
          state: originalDoc.state as string | null | undefined,
          country: originalDoc.country as string | null | undefined,
          geocodingStatus: originalDoc.geocodingStatus as
            | 'pending'
            | 'success'
            | 'failed'
            | 'manual'
            | null
            | undefined,
        }
      : null;

    const resolved = await applyPartnerLocationResolution(
      {
        zipCode: data.zipCode as string | null | undefined,
        address: data.address as string | null | undefined,
        addressNumber: data.addressNumber as string | null | undefined,
        neighborhood: data.neighborhood as string | null | undefined,
        city: data.city as string | null | undefined,
        state: data.state as string | null | undefined,
        country: data.country as string | null | undefined,
        geocodingStatus: data.geocodingStatus as
          | 'pending'
          | 'success'
          | 'failed'
          | 'manual'
          | null
          | undefined,
      },
      previous,
      { force: force || operation === 'create' },
    );

    Object.assign(data, resolved);
  }

  if (operation === 'create') {
    data.status = 'pending';
    data.active = false;
    data.featured = false;
    data.verified = false;
    data.plan = 'free';
    data.approvedAt = null;
    data.approvedBy = null;
    data.publishedAt = null;
    data.approvalNotes = null;
    if (
      req.user?.id != null &&
      data.ownerUser == null &&
      req.context?.publicPartnerRegister !== true
    ) {
      data.ownerUser = req.user.id;
    }
    if (req.context?.publicPartnerRegister === true) {
      data.ownerUser = null;
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
      data.approvedAt = now;
      if (req.user?.id != null) {
        data.approvedBy = req.user.id;
      }
      const previousPublishedAt = originalDoc?.publishedAt;
      if (previousPublishedAt == null && data.publishedAt == null) {
        data.publishedAt = now;
      }
    }
  }

  return data;
};

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
