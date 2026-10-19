import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';
import { commitTransaction, initTransaction, killTransaction } from 'payload';

import {
  MARKETPLACE_RATE_LIMIT_WINDOW_MS,
  MARKETPLACE_RESPOND_RATE_LIMIT_MAX,
  QUOTE_TERMINAL_STATUSES,
  canTransitionQuote,
  isQuoteStatus,
  type QuoteStatus,
} from '@omnia/shared';

import { getRelationId, hasStaffAccess } from '../access/rbac';
import { isTrustedPartnerOrigin } from '../lib/partner-register';
import { enforceMarketplaceRateLimit } from './marketplace-rate-limit';

const QUOTE_REQUESTS = 'quote-requests' as CollectionSlug;
const PROPOSALS = 'quote-proposals' as CollectionSlug;
const QUOTE_EVENTS = 'quote-events' as CollectionSlug;

const BUYER_ACTIONS = ['accept', 'decline', 'negotiate'] as const;
type BuyerAction = (typeof BUYER_ACTIONS)[number];

const ACTION_TO_STATUS: Record<BuyerAction, QuoteStatus> = {
  accept: 'accepted',
  decline: 'declined',
  negotiate: 'negotiating',
};

const ACTION_LABEL: Record<BuyerAction, string> = {
  accept: 'aceitar',
  decline: 'recusar',
  negotiate: 'pedir renegociação',
};

const SCRIPT_RE = /<\s*script|javascript:|on\w+\s*=/i;

class RespondError extends Error {
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

/**
 * POST /omnia/marketplace-quote-respond
 * O comprador dono da cotação aceita, recusa ou pede renegociação da proposta enviada.
 * Aceitar/recusar também encerra a proposta vigente (accepted/rejected).
 */
export const marketplaceQuoteRespondEndpoint: Endpoint = {
  path: '/omnia/marketplace-quote-respond',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user;
    if (!user) return fail(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');
    if (!isTrustedPartnerOrigin(req.headers.get('origin'))) {
      return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
    }

    const body = ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>;
    const quoteId = body.quoteId;
    const actionRaw = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    const message =
      typeof body.message === 'string' ? body.message.replace(/\r\n/g, '\n').trim().slice(0, 2000) : '';

    const validId =
      (typeof quoteId === 'number' && Number.isInteger(quoteId) && quoteId > 0) ||
      (typeof quoteId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(quoteId));
    if (!validId) return fail(422, 'UNPROCESSABLE', 'Informe a cotação.');
    if (!(BUYER_ACTIONS as readonly string[]).includes(actionRaw)) {
      return fail(422, 'UNPROCESSABLE', 'Ação inválida. Use accept, decline ou negotiate.');
    }
    if (message && SCRIPT_RE.test(message)) {
      return fail(422, 'UNPROCESSABLE', 'A mensagem contém conteúdo não permitido.');
    }
    const action = actionRaw as BuyerAction;
    if (action === 'negotiate' && message.length < 5) {
      return fail(422, 'UNPROCESSABLE', 'Explique o que precisa ser revisto na proposta.');
    }
    const nextStatus = ACTION_TO_STATUS[action];

    const limited = await enforceMarketplaceRateLimit({
      scope: 'marketplace-quote-respond',
      userId: user.id,
      max: MARKETPLACE_RESPOND_RATE_LIMIT_MAX,
      windowMs: MARKETPLACE_RATE_LIMIT_WINDOW_MS,
    });
    if (limited) return limited;

    const shouldCommit = await initTransaction(req);
    try {
      const quote = (await req.payload
        .findByID({ collection: QUOTE_REQUESTS, id: quoteId as string | number, depth: 0, overrideAccess: true, req })
        .catch(() => null)) as unknown as Record<string, unknown> | null;
      if (!quote) throw new RespondError(404, 'NOT_FOUND', 'Solicitação não encontrada.');

      const buyerId = getRelationId(quote.buyerUser);
      const partnerId = getRelationId(quote.partner);
      const isBuyer = buyerId != null && String(buyerId) === String(user.id);
      // Não revela a existência de cotações de terceiros.
      if (!isBuyer && !hasStaffAccess(user)) {
        throw new RespondError(404, 'NOT_FOUND', 'Solicitação não encontrada.');
      }
      if (partnerId == null || buyerId == null) {
        throw new RespondError(409, 'CONFLICT', 'Solicitação incompleta.');
      }

      const current = quote.status;
      if (!isQuoteStatus(current) || QUOTE_TERMINAL_STATUSES.includes(current)) {
        throw new RespondError(409, 'CONFLICT', 'Esta solicitação já foi encerrada.');
      }
      if (!canTransitionQuote(current, nextStatus)) {
        throw new RespondError(
          409,
          'CONFLICT',
          `Não é possível ${ACTION_LABEL[action]} enquanto a solicitação está em "${current}".`,
        );
      }

      const latest = (
        await req.payload.find({
          collection: PROPOSALS,
          where: { and: [{ quoteRequest: { equals: quoteId } }, { status: { equals: 'sent' } }] },
          sort: '-sentAt',
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
      ).docs[0] as unknown as Record<string, unknown> | undefined;
      const proposalId = latest ? getRelationId(latest.id) : null;
      if (action !== 'decline' && proposalId == null) {
        throw new RespondError(409, 'CONFLICT', 'Não há proposta enviada para responder.');
      }

      const now = new Date().toISOString();
      const updated = (await req.payload.update({
        collection: QUOTE_REQUESTS,
        id: quoteId as string | number,
        data: { status: nextStatus } as never,
        overrideAccess: true,
        user,
        req,
      })) as unknown as Record<string, unknown>;

      if (proposalId != null && action !== 'negotiate') {
        await req.payload.update({
          collection: PROPOSALS,
          id: proposalId,
          data: { status: action === 'accept' ? 'accepted' : 'rejected', respondedAt: now } as never,
          overrideAccess: true,
          req,
        });
      }

      await req.payload.create({
        collection: QUOTE_EVENTS,
        data: {
          quoteRequest: quoteId,
          proposal: proposalId ?? undefined,
          type:
            action === 'accept'
              ? 'proposal_accepted'
              : action === 'decline' && proposalId != null
                ? 'proposal_rejected'
                : 'status_changed',
          visibility: 'shared',
          fromStatus: current,
          toStatus: nextStatus,
          message: message || undefined,
          actor: user.id,
        } as never,
        overrideAccess: true,
        req,
      });

      if (shouldCommit) await commitTransaction(req);
      return respond(200, {
        ok: true,
        code: 'UPDATED',
        message:
          action === 'accept'
            ? 'Proposta aceita. O parceiro foi notificado no painel.'
            : action === 'decline'
              ? 'Proposta recusada.'
              : 'Pedido de renegociação enviado ao parceiro.',
        quote: {
          id: getRelationId(updated.id) ?? quoteId,
          publicId: typeof updated.publicId === 'string' ? updated.publicId : null,
          status: updated.status,
        },
      });
    } catch (error) {
      if (shouldCommit) await killTransaction(req);
      if (error instanceof RespondError) return fail(error.status, error.code, error.message);
      req.payload.logger.error('marketplace-quote-respond: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível atualizar a cotação.');
    }
  },
};
