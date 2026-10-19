import Link from 'next/link';
import { notFound } from 'next/navigation';

import { formatPriceCents, type QuoteStatus } from '@omnia/shared';
import { Alert } from '@omnia/ui';

import { buyerMessageAction, respondQuoteAction } from '@/app/minhas-cotacoes/actions';
import { BuyerMessageForm, BuyerRespondForm } from '@/components/marketplace/BuyerQuoteForms';
import { LoadError, PageHeader, StatusBadge } from '@/components/partner/ui';
import { requirePortalSession } from '@/lib/auth/require-session';
import { buyerActionsFor, quoteListingTitle, quotePartnerName } from '@/lib/marketplace/buyer';
import {
  getQuoteRequest,
  listBuyerProposals,
  listProposalVersions,
  listQuoteEvents,
  relationId,
} from '@/lib/marketplace/client';
import {
  formatDate,
  formatDateTime,
  labelOf,
  PROPOSAL_STATUS_LABELS,
  QUOTE_EVENT_LABELS,
  QUOTE_SOURCE_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/lib/marketplace/labels';
import type { QuoteProposalVersionDoc } from '@/lib/marketplace/types';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  return { title: `Cotação ${(await params).id}` };
}

const RESPONSE_NOTICES: Record<string, string> = {
  accept: 'Proposta aceita. O parceiro foi notificado no painel e entrará em contato.',
  decline: 'Proposta recusada.',
  negotiate: 'Pedido de renegociação enviado. Você verá a nova versão aqui.',
};

