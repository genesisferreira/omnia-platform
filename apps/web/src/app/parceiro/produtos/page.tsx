import Link from 'next/link';

import { Button } from '@omnia/ui';

import {
  EmptyList,
  LoadError,
  NoPartnerNotice,
  PageHeader,
  StatusBadge,
} from '@/components/partner/ui';
import { listListings } from '@/lib/marketplace/client';
import { formatDateTime, labelOf, LISTING_STATUS_LABELS } from '@/lib/marketplace/labels';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Produtos' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ParceiroProdutosPage({ searchParams }: PageProps) {
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Produtos" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const status = first((await searchParams).status);
  const result = await listListings('product', {
    partnerId: ctx.selected.partner.id,
    status: status || undefined,
    limit: 50,
  });

  return (
    <>
      <PageHeader
        title="Meus produtos"
        description="Cadastre anúncios técnicos. A publicação no marketplace exige moderação da equipe Omnia."
        action={
          ctx.selected.canEdit ? (
            <Button asChild size="sm">
              <Link href="/parceiro/produtos/novo">Novo produto</Link>
            </Button>
          ) : null
        }
      />
      {!result.ok ? <LoadError message={result.error} /> : null}
      {result.ok && result.data.docs.length === 0 ? (
        <EmptyList
          title="Nenhum produto cadastrado"
          description="Crie o primeiro anúncio para começar a receber solicitações de orçamento."
          actionHref={ctx.selected.canEdit ? '/parceiro/produtos/novo' : undefined}
          actionLabel="Novo produto"
        />
      ) : null}
      {result.ok && result.data.docs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-omnia-deep-blue/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-omnia-ice/60 text-omnia-graphite-light">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {result.data.docs.map((doc) => (
                <tr key={String(doc.id)} className="border-t border-omnia-deep-blue/5 hover:bg-omnia-ice/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/parceiro/produtos/${doc.id}`}
                      className="font-medium text-omnia-deep-blue underline-offset-2 hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{doc.category || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={doc.status}>
                      {labelOf(LISTING_STATUS_LABELS, doc.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-omnia-graphite-light">{formatDateTime(doc.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
