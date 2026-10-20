import { createHash, randomBytes } from 'node:crypto';

import type { CollectionSlug, Endpoint, PayloadRequest } from 'payload';
import { commitTransaction, initTransaction, killTransaction } from 'payload';

import {
  INVITATION_TTL_MS,
  MARKETPLACE_RATE_LIMIT_WINDOW_MS,
  canAcceptInvitationWithPlatformRole,
  canInviteRole,
  invitationEffectiveStatus,
  isMembershipRoleValue,
  normalizeInviteEmail,
  type InviterRole,
  type MembershipRole,
} from '@omnia/shared';

import { getActiveMemberships } from '../access/marketplace';
import { getRelationId, getUserRole, hasStaffAccess } from '../access/rbac';
import { recordMarketplaceAudit } from '../collections/marketplace/MarketplaceAuditEvents';
import { isTrustedPartnerOrigin } from '../lib/partner-register';
import { enforceMarketplaceRateLimit } from './marketplace-rate-limit';

const INVITATIONS = 'partner-invitations' as CollectionSlug;
const MEMBERSHIPS = 'partner-memberships' as CollectionSlug;

class InviteError extends Error {
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

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  return ((await req.json?.().catch(() => null)) ?? {}) as Record<string, unknown>;
}

/** Papel do usuário na empresa (ou 'staff'); null se não pode gerenciar a equipe. */
async function managerRole(
  req: PayloadRequest,
  partnerId: string | number,
): Promise<InviterRole | null> {
  const user = req.user;
  if (!user) return null;
  if (hasStaffAccess(user)) return 'staff';
  const refs = await getActiveMemberships(req.payload, user.id);
  const ref = refs.find((entry) => String(entry.partnerId) === String(partnerId));
  if (!ref) return null;
  return ref.role === 'owner' || ref.role === 'manager' ? ref.role : null;
}

