'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';

import { MARKETPLACE_LISTING_MAX_IMAGES } from '@omnia/shared';
import { Alert, Button, Input } from '@omnia/ui';

import type { ActionState } from '@/app/parceiro/actions';
import type { MarketplaceListingKind } from '@/lib/marketplace/types';

type RemoveAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  kind: MarketplaceListingKind;
  listingId: string;
  images: Array<{ mediaId: string; alt: string | null }>;
  datasheetId: string | null;
  canEdit: boolean;
  removeAction: RemoveAction;
};

function UploadForm(props: {
  kind: MarketplaceListingKind;
  listingId: string;
  slot: 'image' | 'datasheet';
  accept: string;
  hint: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setMessage(null);
    const form = new FormData(formElement);
    form.set('kind', props.kind);
    form.set('slot', props.slot);
    form.set('listingId', props.listingId);
    setPending(true);
    try {
      const response = await fetch('/api/parceiro/midia', { method: 'POST', body: form });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) {
        setError(body.message || 'Não foi possível enviar o arquivo.');
        return;
      }
      setMessage(body.message || 'Arquivo enviado.');
      formElement.reset();
      router.refresh();
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-omnia-deep-blue" htmlFor={`file-${props.slot}`}>
            {props.label}
          </label>
          <Input id={`file-${props.slot}`} name="file" type="file" accept={props.accept} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-omnia-deep-blue" htmlFor={`alt-${props.slot}`}>
            Descrição
          </label>
          <Input id={`alt-${props.slot}`} name="alt" maxLength={160} placeholder="Ex.: vista frontal" />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? 'Enviando…' : 'Enviar'}
        </Button>
      </div>
      <p className="text-xs text-omnia-graphite-light">{props.hint}</p>
    </form>
  );
}

function RemoveButton(props: { action: RemoveAction; target: 'image' | 'datasheet'; mediaId?: string; label: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(props.action, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="target" value={props.target} />
      {props.mediaId ? <input type="hidden" name="mediaId" value={props.mediaId} /> : null}
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {props.label}
      </Button>
      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
    </form>
  );
}

/** Galeria e ficha técnica do anúncio. Arquivos só ficam públicos quando o anúncio é publicado. */
export function ListingFiles(props: Props) {
  const full = props.images.length >= MARKETPLACE_LISTING_MAX_IMAGES;
  return (
    <section className="mt-8 space-y-6 rounded-lg border border-omnia-deep-blue/10 bg-white p-4">
      <div>
        <h2 className="font-heading text-lg text-omnia-deep-blue">Imagens</h2>
        <p className="text-sm text-omnia-graphite-light">
          Até {MARKETPLACE_LISTING_MAX_IMAGES} imagens. Ficam visíveis ao público só depois da publicação pela equipe Omnia.
        </p>
      </div>
      {props.images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {props.images.map((image) => (
            <li key={image.mediaId} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- arquivo privado servido pela rota autenticada */}
              <img
                src={`/api/parceiro/midia/${image.mediaId}`}
                alt={image.alt ?? 'Imagem do anúncio'}
                className="aspect-square w-full rounded-md border border-omnia-deep-blue/10 object-cover"
              />
              {props.canEdit ? (
                <RemoveButton action={props.removeAction} target="image" mediaId={image.mediaId} label="Remover" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-omnia-graphite-light">Nenhuma imagem enviada.</p>
      )}
      {props.canEdit && !full ? (
        <UploadForm
          kind={props.kind}
          listingId={props.listingId}
          slot="image"
          accept="image/jpeg,image/png,image/webp"
          label="Nova imagem"
          hint="JPEG, PNG ou WebP, até 5 MB. Use fotos próprias ou autorizadas."
        />
      ) : null}

      <div className="border-t border-omnia-deep-blue/10 pt-4">
        <h2 className="font-heading text-lg text-omnia-deep-blue">Ficha técnica</h2>
        {props.datasheetId ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <a
              href={`/api/parceiro/midia/${props.datasheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-omnia-deep-blue underline"
            >
              Abrir ficha técnica (PDF)
            </a>
            {props.canEdit ? (
              <RemoveButton action={props.removeAction} target="datasheet" label="Remover ficha" />
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-omnia-graphite-light">Nenhuma ficha técnica anexada.</p>
        )}
        {props.canEdit ? (
          <div className="mt-3">
            <UploadForm
              kind={props.kind}
              listingId={props.listingId}
              slot="datasheet"
              accept="application/pdf"
              label={props.datasheetId ? 'Substituir ficha técnica' : 'Enviar ficha técnica'}
              hint="Somente PDF, até 10 MB."
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
