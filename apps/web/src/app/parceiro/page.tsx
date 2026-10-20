import Link from 'next/link';

import { Button } from '@omnia/ui';

import {
  LoadError,
  NoPartnerNotice,
  PageHeader,
  PartnerStatusAlert,
  StatCard,
} from '@/components/partner/ui';
import { fetchPartnerDashboard } from '@/lib/marketplace/client';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Dashboard' };

export default async function ParceiroDashboardPage() {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Painel do parceiro" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const partner = ctx.selected.partner;
  const result = await fetchPartnerDashboard({ partnerId: partner.id, token: ctx.token });
  const stats = result.ok ? result.data.stats : null;

  return (
    <>
      <PageHeader
        title={`Olá, ${partner.displayName}`}
        description="Resumo real da sua operação no marketplace Omnia. Os números abaixo vêm diretamente dos seus cadastros."
        action={
          ctx.selected.canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/parceiro/produtos/novo">Novo produto</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/parceiro/servicos/novo">Novo serviço</Link>
              </Button>
            </div>
          ) : null
        }
      />
      <PartnerStatusAlert partner={partner} />
      {!result.ok ? <LoadError message={result.error} /> : null}
      {stats ? (
        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Produtos"
            value={stats.products.total}
            hint={`${stats.products.byStatus.published ?? 0} publicados · ${stats.products.byStatus.pending ?? 0} em moderação · ${stats.products.byStatus.draft ?? 0} rascunhos`}
            href="/parceiro/produtos"
          />
          <StatCard
            label="Serviços"
            value={stats.services.total}
            hint={`${stats.services.byStatus.published ?? 0} publicados · ${stats.services.byStatus.pending ?? 0} em moderação · ${stats.services.byStatus.draft ?? 0} rascunhos`}
            href="/parceiro/servicos"
          />
          <StatCard
            label="Solicitações abertas"
            value={stats.quotes.open}
            hint={`${stats.quotes.byStatus.submitted ?? 0} novas · ${stats.quotes.total} no total`}
            href="/parceiro/solicitacoes"
          />
          <StatCard
            label="Propostas enviadas"
            value={stats.proposals.byStatus.sent ?? 0}
            hint={`${stats.proposals.total} propostas no total`}
            href="/parceiro/orcamentos"
          />
        </section>
      ) : null}
      {stats && stats.quotes.byStatus.submitted ? (
        <p className="mt-6 text-sm text-omnia-graphite">
          Você tem <strong>{stats.quotes.byStatus.submitted}</strong> solicitação(ões) nova(s)
          aguardando análise.{' '}
          <Link
            href="/parceiro/solicitacoes?status=submitted"
            className="text-omnia-deep-blue underline"
          >
            Ver agora
          </Link>
        </p>
      ) : null}
    </>
  );
}
