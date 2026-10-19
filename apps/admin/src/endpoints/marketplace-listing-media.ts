import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';
import {
  addDataAndFileToRequest,
  commitTransaction,
  initTransaction,
  killTransaction,
} from 'payload';

import {
  MARKETPLACE_LISTING_MAX_IMAGES,
  MARKETPLACE_MEDIA_RATE_LIMIT_MAX,
  MARKETPLACE_RATE_LIMIT_WINDOW_MS,
  MARKETPLACE_UPLOAD_MAX_BODY_BYTES,
} from '@omnia/shared';

import { hasPartnerCapability } from '../access/marketplace';
import { getRelationId, hasStaffAccess } from '../access/rbac';
import { isTrustedPartnerOrigin } from '../lib/partner-register';
import { enforceMarketplaceRateLimit } from './marketplace-rate-limit';

const LISTINGS: Record<'product' | 'service', CollectionSlug> = {
  product: 'partner-product-listings' as CollectionSlug,
  service: 'partner-service-listings' as CollectionSlug,
};
const LISTING_MEDIA = 'partner-listing-media' as CollectionSlug;

class UploadError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const respond = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const fail = (status: number, code: string, message: string): Response =>
  respond(status, { ok: false, code, message, error: { code, message } });

const str = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/**
 * POST /omnia/marketplace-listing-media (multipart: `file` + `_payload` JSON)
 * `_payload`: { kind: 'product'|'service', listingId, slot: 'image'|'datasheet', alt? }
 * Envia e anexa, numa transação, uma imagem ou a ficha técnica a um anúncio da própria empresa.
 * Tipo validado pelo conteúdo e limite de tamanho no hook da collection `partner-listing-media`.
 */
export const marketplaceListingMediaEndpoint: Endpoint = {
  path: '/omnia/marketplace-listing-media',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user;
    if (!user) return fail(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');
    if (!isTrustedPartnerOrigin(req.headers.get('origin'))) {
      return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
    }
    const length = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(length) && length > MARKETPLACE_UPLOAD_MAX_BODY_BYTES) {
      return fail(413, 'PAYLOAD_TOO_LARGE', 'Arquivo acima do limite permitido.');
    }

    const limited = await enforceMarketplaceRateLimit({
      scope: 'marketplace-listing-media',
      userId: user.id,
      max: MARKETPLACE_MEDIA_RATE_LIMIT_MAX,
      windowMs: MARKETPLACE_RATE_LIMIT_WINDOW_MS,
    });
    if (limited) return limited;

    try {
      await addDataAndFileToRequest(req);
    } catch {
      return fail(400, 'BAD_REQUEST', 'Envio inválido.');
    }
    const fields = (req.data ?? {}) as Record<string, unknown>;
    const kind =
      fields.kind === 'service' ? 'service' : fields.kind === 'product' ? 'product' : null;
    const slot =
      fields.slot === 'datasheet' ? 'datasheet' : fields.slot === 'image' ? 'image' : null;
    const listingId = fields.listingId;
    const alt = str(fields.alt, 160);
    if (!kind || !slot)
      return fail(422, 'UNPROCESSABLE', 'Informe o tipo do anúncio e do arquivo.');
    if (
      !(typeof listingId === 'number' && Number.isInteger(listingId) && listingId > 0) &&
      !(typeof listingId === 'string' && /^\d{1,12}$/.test(listingId))
    ) {
      return fail(422, 'UNPROCESSABLE', 'Anúncio inválido.');
    }
    const file = req.file;
    if (!file) return fail(422, 'UNPROCESSABLE', 'Selecione um arquivo.');

    const shouldCommit = await initTransaction(req);
    try {
      const listing = (await req.payload
        .findByID({
          collection: LISTINGS[kind],
          id: listingId,
          depth: 0,
          overrideAccess: true,
          req,
        })
        .catch(() => null)) as unknown as Record<string, unknown> | null;
      const partnerId = getRelationId(listing?.partner);
      // Sem permissão ou inexistente: mesma resposta (não revela anúncios de terceiros).
      const allowed =
        listing != null &&
        partnerId != null &&
        (hasStaffAccess(user) ||
          (await hasPartnerCapability(req.payload, user.id, partnerId, 'edit')));
      if (!allowed) throw new UploadError(404, 'NOT_FOUND', 'Anúncio não encontrado.');

      const images = Array.isArray(listing.images)
        ? (listing.images as Array<Record<string, unknown>>)
        : [];
      if (slot === 'image' && images.length >= MARKETPLACE_LISTING_MAX_IMAGES) {
        throw new UploadError(
          409,
          'CONFLICT',
          `Limite de ${MARKETPLACE_LISTING_MAX_IMAGES} imagens por anúncio.`,
        );
      }

      const media = (await req.payload.create({
        collection: LISTING_MEDIA,
        data: {
          alt: alt || undefined,
          kind: slot,
          partner: partnerId,
          uploadedBy: user.id,
          public: false,
        } as never,
        file,
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>;
      const mediaId = getRelationId(media.id);
      if (mediaId == null) throw new Error('media-id-missing');
      req.file = undefined;

      const patch =
        slot === 'image'
          ? {
              images: [
                ...images.map((row) => ({
                  image: getRelationId(row.image),
                  alt: row.alt ?? undefined,
                })),
                { image: mediaId, alt: alt || undefined },
              ],
            }
          : { datasheet: mediaId };
      await req.payload.update({
        collection: LISTINGS[kind],
        id: listingId,
        data: patch as never,
        overrideAccess: true,
        user,
        req,
      });

      if (shouldCommit) await commitTransaction(req);
      return respond(201, {
        ok: true,
        code: 'UPLOADED',
        message:
          slot === 'image' ? 'Imagem adicionada ao anúncio.' : 'Ficha técnica anexada ao anúncio.',
        media: { id: mediaId, kind: slot },
      });
    } catch (error) {
      if (shouldCommit) await killTransaction(req);
      if (error instanceof UploadError) return fail(error.status, error.code, error.message);
      const status = (error as { status?: number } | null)?.status;
      if (status === 400 || status === 413) {
        const message =
          error instanceof Error && error.message ? error.message : 'Arquivo inválido.';
        return fail(status, status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST', message);
      }
      // Erros de validação do Payload (tipo de arquivo) chegam como ValidationError.
      if ((error as { name?: string } | null)?.name === 'ValidationError') {
        return fail(400, 'BAD_REQUEST', 'Formato de arquivo não permitido.');
      }
      req.payload.logger.error('marketplace-listing-media: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível enviar o arquivo agora.');
    }
  },
};