function guard(req: PayloadRequest): Response | null {
  if (!req.user) return fail(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');
  if (!isTrustedPartnerOrigin(req.headers.get('origin')))
    return fail(403, 'FORBIDDEN', 'Origem não autorizada.');
  return null;
}

async function findByToken(req: PayloadRequest, token: unknown) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const found = await req.payload.find({
    collection: INVITATIONS,
    where: { tokenHash: { equals: hashInvitationToken(token) } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
    req,
  });
  return (found.docs[0] as unknown as Record<string, unknown> | undefined) ?? null;
}

/** POST /omnia/partner-invitations — { partnerId, email, role } → token exibido uma única vez. */
export const partnerInvitationCreateEndpoint: Endpoint = {
  path: '/omnia/partner-invitations',
  method: 'post',
  handler: async (req) => {
    const blocked = guard(req);
    if (blocked) return blocked;
    const body = await readBody(req);
    const partnerId = getRelationId(body.partnerId);
    const email = normalizeInviteEmail(body.email);
    const role = body.role;
    if (partnerId == null || !/^\d{1,12}$/.test(String(partnerId))) {
      return fail(422, 'UNPROCESSABLE', 'Informe a empresa.');
    }
    if (!email) return fail(422, 'UNPROCESSABLE', 'Informe um e-mail válido.');
    if (!isMembershipRoleValue(role)) return fail(422, 'UNPROCESSABLE', 'Papel inválido.');

    const inviter = await managerRole(req, partnerId);
    // Mesma resposta para empresa inexistente ou sem permissão.
    if (!inviter) return fail(404, 'NOT_FOUND', 'Empresa não encontrada.');
    if (!canInviteRole(inviter, role)) {
      return fail(403, 'FORBIDDEN', 'Seu papel não permite convidar com este nível de acesso.');
    }
    if (req.user && String(req.user.email ?? '').toLowerCase() === email) {
      return fail(422, 'UNPROCESSABLE', 'Você não pode convidar a si mesmo.');
    }

    const limited = await enforceMarketplaceRateLimit({
      scope: 'partner-invitation-create',
      userId: req.user!.id,
      max: 30,
      windowMs: MARKETPLACE_RATE_LIMIT_WINDOW_MS,
    });
    if (limited) return limited;

    const partner = await req.payload
      .findByID({ collection: 'partners', id: partnerId, depth: 0, overrideAccess: true, req })
      .catch(() => null);
    if (!partner) return fail(404, 'NOT_FOUND', 'Empresa não encontrada.');

    const pending = await req.payload.find({
      collection: INVITATIONS,
      where: {
        and: [
          { partner: { equals: partnerId } },
          { email: { equals: email } },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    });
    const open = (pending.docs as unknown as Array<Record<string, unknown>>).find(
      (doc) => invitationEffectiveStatus(doc) === 'pending',
    );
    if (open)
      return fail(
        409,
        'CONFLICT',
        'Já existe um convite pendente para este e-mail. Revogue-o para gerar outro.',
      );

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    const shouldCommit = await initTransaction(req);
    try {
      const invitation = (await req.payload.create({
        collection: INVITATIONS,
        data: {
          partner: partnerId,
          email,
          role,
          status: 'pending',
          tokenHash: hashInvitationToken(token),
          expiresAt,
          invitedBy: req.user!.id,
        } as never,
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>;
      await recordMarketplaceAudit(req, {
        type: 'invitation_created',
        partner: partnerId,
        targetCollection: 'partner-invitations',
        targetId: invitation.id,
        data: { email, role, expiresAt, inviterRole: inviter },
      });
      if (shouldCommit) await commitTransaction(req);
      return respond(201, {
        ok: true,
        code: 'CREATED',
        message:
          'Convite criado. Envie o link ao convidado; ele expira em 7 dias e só pode ser usado uma vez.',
        invitation: { id: invitation.id, email, role, expiresAt },
        token,
      });
    } catch {
      if (shouldCommit) await killTransaction(req);
      req.payload.logger.error('partner-invitation-create: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível criar o convite.');
    }
  },
};

/** POST /omnia/partner-invitations/revoke — { invitationId } */
export const partnerInvitationRevokeEndpoint: Endpoint = {
  path: '/omnia/partner-invitations/revoke',
  method: 'post',
  handler: async (req) => {
    const blocked = guard(req);
    if (blocked) return blocked;
    const body = await readBody(req);
    const id = getRelationId(body.invitationId);
    if (id == null) return fail(422, 'UNPROCESSABLE', 'Convite inválido.');
    const invitation = (await req.payload
      .findByID({ collection: INVITATIONS, id, depth: 0, overrideAccess: true, req })
      .catch(() => null)) as unknown as Record<string, unknown> | null;
    const partnerId = getRelationId(invitation?.partner);
    if (!invitation || partnerId == null || !(await managerRole(req, partnerId))) {
      return fail(404, 'NOT_FOUND', 'Convite não encontrado.');
    }
    if (invitation.status !== 'pending')
      return fail(409, 'CONFLICT', 'Este convite não está mais pendente.');
    const shouldCommit = await initTransaction(req);
    try {
      await req.payload.update({
        collection: INVITATIONS,
        id,
        data: {
          status: 'revoked',
          revokedBy: req.user!.id,
          revokedAt: new Date().toISOString(),
        } as never,
        overrideAccess: true,
        req,
      });
      await recordMarketplaceAudit(req, {
        type: 'invitation_revoked',
        partner: partnerId,
        targetCollection: 'partner-invitations',
        targetId: id,
        data: { email: invitation.email, role: invitation.role },
      });
      if (shouldCommit) await commitTransaction(req);
      return respond(200, { ok: true, code: 'REVOKED', message: 'Convite revogado.' });
    } catch {
      if (shouldCommit) await killTransaction(req);
      req.payload.logger.error('partner-invitation-revoke: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível revogar o convite.');
    }
  },
};

/** POST /omnia/partner-invitations/preview — { token } → dados mínimos para a tela de aceite. */
export const partnerInvitationPreviewEndpoint: Endpoint = {
  path: '/omnia/partner-invitations/preview',
  method: 'post',
  handler: async (req) => {
    const blocked = guard(req);
    if (blocked) return blocked;
    const limited = await enforceMarketplaceRateLimit({
      scope: 'partner-invitation-lookup',
      userId: req.user!.id,
      max: 30,
      windowMs: MARKETPLACE_RATE_LIMIT_WINDOW_MS,
    });
    if (limited) return limited;
    const invitation = await findByToken(req, (await readBody(req)).token);
    if (!invitation) return fail(404, 'NOT_FOUND', 'Convite inválido ou inexistente.');
    const partner = invitation.partner as Record<string, unknown> | null;
    const emailMatches = String(req.user!.email ?? '').toLowerCase() === invitation.email;
    return respond(200, {
      ok: true,
      invitation: {
        status: invitationEffectiveStatus(invitation),
        role: invitation.role,
        partnerName:
          (partner?.tradeName as string) || (partner?.companyName as string) || 'Empresa parceira',
        emailMatches,
        expiresAt: invitation.expiresAt,
      },
    });
  },
};

/** POST /omnia/partner-invitations/accept — { token } */
export const partnerInvitationAcceptEndpoint: Endpoint = {
  path: '/omnia/partner-invitations/accept',
  method: 'post',
  handler: async (req) => {
    const blocked = guard(req);
    if (blocked) return blocked;
    const user = req.user!;
    const limited = await enforceMarketplaceRateLimit({
      scope: 'partner-invitation-lookup',
      userId: user.id,
      max: 30,
      windowMs: MARKETPLACE_RATE_LIMIT_WINDOW_MS,
    });
    if (limited) return limited;

    const token = (await readBody(req)).token;
    const shouldCommit = await initTransaction(req);
    try {
      const invitation = await findByToken(req, token);
      if (!invitation) throw new InviteError(404, 'NOT_FOUND', 'Convite inválido ou inexistente.');
      const status = invitationEffectiveStatus(invitation);
      if (status === 'expired' && invitation.status === 'pending') {
        await req.payload.update({
          collection: INVITATIONS,
          id: invitation.id as string | number,
          data: { status: 'expired' } as never,
          overrideAccess: true,
          req,
        });
      }
      if (status !== 'pending') {
        const messages: Record<string, string> = {
          accepted: 'Este convite já foi utilizado.',
          revoked: 'Este convite foi revogado.',
          expired: 'Este convite expirou. Peça um novo ao responsável pela empresa.',
        };
        throw new InviteError(409, 'CONFLICT', messages[status] ?? 'Convite indisponível.');
      }
      if (String(user.email ?? '').toLowerCase() !== invitation.email) {
        throw new InviteError(
          403,
          'EMAIL_MISMATCH',
          'Este convite foi emitido para outro e-mail. Entre com a conta do convidado.',
        );
      }
      const account = (await req.payload.findByID({
        collection: 'users',
        id: user.id,
        depth: 0,
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>;
      if (account.accountStatus !== 'active') {
        throw new InviteError(
          403,
          'ACCOUNT_NOT_ACTIVE',
          'Sua conta ainda não foi validada pela equipe Omnia. Após a validação, use o mesmo link.',
        );
      }
      const platformRole = getUserRole(account as never);
      if (!canAcceptInvitationWithPlatformRole(platformRole)) {
        throw new InviteError(
          403,
          'ACADEMIC_ACCOUNT',
          'Contas de aluno ou professor não podem ser vinculadas a empresas. Use uma conta empresarial separada.',
        );
      }

      const partnerId = getRelationId(invitation.partner)!;
      const role = invitation.role as MembershipRole;
      const existing = (
        await req.payload.find({
          collection: MEMBERSHIPS,
          where: { and: [{ user: { equals: user.id } }, { partner: { equals: partnerId } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
      ).docs[0] as unknown as Record<string, unknown> | undefined;
      const membershipContext = { marketplaceInvitationAccept: true };
      if (existing) {
        await req.payload.update({
          collection: MEMBERSHIPS,
          id: existing.id as string | number,
          data: { role, status: 'active' } as never,
          overrideAccess: true,
          context: membershipContext,
          req,
        });
      } else {
        await req.payload.create({
          collection: MEMBERSHIPS,
          data: {
            user: user.id,
            partner: partnerId,
            role,
            status: 'active',
            invitedBy: getRelationId(invitation.invitedBy) ?? undefined,
          } as never,
          overrideAccess: true,
          context: membershipContext,
          req,
        });
      }
      if (platformRole === 'client') {
        await req.payload.update({
          collection: 'users',
          id: user.id,
          data: { role: 'partner' } as never,
          overrideAccess: true,
          context: { marketplaceInvitationAccept: true },
          req,
        });
      }
      await req.payload.update({
        collection: INVITATIONS,
        id: invitation.id as string | number,
        data: {
          status: 'accepted',
          acceptedBy: user.id,
          acceptedAt: new Date().toISOString(),
        } as never,
        overrideAccess: true,
        req,
      });
      await recordMarketplaceAudit(req, {
        type: 'invitation_accepted',
        partner: partnerId,
        subjectUser: user.id,
        targetCollection: 'partner-invitations',
        targetId: invitation.id,
        data: { role, platformRoleBefore: platformRole, reactivated: Boolean(existing) },
      });
      if (shouldCommit) await commitTransaction(req);
      return respond(200, {
        ok: true,
        code: 'ACCEPTED',
        message: 'Convite aceito. Bem-vindo ao painel do parceiro.',
      });
    } catch (error) {
      if (shouldCommit) await killTransaction(req);
      if (error instanceof InviteError) return fail(error.status, error.code, error.message);
      req.payload.logger.error('partner-invitation-accept: failed');
      return fail(500, 'INTERNAL_ERROR', 'Não foi possível aceitar o convite.');
    }
  },
};

/**
 * GET /omnia/partner-team?partnerId= — membros e convites da empresa para quem gerencia a equipe.
 * Expõe só nome/e-mail dos membros da própria empresa (a ACL de `users` continua restrita).
 */
export const partnerTeamEndpoint: Endpoint = {
  path: '/omnia/partner-team',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return fail(401, 'UNAUTHORIZED', 'Autenticação obrigatória.');
    const url = new URL(req.url || 'http://local', 'http://local');
    const partnerId = url.searchParams.get('partnerId')?.trim() ?? '';
    if (!/^\d{1,12}$/.test(partnerId)) return fail(422, 'UNPROCESSABLE', 'Informe a empresa.');
    const actorRole = await managerRole(req, partnerId);
    if (!actorRole) return fail(404, 'NOT_FOUND', 'Empresa não encontrada.');

    const memberships = (
      await req.payload.find({
        collection: MEMBERSHIPS,
        where: { partner: { equals: partnerId } },
        limit: 200,
        depth: 0,
        overrideAccess: true,
        req,
      })
    ).docs as unknown as Array<Record<string, unknown>>;
    const userIds = [
      ...new Set(memberships.map((m) => getRelationId(m.user)).filter((id) => id != null)),
    ];
    const users = userIds.length
      ? ((
          await req.payload.find({
            collection: 'users',
            where: { id: { in: userIds } },
            limit: userIds.length,
            depth: 0,
            overrideAccess: true,
            req,
          })
        ).docs as unknown as Array<Record<string, unknown>>)
      : [];
    const byId = new Map(users.map((u) => [String(u.id), u]));
    const invitations = (
      await req.payload.find({
        collection: INVITATIONS,
        where: { partner: { equals: partnerId } },
        sort: '-createdAt',
        limit: 50,
        depth: 0,
        overrideAccess: true,
        req,
      })
    ).docs as unknown as Array<Record<string, unknown>>;

    return respond(200, {
      ok: true,
      actorRole,
      members: memberships.map((m) => {
        const account = byId.get(String(getRelationId(m.user)));
        return {
          id: m.id,
          userId: getRelationId(m.user),
          name: (account?.name as string) || null,
          email: (account?.email as string) || null,
          role: m.role,
          status: m.status,
          isSelf: String(getRelationId(m.user)) === String(req.user!.id),
        };
      }),
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: invitationEffectiveStatus(inv),
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });
  },
};

export const partnerInvitationEndpoints: Endpoint[] = [
  partnerTeamEndpoint,
  partnerInvitationCreateEndpoint,
  partnerInvitationRevokeEndpoint,
  partnerInvitationPreviewEndpoint,
  partnerInvitationAcceptEndpoint,
];
