import Link from 'next/link';

import {
  EmptyList,
  LoadError,
  NoPartnerNotice,
  PageHeader,
  StatusBadge,
} from '@/components/partner/ui';
import { listQuoteRequests } from '@/lib/marketplace/client';
import { formatDateTime, labelOf, QUOTE_STATUS_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Oportunidades' };

const OPEN = ['submitted', 'in_review', 'proposal_sent', 'negotiating'] as const;

export default async function OportunidadesPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Oportunidades" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const result = await listQuoteRequests({
    partnerId: ctx.selected.partner.id,
    statuses: OPEN,
    limit: 50,
  });

  return (
    <>
      <PageHeader
        title="Oportunidades abertas"
        description="Negociações em andamento (enviadas, em análise, com proposta ou em renegociação)."
      />
      {!result.ok ? <LoadError message={result.error} /> : null}
      {result.ok && result.data.docs.length === 0 ? (
        <EmptyList
          title="Nenhuma oportunidade aberta"
          description="Quando houver solicitações ativas, elas aparecerão nesta lista."
        />
      ) : null}
      {result.ok && result.data.docs.length > 0 ? (
        <ul className="space-y-3">
          {result.data.docs.map((doc) => (
            <li
              key={String(doc.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-omnia-deep-blue/10 px-4 py-3"
            >
              <div>
                <Link
                  href={`/parceiro/solicitacoes/${doc.id}`}
                  className="font-medium text-omnia-deep-blue underline-offset-2 hover:underline"
                >
                  {doc.publicId || `#${doc.id}`}
                </Link>
                <p className="text-xs text-omnia-graphite-light">{formatDateTime(doc.createdAt)}</p>
              </div>
              <StatusBadge tone={doc.status}>
                {labelOf(QUOTE_STATUS_LABELS, doc.status)}
              </StatusBadge>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
