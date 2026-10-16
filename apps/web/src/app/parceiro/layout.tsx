import type { Metadata } from 'next';

import { PartnerShell } from '@/components/partner/PartnerShell';
import { MEMBERSHIP_ROLE_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Painel do parceiro', template: '%s | Painel do parceiro' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePartnerContext();
  const selected = ctx.selected;

  return (
    <PartnerShell
      userName={ctx.user.name || ctx.user.email}
      partnerName={selected?.partner.displayName ?? null}
      roleLabel={selected ? (MEMBERSHIP_ROLE_LABELS[selected.role] ?? selected.role) : null}
      partners={ctx.memberships.map((entry) => ({ id: entry.partner.id, name: entry.partner.displayName }))}
      selectedPartnerId={selected?.partner.id ?? null}
    >
      {children}
    </PartnerShell>
  );
}