function VersionCard({ version, current }: { version: QuoteProposalVersionDoc; current: boolean }) {
  return (
    <article
      className={`rounded-lg border p-4 ${current ? 'border-omnia-emerald/60 bg-white' : 'border-omnia-deep-blue/10 bg-slate-50'}`}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-omnia-deep-blue">
          Versão {version.versionNumber}
          {current ? ' (vigente)' : ''}
        </h3>
        <p className="text-xs text-omnia-graphite-light">Enviada em {formatDateTime(version.sentAt)}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-omnia-graphite-light">
              <th className="py-1 pr-2">Item</th>
              <th className="py-1 pr-2 text-right">Qtd</th>
              <th className="py-1 pr-2 text-right">Unitário</th>
              <th className="py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(version.items ?? []).map((item, index) => (
              <tr key={index} className="border-t border-omnia-deep-blue/10">
                <td className="py-1 pr-2">{item.description}</td>
                <td className="py-1 pr-2 text-right">{item.quantity}</td>
                <td className="py-1 pr-2 text-right">{formatPriceCents(item.unitPriceCents)}</td>
                <td className="py-1 text-right">{formatPriceCents(item.quantity * item.unitPriceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:max-w-xs sm:justify-self-end">
        <dt className="text-omnia-graphite-light">Subtotal</dt>
        <dd className="text-right">{formatPriceCents(version.subtotalCents)}</dd>
        <dt className="text-omnia-graphite-light">Desconto</dt>
        <dd className="text-right">{formatPriceCents(version.discountCents ?? 0)}</dd>
        <dt className="text-omnia-graphite-light">Frete</dt>
        <dd className="text-right">{formatPriceCents(version.shippingCents ?? 0)}</dd>
        <dt className="font-medium text-omnia-deep-blue">Total</dt>
        <dd className="text-right font-semibold text-omnia-deep-blue">{formatPriceCents(version.totalCents)}</dd>
      </dl>
      <p className="mt-2 text-xs text-omnia-graphite-light">
        Validade: {formatDate(version.validUntil)} · Entrega: {version.deliveryDays != null ? `${version.deliveryDays} dias` : '—'}
        {version.paymentTerms ? ` · Pagamento: ${version.paymentTerms}` : ''}
      </p>
      {version.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-omnia-graphite">{version.notes}</p> : null}
    </article>
  );
}

export default async function MinhaCotacaoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requirePortalSession(`/minhas-cotacoes/${id}`);

  const quote = await getQuoteRequest(id);
  if (!quote.ok) {
    if (quote.status === 404 || quote.status === 403) notFound();
    return <LoadError message={quote.error} />;
  }
  // Parceiros também leem a cotação pela ACL; esta página é exclusiva do comprador.
  if (relationId(quote.data.buyerUser) !== String(user.id)) notFound();

  const [proposals, events] = await Promise.all([listBuyerProposals(id), listQuoteEvents(id)]);
  const proposalDocs = proposals.ok ? proposals.data.docs : [];
  const versions = proposalDocs.length
    ? await listProposalVersions(proposalDocs.map((doc) => doc.id))
    : null;
  const versionsByProposal = new Map<string, QuoteProposalVersionDoc[]>();
  if (versions?.ok) {
    for (const version of versions.data.docs) {
      const key = relationId(version.proposal) ?? '';
      versionsByProposal.set(key, [...(versionsByProposal.get(key) ?? []), version]);
    }
  }

  const status = quote.data.status as QuoteStatus;
  const hasSentProposal = proposalDocs.some((doc) => doc.status === 'sent');
  const actions = buyerActionsFor(status, hasSentProposal);
  const listing = quoteListingTitle(quote.data);
  const notice = typeof sp.resposta === 'string' ? RESPONSE_NOTICES[sp.resposta] : undefined;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/minhas-cotacoes" className="text-omnia-deep-blue underline">
          ← Minhas cotações
        </Link>
      </p>
      <PageHeader
        title={quote.data.publicId || `Solicitação #${quote.data.id}`}
        description={
          <>
            {quotePartnerName(quote.data)} · {labelOf(QUOTE_SOURCE_LABELS, quote.data.sourceType)}
            {listing ? ` · ${listing}` : ''} ·{' '}
            <StatusBadge tone={status}>{labelOf(QUOTE_STATUS_LABELS, status)}</StatusBadge>
          </>
        }
      />
      {notice ? (
        <Alert variant="success" className="mb-4" title="Resposta registrada">
          {notice}
        </Alert>
      ) : null}
      {sp.mensagem === 'ok' ? (
        <Alert variant="success" className="mb-4" title="Mensagem enviada">
          O parceiro verá sua mensagem no painel.
        </Alert>
      ) : null}

      <section className="mb-8 space-y-2 rounded-lg border border-omnia-deep-blue/10 bg-white p-4">
        <h2 className="font-heading text-lg text-omnia-deep-blue">Sua necessidade</h2>
        <p className="whitespace-pre-wrap text-sm text-omnia-graphite">{quote.data.description}</p>
        <p className="text-xs text-omnia-graphite-light">
          Local: {[quote.data.city, quote.data.state].filter(Boolean).join(' / ') || '—'} · Qtd:{' '}
          {quote.data.quantity ?? '—'} · Enviada em {formatDateTime(quote.data.createdAt)}
        </p>
      </section>

      <section className="mb-8 space-y-4">
        <h2 className="font-heading text-lg text-omnia-deep-blue">Propostas</h2>
        {!proposals.ok ? <LoadError message={proposals.error} /> : null}
        {proposals.ok && proposalDocs.length === 0 ? (
          <p className="text-sm text-omnia-graphite-light">
            O parceiro ainda não enviou proposta. Você verá aqui cada versão enviada.
          </p>
        ) : null}
        {versions && !versions.ok ? <LoadError message={versions.error} /> : null}
        {proposalDocs.map((proposal) => {
          const list = versionsByProposal.get(String(proposal.id)) ?? [];
          const currentNumber = Math.max(0, ...list.map((version) => version.versionNumber));
          return (
            <div key={String(proposal.id)} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-omnia-deep-blue">{proposal.title}</h3>
                <StatusBadge tone={proposal.status}>{labelOf(PROPOSAL_STATUS_LABELS, proposal.status)}</StatusBadge>
              </div>
              {proposal.summary ? (
                <p className="whitespace-pre-wrap text-sm text-omnia-graphite">{proposal.summary}</p>
              ) : null}
              {list.map((version) => (
                <VersionCard key={String(version.id)} version={version} current={version.versionNumber === currentNumber} />
              ))}
              {list.length > 1 ? (
                <p className="text-xs text-omnia-graphite-light">
                  Versões anteriores ficam registradas e não podem ser alteradas.
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      {actions.canAccept || actions.canNegotiate || actions.canDecline ? (
        <section className="mb-8">
          <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Responder</h2>
          <BuyerRespondForm action={respondQuoteAction.bind(null, id)} {...actions} />
        </section>
      ) : null}

      {!['accepted', 'declined', 'cancelled', 'expired'].includes(status) ? (
        <section className="mb-8">
          <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Mensagem ao parceiro</h2>
          <BuyerMessageForm action={buyerMessageAction.bind(null, id)} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-heading text-lg text-omnia-deep-blue">Histórico</h2>
        {!events.ok ? <LoadError message={events.error} /> : null}
        {events.ok ? (
          <ol className="space-y-3 border-l border-omnia-deep-blue/20 pl-4 text-sm">
            {events.data.docs.map((event) => (
              <li key={String(event.id)}>
                <p className="font-medium text-omnia-deep-blue">{labelOf(QUOTE_EVENT_LABELS, event.type)}</p>
                {event.message ? <p className="whitespace-pre-wrap text-omnia-graphite">{event.message}</p> : null}
                <p className="text-xs text-omnia-graphite-light">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </>
  );
}
