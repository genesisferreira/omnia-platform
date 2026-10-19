import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';

import {
  MARKETPLACE_QUOTE_MAX_BODY_BYTES,
  MARKETPLACE_QUOTE_RATE_LIMIT_MAX,
  MARKETPLACE_QUOTE_RATE_LIMIT_WINDOW_MS,
  isPartnerPubliclyVisible,
  mapPublicMarketplaceListing,
  validateQuoteRequestBody,
  type MarketplaceListingKind,
} from '@omnia/shared';
import { checkRateLimit } from '@omnia/shared/rate-limit';

import { getActiveMemberships } from '../access/marketplace';
import { getRelationId, hasStaffAccess } from '../access/rbac';
import { isTrustedPartnerOrigin } from '../lib/partner-register';

const QUOTE_REQUESTS = 'quote-requests' as CollectionSlug;
const QUOTE_EVENTS = 'quote-events' as CollectionSlug;
const LISTING_COLLECTIONS: Record<MarketplaceListingKind, CollectionSlug> = {
  product: 'partner-product-listings' as CollectionSlug,
  service: 'partner-service-listings' as CollectionSlug,
};

type ApiBody = {
  ok: boolean;
  code?: string;
  message?: string;
  retryAfter?: number;
  quote?: { id: string | number; publicId: string | null; status: string };
};

function respond(status: number, body: ApiBody): Response {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (status === 429 && body.retryAfter != null) headers['Retry-After'] = String(body.retryAfter);
  return Response.json(body, { status, headers });
}

const fail = (status: number, code: string, message: string, retryAfter?: number): Response =>
  respond(status, { ok: false, code, message, retryAfter });

