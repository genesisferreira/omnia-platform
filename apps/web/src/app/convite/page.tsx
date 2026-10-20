import type { Metadata } from 'next';

import { Alert, Container } from '@omnia/ui';

import { acceptInvitationAction } from '@/app/convite/actions';
import { AcceptInviteForm } from '@/components/partner/AcceptInviteForm';
import { requirePortalSession } from '@/lib/auth/require-session';
import { previewPartnerInvitation } from '@/lib/marketplace/client';
import { formatDateTime, labelOf, MEMBERSHIP_ROLE_LABELS } from '@/lib/marketplace/labels';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Convite para equipe de parceiro',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS_MESSAGES: Record<string, string> = {
  accepted: 'Este convite já foi utilizado.',
  revoked: 'Este convite foi revogado pela empresa.',
  expired: 'Este convite expirou. Peça um novo ao responsável pela empresa.',
};

export default async function ConvitePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  await requirePortalSession(token ? `/convite?token=${encodeURIComponent(token)}` : '/convite');

  const preview = /^[A-Za-z0-9_-]{43}$/.test(token) ? await previewPartnerInvitation(token) : null;

  return (
    <Container className="max-w-xl py-12">
      <h1 className="mb-4 font-heading text-2xl font-semibold text-omnia-deep-blue">
        Convite para equipe
      </h1>
      {!preview || !preview.ok ? (
        <Alert variant="destructive" title="Convite inválido">
          {preview && !preview.ok
            ? preview.error
            : 'O link está incompleto. Abra o link recebido por inteiro.'}
        </Alert>
      ) : preview.data.invitation.status !== 'pending' ? (
        <Alert variant="warning" title="Convite indisponível">
          {STATUS_MESSAGES[preview.data.invitation.status] ?? 'Convite indisponível.'}
        </Alert>
      ) : !preview.data.invitation.emailMatches ? (
        <Alert variant="warning" title="Outro e-mail">
          Este convite foi emitido para outro e-mail. Saia e entre com a conta do convidado.
        </Alert>
      ) : (
        <div className="space-y-4 rounded-lg border border-omnia-deep-blue/10 bg-white p-5">
          <p className="text-omnia-graphite">
            Você foi convidado para a equipe de{' '}
            <strong className="text-omnia-deep-blue">{preview.data.invitation.partnerName}</strong>{' '}
            como <strong>{labelOf(MEMBERSHIP_ROLE_LABELS, preview.data.invitation.role)}</strong>.
          </p>
          <p className="text-xs text-omnia-graphite-light">
            Válido até {formatDateTime(preview.data.invitation.expiresAt)}. Contas de aluno ou
            professor não podem ser vinculadas; use uma conta empresarial validada pela equipe
            Omnia.
          </p>
          <AcceptInviteForm action={acceptInvitationAction} token={token} />
        </div>
      )}
    </Container>
  );
}
