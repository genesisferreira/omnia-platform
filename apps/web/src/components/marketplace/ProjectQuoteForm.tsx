'use client';

import { useActionState } from 'react';

import { Alert, Button, Input, Textarea } from '@omnia/ui';

import { submitMarketplaceQuoteAction, type QuoteActionState } from '@/app/marketplace/actions';

type PartnerOption = { id: string; label: string };

export function ProjectQuoteForm({ partners }: { partners: PartnerOption[] }) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(
    submitMarketplaceQuoteAction,
    {},
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <input type="hidden" name="sourceType" value="project" />
      {state.error ? (
        <Alert variant="destructive" title="Não foi possível enviar">
          {state.error}
        </Alert>
      ) : null}
      {state.message ? (
        <Alert variant="success" title="Enviado">
          {state.message}
          {state.publicId ? ` Código: ${state.publicId}.` : ''}
        </Alert>
      ) : null}
      <div>
        <label htmlFor="partnerId" className="mb-1 block text-sm font-medium">
          Parceiro destinatário *
        </label>
        <select
          id="partnerId"
          name="partnerId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Selecione</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Descrição do projeto *
        </label>
        <Textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={4000}
          rows={8}
          placeholder="Dimensões, temperaturas, produto armazenado, local de instalação, prazos…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar solicitação de projeto'}
      </Button>
    </form>
  );
}
