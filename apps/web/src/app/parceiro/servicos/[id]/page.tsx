import Link from 'next/link';

import { buildListingPublicSlug, isMarketplacePdfUploadEnabled } from '@omnia/shared';
import { Alert } from '@omnia/ui';

import { removeListingFileAction, saveListingAction } from '@/app/parceiro/actions';
import { ListingFiles } from '@/components/partner/ListingFiles';
import { ListingForm } from '@/components/partner/ListingForm';
import { RevisionNotice } from '@/components/partner/RevisionNotice';
import { LoadError, NoPartnerNotice, PageHeader, StatusBadge } from '@/components/partner/ui';
import { getListing, relationId } from '@/lib/marketplace/client';
import { labelOf, LISTING_STATUS_LABELS } from '@/lib/marketplace/labels';
import { availableStatusIntents } from '@/lib/marketplace/listing-status';
import { requirePartnerContext } from '@/lib/marketplace/require-partner';
import { withPendingRevision } from '@/lib/marketplace/revision';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps) {
  return { title: `Serviço ${(await params).id}` };
}

export default async function EditarServicoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const salvo = (await searchParams).salvo;
  const ctx = await requirePartnerContext();
  if (!ctx.selected) {
    return (
      <>
        <PageHeader title="Serviço" />
        <NoPartnerNotice ctx={ctx} />
      </>
    );
  }
  const result = await getListing('service', id);
  if (!result.ok) return <LoadError message={result.error} />;
  if (relationId(result.data.partner) !== ctx.selected.partner.id) {
    return <LoadError message="Este serviço não pertence à empresa selecionada." />;
  }

  const canEdit = ctx.selected.canEdit;
  const intents = canEdit ? availableStatusIntents(result.data.status) : [];
  const action = saveListingAction.bind(null, 'service', id);
  const editing = withPendingRevision('service', result.data);

  return (
    <>
      <PageHeader
        title={result.data.title}
        description={
          <>
            Status:{' '}
            <StatusBadge tone={result.data.status}>
              {labelOf(LISTING_STATUS_LABELS, result.data.status)}
            </StatusBadge>
            {result.data.status === 'published' && result.data.slug ? (
              <>
                {' '}
                ·{' '}
                <Link
                  href={`/marketplace/servicos/${buildListingPublicSlug(result.data.slug, result.data.id)}`}
                  className="text-omnia-deep-blue underline"
                >
                  Ver página pública
                </Link>
              </>
            ) : null}
          </>
        }
      />
      {salvo ? (
        <Alert variant="success" className="mb-4" title="Salvo">
          Alterações registradas.
        </Alert>
      ) : null}
      <RevisionNotice listing={result.data} />
      <ListingForm
        kind="service"
        listing={editing}
        action={action}
        intents={intents}
        readOnly={!canEdit}
        readOnlyReason={!canEdit ? 'Seu papel nesta empresa é somente leitura.' : undefined}
      />
      <ListingFiles
        kind="service"
        listingId={id}
        images={(editing.images ?? []).flatMap((row) => {
          const mediaId = relationId(row.image);
          return mediaId ? [{ mediaId, alt: row.alt ?? null }] : [];
        })}
        datasheetId={relationId(editing.datasheet)}
        canEdit={canEdit}
        pdfUploadEnabled={isMarketplacePdfUploadEnabled()}
        removeAction={removeListingFileAction.bind(null, 'service', id)}
      />
    </>
  );
}
