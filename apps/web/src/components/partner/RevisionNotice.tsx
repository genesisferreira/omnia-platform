import { Alert } from '@omnia/ui';

import { formatDateTime } from '@/lib/marketplace/labels';
import type { ListingDoc } from '@/lib/marketplace/types';

/** Situação da revisão de conteúdo de um anúncio já moderado. */
export function RevisionNotice({ listing }: { listing: ListingDoc }) {
  if (listing.revisionStatus === 'pending') {
    const fields = Object.keys(listing.pendingRevision?.changes ?? {});
    return (
      <Alert variant="warning" title="Alterações aguardando moderação" className="mb-4">
        Enviadas em {formatDateTime(listing.revisionSubmittedAt)}
        {fields.length ? ` (${fields.length} campo${fields.length > 1 ? 's' : ''})` : ''}. A página
        pública continua com a versão aprovada até a equipe Omnia revisar. O formulário abaixo
        mostra a versão em revisão.
      </Alert>
    );
  }
  if (listing.revisionStatus === 'rejected') {
    return (
      <Alert variant="destructive" title="Última revisão rejeitada" className="mb-4">
        {listing.revisionNotes || 'Sem observações.'} A versão publicada foi mantida; você pode
        editar e enviar novamente.
      </Alert>
    );
  }
  if (listing.status === 'published') {
    return (
      <Alert title="Anúncio publicado" className="mb-4">
        Alterações de conteúdo, preço, imagens ou ficha técnica passam por nova moderação antes de
        ir ao ar.
      </Alert>
    );
  }
  return null;
}
