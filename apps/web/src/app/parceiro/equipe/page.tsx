import {
  inviteMemberAction,
  revokeInvitationAction,
  updateMemberAction,
} from '@/app/parceiro/equipe/actions';
import { InviteForm, MemberControls, RevokeInviteButton } from '@/components/partner/TeamForms';
import { LoadError, NoPartnerNotice, PageHeader, StatusBadge } from '@/components/partner/ui';
import { fetchPartnerTeam } from '@/lib/marketplace/client';
import { formatDateTime, labelOf, MEMBERSHIP_ROLE_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Equipe' };

const INVITE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  revoked: 'Revogado',
  expired: 'Expirado',
};
const MEMBER_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  invited: 'Convidado',
  revoked: 'Revogado',
};

export default async function EquipePage() {
  const ctx = await requirePartnerContext();

  if (!ctx.selected) {
    if (!ctx.isStaff) {
      return (
        <>
          <PageHeader title="Equipe" />
          <NoPartnerNotice ctx={ctx} />
        </>
      );
    }
    return (
      <>
        <PageHeader
          title="Convite de responsável"
          description="Equipe Omnia: após aprovar o cadastro de um parceiro, gere o convite do responsável informado no cadastro."
        />
        <InviteForm action={inviteMemberAction} allowOwner askPartnerId />
      </>
    );
  }

  if (!ctx.selected.canManage) {
    return (
      <>
        <PageHeader title="Equipe" />
        <LoadError message="Somente proprietários e gerentes da empresa gerenciam a equipe." />
      </>
    );
  }

  const team = await fetchPartnerTeam(ctx.selected.partner.id);
  if (!team.ok) return <LoadError message={team.error} />;
  const isOwner = team.data.actorRole === 'owner' || team.data.actorRole === 'staff';

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Convide colaboradores por link pessoal. O convidado entra com o próprio e-mail; ninguém é vinculado sem aceitar."
      />

      <section className="mb-8">
        <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Convidar pessoa</h2>
        <InviteForm action={inviteMemberAction} allowOwner={isOwner} askPartnerId={false} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Membros</h2>
        <ul className="divide-y divide-omnia-deep-blue/10 rounded-lg border border-omnia-deep-blue/10 bg-white">
          {team.data.members.map((member) => {
            const editable =
              !member.isSelf && member.status === 'active' && (isOwner || member.role !== 'owner');
            return (
              <li
                key={String(member.id)}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium text-omnia-deep-blue">
                    {member.name || member.email || `Usuário #${member.userId}`}
                    {member.isSelf ? ' (você)' : ''}
                  </p>
                  <p className="text-xs text-omnia-graphite-light">
                    {member.email ?? '—'} · {labelOf(MEMBERSHIP_ROLE_LABELS, member.role)} ·{' '}
                    <StatusBadge tone={member.status === 'active' ? 'published' : 'declined'}>
                      {MEMBER_STATUS_LABELS[member.status] ?? member.status}
                    </StatusBadge>
                  </p>
                </div>
                <MemberControls
                  action={updateMemberAction}
                  membershipId={String(member.id)}
                  role={member.role}
                  allowOwner={isOwner}
                  editable={editable}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Convites</h2>
        {team.data.invitations.length === 0 ? (
          <p className="text-sm text-omnia-graphite-light">Nenhum convite enviado.</p>
        ) : (
          <ul className="divide-y divide-omnia-deep-blue/10 rounded-lg border border-omnia-deep-blue/10 bg-white text-sm">
            {team.data.invitations.map((invitation) => (
              <li
                key={String(invitation.id)}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span>
                  {invitation.email} · {labelOf(MEMBERSHIP_ROLE_LABELS, invitation.role)} ·{' '}
                  {INVITE_STATUS_LABELS[invitation.status] ?? invitation.status} · expira{' '}
                  {formatDateTime(invitation.expiresAt)}
                </span>
                {invitation.status === 'pending' ? (
                  <RevokeInviteButton
                    action={revokeInvitationAction}
                    invitationId={String(invitation.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
