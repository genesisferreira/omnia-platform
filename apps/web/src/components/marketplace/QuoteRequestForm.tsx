'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Alert, Button, Input, Textarea } from '@omnia/ui';

import {
  submitMarketplaceQuoteAction,
  type QuoteActionState,
} from '@/app/marketplace/actions';

type Props = {
  partnerId: string;
  sourceType: 'product' | 'service' | 'project';
  listingId?: string;
  listingTitle?: string;
};

export function QuoteRequestForm(props: Props) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(
    submitMarketplaceQuoteAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-omnia-deep-blue/10 bg-white p-4">
      <input type="hidden" name="partnerId" value={props.partnerId} />
      <input type="hidden" name="sourceType" value={props.sourceType} />
      {props.listingId ? <input type="hidden" name="listingId" value={props.listingId} /> : null}
      <h2 className="font-heading text-lg text-omnia-deep-blue">Solicitar orçamento</h2>
      {props.listingTitle ? (
        <p className="text-sm text-omnia-graphite-light">Referência: {props.listingTitle}</p>
      ) : null}
      {state.error ? (
        <Alert variant="destructive" title="Não foi possível enviar">
          {state.error}
        </Alert>
      ) : null}
      {state.message ? (
        <Alert variant="success" title="Enviado">
          {state.message}
          {state.publicId ? ` Código: ${state.publicId}.` : ''}{' '}
          <Link href="/minhas-cotacoes" className="underline">
            Acompanhar em Minhas cotações
          </Link>
        </Alert>
      ) : null}
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Descreva a necessidade *
        </label>
        <Textarea id="description" name="description" required minLength={10} maxLength={4000} rows={5} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="quantity" className="mb-1 block text-sm font-medium">
            Quantidade
          </label>
          <Input id="quantity" name="quantity" type="number" min={1} step={1} />
        </div>
        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium">
            Cidade
          </label>
          <Input id="city" name="city" maxLength={80} />
        </div>
        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium">
            UF
          </label>
          <Input id="state" name="state" maxLength={2} />
        </div>
      </div>
      <p className="text-xs text-omnia-graphite-light">
        A solicitação fica registrada no portal. WhatsApp do fornecedor, quando houver, é complementar.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar solicitação'}
      </Button>
    </form>
  );
}
