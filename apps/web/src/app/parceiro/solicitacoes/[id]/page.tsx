import { Alert } from '@omnia/ui';
import { canTransitionQuote, type QuoteStatus } from '@omnia/shared';

import {
  quoteMessageAction,
  quoteStatusAction,
  sendProposalAction,
} from '@/app/parceiro/actions';
import { ProposalForm, QuoteMessageForm, QuoteStatusForm } from '@/components/partner/QuoteForms';
import { LoadError, NoPartnerNotice, PageHeader, StatusBadge } from '@/components/partner/ui';
import {
  getQuoteRequest,
  listProposals,
  listQuoteEvents,
  relationId,
} from '@/lib/marketplace/client';
import {
  formatDateTime,
  labelOf,
  QUOTE_EVENT_LABELS,
  QUOTE_SOURCE_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  return { title: `Solicitação ${(await params).id}` };
}

const PARTNER_TARGETS: Array<{ status: QuoteStatus; label: string }> = [
  { status: 'in_review', label: 'Marcar em análise' },
  { status: 'declined', label: 'Recusar solicitação' },
];

export default async function SolicitacaoDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Solicitação" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }

  const quote = await getQuoteRequest(id);
  if (!quote.ok) return <LoadError message={quote.error} />;
  if (relationId(quote.data.partner) !== ctx.selected.partner.id) {
    return <LoadError message="Esta solicitação não pertence à empresa selecionada." />;
  }

  const [events, proposals] = await Promise.all([
    listQuoteEvents(id),
    listProposals({ partnerId: ctx.selected.partner.id, quoteId: id, limit: 20 }),
  ]);

  const canEdit = ctx.selected.canEdit;
  const statusTargets = PARTNER_TARGETS.filter((target) =>
    canTransitionQuote(quote.data.status as QuoteStatus, target.status),
  );
  const canPropose =
    canEdit &&
    ['submitted', 'in_review', 'proposal_sent', 'negotiating'].includes(quote.data.status);

  return (
    <>
      <PageHeader
        title={quote.data.publicId || `Solicitação #${quote.data.id}`}
        description={
          <>
            {labelOf(QUOTE_SOURCE_LABELS, quote.data.sourceType)} ·{' '}
            <StatusBadge tone={quote.data.status}>
              {labelOf(QUOTE_STATUS_LABELS, quote.data.status)}
            </StatusBadge>
          </>
        }
      />
      {sp.proposta === 'enviada' ? (
        <Alert variant="success" className="mb-4" title="Proposta enviada">
          A versão foi registrada e o comprador poderá visualizá-la.
        </Alert>
      ) : null}

      <section className="mb-8 space-y-2 rounded-lg border border-omnia-deep-blue/10 bg-white p-4">
        <h2 className="font-heading text-lg text-omnia-deep-blue">Necessidade</h2>
        <p className="whitespace-pre-wrap text-sm text-omnia-graphite">{quote.data.description}</p>
        <p className="text-xs text-omnia-graphite-light">
          Local: {[quote.data.city, quote.data.state].filter(Boolean).join(' / ') || '—'} · Qtd:{' '}
          {quote.data.quantity ?? '—'} · Recebida em {formatDateTime(quote.data.createdAt)}
        </p>
      </section>

      {canEdit && statusTargets.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Atualizar status</h2>
          <QuoteStatusForm action={quoteStatusAction.bind(null, id)} targets={statusTargets} />
        </section>
      ) : null}

      {canPropose ? (
        <section className="mb-8">
          <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Enviar proposta</h2>
          <p className="mb-3 text-sm text-omnia-graphite-light">
            Cada envio gera uma versão imutável. Aceite comercial não gera cobrança automática nesta
            fase.
          </p>
          <ProposalForm
            action={sendProposalAction.bind(null, id)}
            defaultTitle={`Proposta ${quote.data.publicId || id}`}
            defaultQuantity={quote.data.quantity}
          />
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Propostas</h2>
        {!proposals.ok ? <LoadError message={proposals.error} /> : null}
        {proposals.ok && proposals.data.docs.length === 0 ? (
          <p className="text-sm text-omnia-graphite-light">Nenhuma proposta ainda.</p>
        ) : null}
        {proposals.ok ? (
          <ul className="space-y-2 text-sm">
            {proposals.data.docs.map((doc) => (
              <li key={String(doc.id)} className="rounded-md border border-omnia-deep-blue/10 px-3 py-2">
                {doc.title || `Proposta #${doc.id}`} · versão {doc.currentVersionNumber ?? '—'} ·{' '}
                {doc.status}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {canEdit ? (
        <section className="mb-8">
          <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Mensagem</h2>
          <QuoteMessageForm action={quoteMessageAction.bind(null, id)} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Histórico</h2>
        {!events.ok ? <LoadError message={events.error} /> : null}
        {events.ok ? (
          <ol className="space-y-3 border-l border-omnia-deep-blue/20 pl-4 text-sm">
            {events.data.docs.map((event) => (
              <li key={String(event.id)}>
                <p className="font-medium text-omnia-deep-blue">
                  {labelOf(QUOTE_EVENT_LABELS, event.type)}
                  {event.visibility === 'internal' ? ' (interno)' : ''}
                </p>
                {event.message ? <p className="text-omnia-graphite">{event.message}</p> : null}
                <p className="text-xs text-omnia-graphite-light">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </>
  );
}
