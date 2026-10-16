import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';
import { commitTransaction, initTransaction, killTransaction } from 'payload';

import {
  PROPOSAL_MAX_BODY_BYTES,
  QUOTE_TERMINAL_STATUSES,
  canTransitionQuote,
  isQuoteStatus,
  validateProposalBody,
  type QuoteStatus,
} from '@omnia/shared';

import { hasPartnerCapability } from '../access/marketplace';
import { getRelationId, hasStaffAccess } from '../access/rbac';
import { isTrustedPartnerOrigin } from '../lib/partner-register';

const QUOTE_REQUESTS = 'quote-requests' as CollectionSlug;
const PROPOSALS = 'quote-proposals' as CollectionSlug;
const VERSIONS = 'quote-proposal-versions' as CollectionSlug;
const EVENTS = 'quote-events' as CollectionSlug;

class SendError extends Error {
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
 * POST /omnia/marketplace-proposal-send
 * O parceiro (associação com edição) ou staff envia uma proposta para uma cotação.
 * Cria/reutiliza a proposta, grava a versão imutável (totais calculados no servidor a partir de
 * centavos inteiros), avança o status da cotação e registra a linha do tempo — tudo numa transação.
 */
export const marketplaceProposalSendEndpoint: Endpoint = {
  path: '/omnia/marketplace-proposal-send',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user;
    if (!user) return fail(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');
    if (!isTrustedPartnerOrigin(req.headers.get('origin'))) {
      return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
    }
    const length = Number(req.headers.get('content-length') ?? 0);
    if (Number.isFinite(length) && length > PROPOSAL_MAX_BODY_BYTES) {
      return fail(413, 'BAD_REQUEST', 'Payload muito grande.');
    }

    const validated = validateProposalBody((await req.json?.().catch(() => null)) ?? null);
    if (!validated.ok) return fail(422, 'UNPROCESSABLE', validated.message);
    const { data, totals } = validated;

    const shouldCommit = await initTransaction(req);
    try {
      const quote = (await req.payload
        .findByID({ collection: QUOTE_REQUESTS, id: data.quoteId, depth: 0, overrideAccess: true, req })
        .catch(() => null)) as unknown as Record<string, unknown> | null;
      if (!quote) throw new SendError(404, 'NOT_FOUND', 'Solicitação não encontrada.');

      const partnerId = getRelationId(quote.partner);
      const buyerId = getRelationId(quote.buyerUser);
      if (partnerId == null || buyerId == null) {
        throw new SendError(409, 'CONFLICT', 'Solicitação sem parceiro ou comprador.');
      }
      const allowed =
        hasStaffAccess(user) || (await hasPartnerCapability(req.payload, user.id, partnerId, 'edit'));
      if (!allowed) throw new SendError(403, 'FORBIDDEN', 'Você não pode enviar propostas para esta solicitação.');

      const currentStatus = quote.status;
      if (!isQuoteStatus(currentStatus) || QUOTE_TERMINAL_STATUSES.includes(currentStatus)) {
        throw new SendError(409, 'CONFLICT', 'Esta solicitação já foi encerrada.');
      }

      const existing = await req.payload.find({
        collection: PROPOSALS,
        where: { quoteRequest: { equals: data.quoteId } },
        sort: '-createdAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      });
      const latest = existing.docs[0] as unknown as Record<string, unknown> | undefined;
      const reuse = latest && latest.status === 'sent' ? latest : null;

      const now = new Date().toISOString();
      let proposalId: string | number;
      let versionNumber = 1;

      if (reuse) {
        proposalId = getRelationId(reuse.id)!;
        const lastVersion = await req.payload.find({
          collection: VERSIONS,
          where: { proposal: { equals: proposalId } },
          sort: '-versionNumber',
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        });
        const last = lastVersion.docs[0] as unknown as { versionNumber?: unknown } | undefined;
        versionNumber = (typeof last?.versionNumber === 'number' ? last.versionNumber : 0) + 1;
      } else {
        const created = (await req.payload.create({
          collection: PROPOSALS,
          data: {
            quoteRequest: data.quoteId,
            title: data.title,
            summary: data.summary ?? undefined,
            validUntil: data.validUntil ?? undefined,
            status: 'draft',
            currentVersionNumber: 0,
          } as never,
          overrideAccess: true,
          req,
        })) as unknown as Record<string, unknown>;
        proposalId = getRelationId(created.id)!;
      }

      await req.payload.create({
        collection: VERSIONS,
        data: {
          proposal: proposalId,
          quoteRequest: data.quoteId,
          versionNumber,
          items: data.items,
          subtotalCents: totals.subtotalCents,
          discountCents: data.discountCents,
          shippingCents: data.shippingCents,
          totalCents: totals.totalCents,
          validUntil: data.validUntil ?? undefined,
          deliveryDays: data.deliveryDays ?? undefined,
          paymentTerms: data.paymentTerms ?? undefined,
          notes: data.notes ?? undefined,
          sentAt: now,
        } as never,
        overrideAccess: true,
        req,
      });

      await req.payload.update({
        collection: PROPOSALS,
        id: proposalId,
        data: {
          title: data.title,
          summary: data.summary,
          validUntil: data.validUntil,
          status: 'sent',
          currentVersionNumber: versionNumber,
          sentAt: now,
        } as never,
        overrideAccess: true,
        req,
      });

      // Avança a cotação até `proposal_sent` respeitando a máquina de estados.
      const path: QuoteStatus[] = [];
      if (currentStatus === 'submitted') path.push('in_review', 'proposal_sent');
      else if (currentStatus !== 'proposal_sent') path.push('proposal_sent');

      let from: QuoteStatus = currentStatus;
      for (const to of path) {
        if (!canTransitionQuote(from, to)) {
          throw new SendError(409, 'CONFLICT', `Transição inválida: ${from} → ${to}.`);
        }
        await req.payload.update({
          collection: QUOTE_REQUESTS,
          id: data.quoteId,
          data: { status: to } as never,
          overrideAccess: true,
          req,
        });
        await req.payload.create({
          collection: EVENTS,
          data: {
            quoteRequest: data.quoteId,
            type: 'status_changed',
            visibility: 'shared',
            fromStatus: from,
            toStatus: to,
            actor: user.id,
          } as never,
          overrideAccess: true,
          req,
        });
        from = to;
      }

      await req.payload.create({
        collection: EVENTS,
        data: {
          quoteRequest: data.quoteId,
          proposal: proposalId,
          type: 'proposal_sent',
          visibility: 'shared',
          actor: user.id,
          metadata: { versionNumber, totalCents: totals.totalCents },
        } as never,
        overrideAccess: true,
        req,
      });

      if (shouldCommit) await commitTransaction(req);
      return respond(201, {
        ok: true,
        code: 'SENT',
        message: 'Proposta enviada ao comprador.',
        proposal: { id: proposalId, versionNumber, totalCents: totals.totalCents },
        quote: { id: data.quoteId, status: from },
      });
    } catch (error) {
      if (shouldCommit) await killTransaction(req);
      if (error instanceof SendError) return fail(error.status, error.code, error.message);
      req.payload.logger.error('marketplace-proposal-send: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível enviar a proposta agora. Tente novamente.');
    }
  },
};
