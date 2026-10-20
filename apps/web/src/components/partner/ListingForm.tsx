'use client';

import { useActionState, useState } from 'react';

import { formatCentsForInput } from '@omnia/shared';
import { Alert, Button, Input, Textarea } from '@omnia/ui';

import type { ActionState } from '@/app/parceiro/actions';
import type { ListingIntent } from '@/lib/marketplace/listing-status';
import type { ListingDoc, MarketplaceListingKind } from '@/lib/marketplace/types';

type Props = {
  kind: MarketplaceListingKind;
  listing?: ListingDoc | null;
  /** Server action já vinculada (kind + id). */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Intents disponíveis para o status atual (calculado no servidor). */
  intents: ListingIntent[];
  readOnly?: boolean;
  readOnlyReason?: string;
};

const INTENT_LABELS: Record<ListingIntent, string> = {
  save: 'Salvar alterações',
  submit: 'Enviar para moderação',
  draft: 'Voltar para rascunho',
  archive: 'Arquivar',
};

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-omnia-deep-blue">
      {children}
    </label>
  );
}

export function ListingForm({ kind, listing, action, intents, readOnly, readOnlyReason }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [priceMode, setPriceMode] = useState<string>(listing?.priceMode ?? 'on_request');
  const isProduct = kind === 'product';
  const isNew = !listing;
  const contentDisabled = Boolean(readOnly);

  return (
    <form action={formAction} className="max-w-3xl space-y-5" noValidate={false}>
      {state.error ? (
        <Alert variant="destructive" title="Não foi possível salvar">
          {state.error}
        </Alert>
      ) : null}
      {readOnly && readOnlyReason ? <Alert variant="warning">{readOnlyReason}</Alert> : null}

      <fieldset disabled={contentDisabled} className="space-y-5 disabled:opacity-90">
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={160}
            defaultValue={listing?.title ?? ''}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              name="category"
              maxLength={120}
              defaultValue={listing?.category ?? ''}
            />
          </div>
          {isProduct ? (
            <div>
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" name="brand" maxLength={120} defaultValue={listing?.brand ?? ''} />
            </div>
          ) : null}
        </div>

        {isProduct ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" name="model" maxLength={120} defaultValue={listing?.model ?? ''} />
            </div>
            <div>
              <Label htmlFor="sku">SKU (uso interno)</Label>
              <Input id="sku" name="sku" maxLength={80} defaultValue={listing?.sku ?? ''} />
            </div>
          </div>
        ) : null}

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            rows={6}
            maxLength={4000}
            defaultValue={listing?.description ?? ''}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="priceMode">Modo de preço *</Label>
            <select
              id="priceMode"
              name="priceMode"
              value={priceMode}
              onChange={(event) => setPriceMode(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="on_request">Sob consulta</option>
              <option value="fixed">Preço fixo</option>
              <option value="starting_at">A partir de</option>
            </select>
          </div>
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              name="price"
              inputMode="decimal"
              placeholder="129,90"
              disabled={priceMode === 'on_request' || contentDisabled}
              required={priceMode !== 'on_request'}
              defaultValue={formatCentsForInput(listing?.price)}
              aria-describedby="price-help"
            />
            <p id="price-help" className="mt-1 text-xs text-omnia-graphite-light">
              Informe em reais; o valor é gravado em centavos inteiros. Vazio quando sob consulta.
            </p>
          </div>
        </div>
      </fieldset>

      {listing?.status === 'published' && !readOnly ? (
        <Alert variant="warning">
          Alterações em itens publicados voltam para moderação e saem do ar até nova aprovação.
        </Alert>
      ) : null}
      {listing?.moderationNotes && listing.status === 'rejected' ? (
        <Alert variant="destructive" title="Motivo da rejeição">
          {listing.moderationNotes}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {isNew ? (
          <>
            <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
              Salvar rascunho
            </Button>
            <Button type="submit" name="intent" value="submit" disabled={pending}>
              Enviar para moderação
            </Button>
          </>
        ) : (
          intents.map((intent) => (
            <Button
              key={intent}
              type="submit"
              name="intent"
              value={intent}
              disabled={pending}
              variant={intent === 'submit' || intent === 'save' ? 'default' : 'outline'}
              formNoValidate={intent === 'draft' || intent === 'archive'}
            >
              {INTENT_LABELS[intent]}
            </Button>
          ))
        )}
      </div>
    </form>
  );
}
