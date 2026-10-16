import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';

import {
  QUOTE_TERMINAL_STATUSES,
  canTransitionQuote,
  isQuoteStatus,
  type QuoteStatus,
} from '@omnia/shared';

import { getRelationId, hasStaffAccess } from '../access/rbac';
import { isTrustedPartnerOrigin } from '../lib/partner-register';

const QUOTE_REQUESTS = 'quote-requests' as CollectionSlug;
const QUOTE_EVENTS = 'quote-events' as CollectionSlug;

const BUYER_ACTIONS = ['accept', 'decline', 'negotiate'] as const;
type BuyerAction = (typeof BUYER_ACTIONS)[number];

const ACTION_TO_STATUS: Record<BuyerAction, QuoteStatus> = {
  accept: 'accepted',
  decline: 'declined',
  negotiate: 'negotiating',
};

const respond = (status: number, body: Record<string, unknown>): Response =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const fail = (status: number, code: string, message: string): Response =>
  respond(status, { ok: false, code, message, error: { code, message } });

/**
 * POST /omnia/marketplace-quote-respond
 * Comprador dono da cotação aceita, recusa ou pede renegociação.
 */
export const marketplaceQuoteRespondEndpoint: Endpoint = {
  path: '/omnia/marketplace-quote-respond',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      const user = req.user;
      if (!user) return fail(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');
      if (!isTrustedPartnerOrigin(req.headers.get('origin'))) {
        return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
      }

      const body = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>;
      const quoteId = body.quoteId;
      const actionRaw = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
      const message =
        typeof body.message === 'string' ? body.message.replace(/\s+/g, ' ').trim().slice(0, 2000) : '';

      if (quoteId == null || (typeof quoteId !== 'string' && typeof quoteId !== 'number')) {
        return fail(422, 'UNPROCESSABLE', 'Informe a cotação.');
      }
      if (!(BUYER_ACTIONS as readonly string[]).includes(actionRaw)) {
        return fail(422, 'UNPROCESSABLE', 'Ação inválida. Use accept, decline ou negotiate.');
      }
      const action = actionRaw as BuyerAction;
      const nextStatus = ACTION_TO_STATUS[action];

      const quote = (await req.payload
        .findByID({
          collection: QUOTE_REQUESTS,
          id: quoteId,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null)) as unknown as Record<string, unknown> | null;

      if (!quote) return fail(404, 'NOT_FOUND', 'Solicitação não encontrada.');

      const buyerId = getRelationId(quote.buyerUser);
      const partnerId = getRelationId(quote.partner);
      const isBuyer = buyerId != null && String(buyerId) === String(user.id);
      if (!isBuyer && !hasStaffAccess(user)) {
        return fail(404, 'NOT_FOUND', 'Solicitação não encontrada.');
      }
      if (partnerId == null || buyerId == null) {
        return fail(409, 'CONFLICT', 'Solicitação incompleta.');
      }

      const current = quote.status;
      if (!isQuoteStatus(current) || QUOTE_TERMINAL_STATUSES.includes(current)) {
        return fail(409, 'CONFLICT', 'Esta solicitação já foi encerrada.');
      }
      if (!canTransitionQuote(current, nextStatus)) {
        return fail(
          409,
          'CONFLICT',
          `Não é possível ${action} a partir do status ${current}.`,
        );
      }

      const updated = (await req.payload.update({
        collection: QUOTE_REQUESTS,
        id: quoteId,
        data: { status: nextStatus },
        overrideAccess: true,
        user,
        req,
      })) as unknown as Record<string, unknown>;

      try {
        await req.payload.create({
          collection: QUOTE_EVENTS,
          data: {
            quoteRequest: quoteId,
            partner: partnerId,
            buyerUser: buyerId,
            type: 'status_changed',
            visibility: 'shared',
            fromStatus: current,
            toStatus: nextStatus,
            message: message || undefined,
            actor: user.id,
          } as never,
          overrideAccess: true,
          req,
        });
      } catch {
        req.payload.logger.warn('marketplace-quote-respond: event creation failed');
      }

      return respond(200, {
        ok: true,
        quote: {
          id: getRelationId(updated.id) ?? quoteId,
          publicId: typeof updated.publicId === 'string' ? updated.publicId : null,
          status: updated.status,
        },
      });
    } catch (err) {
      req.payload.logger.error('marketplace-quote-respond: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível atualizar a cotação.');
    }
  },
};
