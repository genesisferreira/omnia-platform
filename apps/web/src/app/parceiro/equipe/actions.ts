'use server';

import { revalidatePath } from 'next/cache';

import {
  createPartnerInvitation,
  revokePartnerInvitation,
  updateMembership,
} from '@/lib/marketplace/client';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';
import { getPublicSiteOrigin } from '@/lib/seo/site-url';

export type TeamActionState = { error?: string; message?: string; inviteLink?: string };

const ROLES = ['owner', 'manager', 'editor', 'viewer'] as const;

function text(formData: FormData, name: string, max = 254): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Empresa alvo: a selecionada no painel; staff sem vínculo informa o id (validado no Admin). */
async function targetPartner(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await requirePartnerContext();
  if (ctx.selected) return { ok: true, id: ctx.selected.partner.id };
  if (ctx.isStaff) {
    const id = text(formData, 'partnerId', 12);
    if (/^\d{1,12}$/.test(id)) return { ok: true, id };
    return { ok: false, error: 'Informe o ID numérico da empresa.' };
  }
  return { ok: false, error: 'Nenhuma empresa vinculada à sua conta.' };
}

export async function inviteMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const partner = await targetPartner(formData);
  if (!partner.ok) return { error: partner.error };
  const email = text(formData, 'email');
  const role = text(formData, 'role', 20);
  if (!(ROLES as readonly string[]).includes(role)) return { error: 'Escolha o papel.' };
  const result = await createPartnerInvitation({ partnerId: partner.id, email, role });
  if (!result.ok) return { error: result.error };
  revalidatePath('/parceiro/equipe');
  // O token só existe nesta resposta: o link é mostrado uma vez e não fica em URL/logs do servidor.
  return {
    message: result.data.message,
    inviteLink: `${getPublicSiteOrigin()}/convite?token=${encodeURIComponent(result.data.token)}`,
  };
}

export async function revokeInvitationAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requirePartnerContext();
  const id = text(formData, 'invitationId', 12);
  if (!/^\d{1,12}$/.test(id)) return { error: 'Convite inválido.' };
  const result = await revokePartnerInvitation(id);
  if (!result.ok) return { error: result.error };
  revalidatePath('/parceiro/equipe');
  return { message: result.data.message };
}

export async function updateMemberAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requirePartnerContext();
  const id = text(formData, 'membershipId', 12);
  const intent = text(formData, 'intent', 20);
  if (!/^\d{1,12}$/.test(id)) return { error: 'Membro inválido.' };
  let data: { role?: string; status?: string };
  if (intent === 'revoke') {
    data = { status: 'revoked' };
  } else {
    const role = text(formData, 'role', 20);
    if (!(ROLES as readonly string[]).includes(role)) return { error: 'Papel inválido.' };
    data = { role };
  }
  const result = await updateMembership(id, data);
  if (!result.ok) return { error: result.error };
  revalidatePath('/parceiro/equipe');
  return { message: intent === 'revoke' ? 'Acesso revogado.' : 'Papel atualizado.' };
}
