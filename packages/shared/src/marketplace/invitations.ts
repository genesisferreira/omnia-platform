import { MEMBERSHIP_ROLE_VALUES, type MembershipRole } from './constants';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITATION_STATUS_VALUES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUS_VALUES)[number];

/** Quem convida: staff da Omnia ou o papel do convidador na empresa. */
export type InviterRole = MembershipRole | 'staff';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export function isMembershipRoleValue(value: unknown): value is MembershipRole {
  return typeof value === 'string' && (MEMBERSHIP_ROLE_VALUES as readonly string[]).includes(value);
}

/** Owner só por staff ou owner; manager convida manager/editor/viewer; editor e viewer não convidam. */
export function canInviteRole(inviter: InviterRole, target: MembershipRole): boolean {
  if (inviter === 'staff' || inviter === 'owner') return true;
  if (inviter === 'manager') return target !== 'owner';
  return false;
}

/**
 * Alteração de papel em associação existente. Manager nunca toca em owner nem promove a owner.
 */
export function canChangeMembershipRole(
  actor: InviterRole,
  currentRole: MembershipRole,
  nextRole: MembershipRole,
): boolean {
  if (actor === 'staff' || actor === 'owner') return true;
  if (actor === 'manager') return currentRole !== 'owner' && nextRole !== 'owner';
  return false;
}

/**
 * Papéis de plataforma que podem aceitar convite. Aluno e professor ficam de fora para que o
 * aceite nunca altere o papel de uma conta acadêmica; usam uma conta empresarial separada.
 */
export function canAcceptInvitationWithPlatformRole(role: unknown): boolean {
  return typeof role === 'string' && role !== 'student' && role !== 'instructor';
}

export function invitationEffectiveStatus(
  invitation: { status?: unknown; expiresAt?: unknown },
  now: Date = new Date(),
): InvitationStatus {
  const status = invitation.status;
  if (status === 'accepted' || status === 'revoked' || status === 'expired') return status;
  const expires = typeof invitation.expiresAt === 'string' ? Date.parse(invitation.expiresAt) : NaN;
  if (!Number.isFinite(expires) || expires <= now.getTime()) return 'expired';
  return 'pending';
}
