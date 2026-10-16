import Link from 'next/link';

import {
  EmptyList,
  LoadError,
  NoPartnerNotice,
  PageHeader,
  StatusBadge,
} from '@/components/partner/ui';
import { listQuoteRequests } from '@/lib/marketplace/client';
import {
  formatDateTime,
  labelOf,
  QUOTE_SOURCE_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solicitações' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SolicitacoesPage({ searchParams }: PageProps) {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Solicitações" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const status = first((await searchParams).status);
  const result = await listQuoteRequests({
    partnerId: ctx.selected.partner.id,
    status: status || undefined,
    limit: 50,
  });

  return (
    <>
      <PageHeader
        title="Solicitações recebidas"
        description="Pedidos de orçamento destinados à sua empresa. Responda com propostas versionadas pelo painel."
      />
      {!result.ok ? <LoadError message={result.error} /> : null}
      {result.ok && result.data.docs.length === 0 ? (
        <EmptyList
          title="Nenhuma solicitação"
          description="Quando compradores pedirem orçamento dos seus anúncios, eles aparecerão aqui."
        />
      ) : null}
      {result.ok && result.data.docs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-omnia-deep-blue/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-omnia-ice/60 text-omnia-graphite-light">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recebida</th>
              </tr>
            </thead>
            <tbody>
              {result.data.docs.map((doc) => (
                <tr key={String(doc.id)} className="border-t border-omnia-deep-blue/5 hover:bg-omnia-ice/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/parceiro/solicitacoes/${doc.id}`}
                      className="font-medium text-omnia-deep-blue underline-offset-2 hover:underline"
                    >
                      {doc.publicId || `#${doc.id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{labelOf(QUOTE_SOURCE_LABELS, doc.sourceType)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={doc.status}>{labelOf(QUOTE_STATUS_LABELS, doc.status)}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-omnia-graphite-light">{formatDateTime(doc.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
