import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isStaffRole } from '@omnia/constants';

import { getAdminLoginUrl } from '@/lib/auth/admin-url';
import { requirePortalSession } from '@/lib/auth/require-session';
import { getSessionToken } from '@/lib/auth/session';

import { fetchPartnerDashboard } from './client';
import { PARTNER_COOKIE, PARTNER_HEADER, pickSelectedMembership } from './selected-partner';
import type { PartnerContext } from './types';

export { PARTNER_COOKIE, PARTNER_HEADER, pickSelectedMembership };

export function isPartnerPanelRole(role: string | null | undefined): boolean {
  return role === 'partner' || isStaffRole(role);
}

const loadPartnerContext = cache(async (): Promise<PartnerContext> => {
  const user = await requirePortalSession('/parceiro');
  if (!isPartnerPanelRole(user.role)) {
    // Comprador autenticado: sem painel de parceiro.
    redirect('/minha-conta');
  }

  const token = await getSessionToken();
  if (!token) redirect(getAdminLoginUrl('/parceiro'));

  const isStaff = isStaffRole(user.role);
  const dashboard = await fetchPartnerDashboard({ stats: false, token });
  if (!dashboard.ok && dashboard.status === 401) redirect(getAdminLoginUrl('/parceiro'));

  const memberships = dashboard.ok ? dashboard.data.memberships : [];
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const selected = pickSelectedMembership(memberships, [
    headerStore.get(PARTNER_HEADER),
    cookieStore.get(PARTNER_COOKIE)?.value,
  ]);

  return {
    user,
    token,
    memberships,
    selected,
    hasMembership: memberships.length > 0,
    isStaff,
  };
});

/** Sessão + papel parceiro (ou staff) + associações ativas. Sem associação => `selected: null`. */
export function requirePartnerContext(): Promise<PartnerContext> {
  return loadPartnerContext();
}
