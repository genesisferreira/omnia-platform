'use server';

import { redirect } from 'next/navigation';

import { requirePortalSession } from '@/lib/auth/require-session';
import { acceptPartnerInvitation } from '@/lib/marketplace/client';

export type AcceptState = { error?: string };

export async function acceptInvitationAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get('token') ?? '');
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { error: 'Convite inválido.' };
  if (formData.get('confirm') !== 'on') return { error: 'Confirme que deseja entrar na equipe.' };
  await requirePortalSession('/convite');
  const result = await acceptPartnerInvitation(token);
  if (!result.ok) return { error: result.error };
  redirect('/parceiro?convite=aceito');
}