function rateLimitRedisMode(): 'fail-closed' | 'memory-fallback' {
  const env = (process.env.APP_ENV || process.env.OMNIA_ENV || '').toLowerCase();
  return env === 'production' ? 'fail-closed' : 'memory-fallback';
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

function buyerContact(user: Record<string, unknown>): {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
} {
  const fullName = [text(user.firstName), text(user.lastName)].filter(Boolean).join(' ');
  return {
    contactName: text(user.name) ?? (fullName || undefined),
    contactEmail: text(user.email),
    contactPhone: text(user.whatsapp) ?? text(user.phone),
  };
}

export const marketplaceQuoteRequestEndpoint: Endpoint = {
  path: '/omnia/marketplace-quote-request',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      const user = req.user;
      if (!user) return fail(401, 'UNAUTHORIZED', 'Entre na sua conta para solicitar cotações.');

      if (!isTrustedPartnerOrigin(req.headers.get('origin'))) {
        return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
      }
      const length = Number(req.headers.get('content-length') ?? 0);
      if (Number.isFinite(length) && length > MARKETPLACE_QUOTE_MAX_BODY_BYTES) {
        return fail(413, 'BAD_REQUEST', 'Payload muito grande.');
      }

      const validated = validateQuoteRequestBody((await req.json?.()) ?? {});
      if (!validated.ok) return fail(422, 'UNPROCESSABLE', validated.message);
      const input = validated.data;

      // Resolve o parceiro destino sempre a partir de dados confiáveis do servidor.
      let partnerId: string | number;
      if (input.sourceType === 'project') {
        const requested = input.partnerId!;
        const partner = (await req.payload
          .findByID({ collection: 'partners', id: requested, depth: 0, overrideAccess: true })
          .catch(() => null)) as unknown as Record<string, unknown> | null;
        if (!partner || !isPartnerPubliclyVisible(partner)) {
          return fail(400, 'PARTNER_UNAVAILABLE', 'Parceiro indisponível para cotações.');
        }
        partnerId = getRelationId(partner.id) ?? requested;
      } else {
        const kind: MarketplaceListingKind = input.sourceType;
        const listing = await req.payload
          .findByID({
            collection: LISTING_COLLECTIONS[kind],
            id: input.listingId!,
            depth: 2,
            overrideAccess: true,
          })
          .catch(() => null);
        const dto = listing ? mapPublicMarketplaceListing(kind, listing) : null;
        if (!dto) return fail(404, 'LISTING_UNAVAILABLE', 'Este item não está mais disponível.');
        if (input.partnerId != null && String(input.partnerId) !== dto.partner.id) {
          return fail(400, 'BAD_REQUEST', 'O item informado não pertence ao parceiro.');
        }
        const listingPartner = getRelationId(
          (listing as unknown as Record<string, unknown>).partner,
        );
        partnerId = listingPartner ?? dto.partner.id;
      }

      if (!hasStaffAccess(user)) {
        const memberships = await getActiveMemberships(req.payload, user.id);
        if (memberships.some((ref) => String(ref.partnerId) === String(partnerId))) {
          return fail(
            403,
            'FORBIDDEN',
            'Você faz parte deste parceiro e não pode solicitar cotação para ele.',
          );
        }
      }

      const quota = await checkRateLimit({
        scope: 'marketplace-quote-request',
        subjects: [{ value: String(user.id) }],
        max: MARKETPLACE_QUOTE_RATE_LIMIT_MAX,
        windowMs: MARKETPLACE_QUOTE_RATE_LIMIT_WINDOW_MS,
        onRedisUnavailable: rateLimitRedisMode(),
      });
      if (!quota.allowed) {
        const retryAfter = quota.retryAfterSeconds ?? 600;
        if (quota.reason === 'redis_unavailable') {
          return fail(
            503,
            'SERVICE_UNAVAILABLE',
            'Serviço temporariamente indisponível.',
            retryAfter,
          );
        }
        const minutes = Math.max(1, Math.ceil(retryAfter / 60));
        return fail(
          429,
          'RATE_LIMITED',
          `Muitas solicitações em pouco tempo. Tente novamente em ${minutes} min.`,
          retryAfter,
        );
      }

      const quote = (await req.payload.create({
        collection: QUOTE_REQUESTS,
        data: {
          partner: partnerId,
          sourceType: input.sourceType,
          ...(input.sourceType === 'product' ? { productListing: input.listingId } : {}),
          ...(input.sourceType === 'service' ? { serviceListing: input.listingId } : {}),
          description: input.description,
          ...(input.quantity != null ? { quantity: input.quantity } : {}),
          ...(input.city ? { city: input.city } : {}),
          ...(input.state ? { state: input.state } : {}),
          ...buyerContact(user as unknown as Record<string, unknown>),
        } as never,
        req,
        overrideAccess: false,
        user,
      })) as unknown as Record<string, unknown>;

      const quoteId = getRelationId(quote.id);
      if (quoteId == null) throw new Error('quote-id-missing');

      try {
        await req.payload.create({
          collection: QUOTE_EVENTS,
          data: {
            quoteRequest: quoteId,
            type: 'request_created',
            visibility: 'shared',
            toStatus: 'submitted',
            actor: user.id,
          } as never,
          req,
          overrideAccess: true,
        });
      } catch {
        // A cotação já existe; a linha do tempo é best-effort e nunca desfaz a criação.
        req.payload.logger.warn('marketplace-quote-request: event creation failed');
      }

      return respond(201, {
        ok: true,
        code: 'CREATED',
        message: 'Solicitação enviada com sucesso.',
        quote: {
          id: quoteId,
          publicId: typeof quote.publicId === 'string' ? quote.publicId : null,
          status: typeof quote.status === 'string' ? quote.status : 'submitted',
        },
      });
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status === 400 || status === 403) {
        const message =
          error instanceof Error && error.message ? error.message : 'Solicitação inválida.';
        return fail(status, status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message);
      }
      req.payload.logger.error('marketplace-quote-request: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível enviar agora. Tente novamente.');
    }
  },
};
