import Link from 'next/link';

import {
  EmptyList,
  LoadError,
  NoPartnerNotice,
  PageHeader,
  StatusBadge,
} from '@/components/partner/ui';
import { listProposals, relationId } from '@/lib/marketplace/client';
import { formatDateTime, labelOf, PROPOSAL_STATUS_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orçamentos' };

export default async function OrcamentosPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Orçamentos" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const result = await listProposals({ partnerId: ctx.selected.partner.id, limit: 50 });

  return (
    <>
      <PageHeader
        title="Meus orçamentos"
        description="Propostas enviadas às solicitações da sua empresa. As versões enviadas são imutáveis."
      />
      {!result.ok ? <LoadError message={result.error} /> : null}
      {result.ok && result.data.docs.length === 0 ? (
        <EmptyList
          title="Nenhuma proposta"
          description="Abra uma solicitação recebida para elaborar e enviar a primeira proposta."
          actionHref="/parceiro/solicitacoes"
          actionLabel="Ver solicitações"
        />
      ) : null}
      {result.ok && result.data.docs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-omnia-deep-blue/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-omnia-ice/60 text-omnia-graphite-light">
              <tr>
                <th className="px-4 py-3 font-medium">Proposta</th>
                <th className="px-4 py-3 font-medium">Solicitação</th>
                <th className="px-4 py-3 font-medium">Versão</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {result.data.docs.map((doc) => {
                const quoteId = relationId(doc.quoteRequest);
                return (
                  <tr key={String(doc.id)} className="border-t border-omnia-deep-blue/5">
                    <td className="px-4 py-3 font-medium text-omnia-deep-blue">
                      {doc.title || `#${doc.id}`}
                    </td>
                    <td className="px-4 py-3">
                      {quoteId ? (
                        <Link href={`/parceiro/solicitacoes/${quoteId}`} className="underline">
                          #{quoteId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{doc.currentVersionNumber ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={doc.status}>
                        {labelOf(PROPOSAL_STATUS_LABELS, doc.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-omnia-graphite-light">
                      {formatDateTime(doc.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
