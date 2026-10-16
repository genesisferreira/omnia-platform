import {
  LISTING_STATUS_VALUES,
  PROPOSAL_STATUS_VALUES,
  QUOTE_STATUS_VALUES,
} from '@omnia/shared';
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@omnia/ui';

import { LoadError, NoPartnerNotice, PageHeader } from '@/components/partner/ui';
import { fetchPartnerDashboard } from '@/lib/marketplace/client';
import {
  LISTING_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  QUOTE_STATUS_LABELS,
  labelOf,
} from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';
import type { StatusCounts } from '@/lib/marketplace/types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Estatísticas' };

function CountCard(props: {
  title: string;
  counts: StatusCounts;
  statuses: readonly string[];
  labels: Record<string, string>;
}) {
  return (
    <Card className="border-omnia-deep-blue/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{props.title}</CardTitle>
        <p className="text-3xl font-semibold text-omnia-deep-blue">{props.counts.total}</p>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <caption className="sr-only">{props.title} por status</caption>
          <tbody>
            {props.statuses.map((status) => (
              <tr key={status} className="border-t border-omnia-deep-blue/10">
                <th scope="row" className="py-1.5 text-left font-normal text-omnia-graphite-light">
                  {labelOf(props.labels, status)}
                </th>
                <td className="py-1.5 text-right font-medium">{props.counts.byStatus[status] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function ParceiroEstatisticasPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Estatísticas" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const result = await fetchPartnerDashboard({ partnerId: ctx.selected.partner.id, token: ctx.token });
  const stats = result.ok ? result.data.stats : null;

  return (
    <>
      <PageHeader
        title="Estatísticas"
        description="Contadores atuais da sua operação, por status."
      />
      <Alert className="mb-6 max-w-3xl" title="Fase A — visão resumida">
        Exibimos apenas contagens reais dos seus cadastros. Visitas, conversão e histórico por período
        ainda não são medidos e, por isso, não aparecem aqui.
      </Alert>
      {!result.ok ? <LoadError message={result.error} /> : null}
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CountCard title="Produtos" counts={stats.products} statuses={LISTING_STATUS_VALUES} labels={LISTING_STATUS_LABELS} />
          <CountCard title="Serviços" counts={stats.services} statuses={LISTING_STATUS_VALUES} labels={LISTING_STATUS_LABELS} />
          <CountCard title="Solicitações" counts={stats.quotes} statuses={QUOTE_STATUS_VALUES} labels={QUOTE_STATUS_LABELS} />
          <CountCard title="Propostas" counts={stats.proposals} statuses={PROPOSAL_STATUS_VALUES} labels={PROPOSAL_STATUS_LABELS} />
        </div>
      ) : null}
    </>
  );
}
