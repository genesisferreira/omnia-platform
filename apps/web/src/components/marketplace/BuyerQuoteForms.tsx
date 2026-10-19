'use client';

import { useActionState, useState } from 'react';

import { Alert, Button, Textarea } from '@omnia/ui';

import type { BuyerActionState } from '@/app/minhas-cotacoes/actions';

type Action = (prev: BuyerActionState, formData: FormData) => Promise<BuyerActionState>;

export function BuyerRespondForm(props: {
  action: Action;
  canAccept: boolean;
  canNegotiate: boolean;
  canDecline: boolean;
}) {
  const [state, formAction, pending] = useActionState<BuyerActionState, FormData>(props.action, {});
  const [confirmAccept, setConfirmAccept] = useState(false);

  if (!props.canAccept && !props.canNegotiate && !props.canDecline) return null;

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-omnia-deep-blue/10 bg-white p-4"
    >
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-omnia-deep-blue">
          Mensagem ao parceiro {props.canNegotiate ? '(obrigatória para renegociar)' : '(opcional)'}
        </label>
        <Textarea
          id="message"
          name="message"
          rows={3}
          maxLength={2000}
          placeholder="Ex.: preciso de prazo de entrega menor ou condição de pagamento em 3 vezes."
        />
      </div>
      {props.canAccept ? (
        <label className="flex items-start gap-2 text-sm text-omnia-graphite">
          <input
            type="checkbox"
            className="mt-1"
            checked={confirmAccept}
            onChange={(event) => setConfirmAccept(event.target.checked)}
          />
          Li a versão vigente da proposta e quero aceitá-la. O aceite não gera cobrança automática;
          o parceiro entrará em contato para formalizar o pedido.
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {props.canAccept ? (
          <Button type="submit" name="action" value="accept" disabled={pending || !confirmAccept}>
            Aceitar proposta
          </Button>
        ) : null}
        {props.canNegotiate ? (
          <Button
            type="submit"
            name="action"
            value="negotiate"
            variant="outline"
            disabled={pending}
          >
            Pedir renegociação
          </Button>
        ) : null}
        {props.canDecline ? (
          <Button type="submit" name="action" value="decline" variant="ghost" disabled={pending}>
            Recusar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function BuyerMessageForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<BuyerActionState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      <Textarea
        name="message"
        rows={3}
        required
        minLength={2}
        maxLength={2000}
        aria-label="Mensagem"
      />
      <Button type="submit" variant="outline" disabled={pending}>
        Enviar mensagem
      </Button>
    </form>
  );
}
