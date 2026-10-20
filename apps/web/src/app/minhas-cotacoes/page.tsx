import Link from 'next/link';

import { Button } from '@omnia/ui';

import {
  EmptyList,
  LoadError,
  PageHeader,
  Pagination,
  StatusBadge,
  pageParam,
} from '@/components/partner/ui';
import { requirePortalSession } from '@/lib/auth/require-session';
import { quoteListingTitle, quotePartnerName } from '@/lib/marketplace/buyer';
import { listBuyerQuoteRequests } from '@/lib/marketplace/client';
import {
  formatDateTime,
  labelOf,
  QUOTE_SOURCE_LABELS,
  QUOTE_STATUS_LABELS,
} from '@/lib/marketplace/labels';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MinhasCotacoesPage({ searchParams }: PageProps) {
  const user = await requirePortalSession('/minhas-cotacoes');
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const result = await listBuyerQuoteRequests({ buyerId: user.id, page });

  return (
    <>
      <PageHeader
        title="Minhas cotações"
        description="Acompanhe as solicitações enviadas aos parceiros, as propostas recebidas e responda por aqui."
        action={
          <Button asChild variant="outline">
            <Link href="/marketplace">Nova solicitação</Link>
          </Button>
        }
      />
      {!result.ok ? <LoadError message={result.error} /> : null}
      {result.ok && result.data.docs.length === 0 ? (
        <EmptyList
          title="Nenhuma cotação ainda"
          description="Encontre produtos e serviços no marketplace e solicite um orçamento."
          actionHref="/marketplace"
          actionLabel="Ir ao marketplace"
        />
      ) : null}
      {result.ok && result.data.docs.length > 0 ? (
        <>
          <ul className="space-y-3">
            {result.data.docs.map((quote) => {
              const listing = quoteListingTitle(quote);
              return (
                <li key={String(quote.id)}>
                  <Link
                    href={`/minhas-cotacoes/${quote.id}`}
                    className="block rounded-lg border border-omnia-deep-blue/10 bg-white p-4 transition-colors hover:border-omnia-deep-blue/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omnia-emerald"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-omnia-deep-blue">
                        {quote.publicId || `Solicitação #${quote.id}`}
                      </p>
                      <StatusBadge tone={quote.status}>
                        {labelOf(QUOTE_STATUS_LABELS, quote.status)}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-omnia-graphite">
                      {quotePartnerName(quote)} · {labelOf(QUOTE_SOURCE_LABELS, quote.sourceType)}
                      {listing ? ` · ${listing}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-omnia-graphite-light">
                      Enviada em {formatDateTime(quote.createdAt)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination
            basePath="/minhas-cotacoes"
            page={result.data.page}
            totalPages={result.data.totalPages}
          />
        </>
      ) : null}
    </>
  );
}
