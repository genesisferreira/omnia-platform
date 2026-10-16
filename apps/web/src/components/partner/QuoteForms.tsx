'use client';

import { useActionState, useMemo, useState } from 'react';

import { computeProposalTotals, formatPriceCents, parseBrlToCents } from '@omnia/shared';
import { Alert, Button, Input, Textarea } from '@omnia/ui';

import type { ActionState } from '@/app/parceiro/actions';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-omnia-deep-blue">
      {children}
    </label>
  );
}

export function QuoteStatusForm(props: {
  action: Action;
  targets: Array<{ status: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(props.action, {});
  if (props.targets.length === 0) return null;
  return (
    <form action={formAction} className="space-y-2">
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {props.targets.map((target) => (
          <Button
            key={target.status}
            type="submit"
            name="status"
            value={target.status}
            variant={target.status === 'declined' ? 'outline' : 'default'}
            size="sm"
            disabled={pending}
          >
            {target.label}
          </Button>
        ))}
      </div>
    </form>
  );
}

export function QuoteMessageForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      <div>
        <Label htmlFor="message">Mensagem</Label>
        <Textarea id="message" name="message" rows={3} required minLength={2} maxLength={2000} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="visibility">Visibilidade</Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue="shared"
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="shared">Visível ao comprador</option>
            <option value="internal">Nota interna (somente equipe do parceiro)</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          Registrar
        </Button>
      </div>
    </form>
  );
}

type Row = { key: number; description: string; quantity: string; price: string };

export function ProposalForm(props: {
  action: Action;
  defaultTitle: string;
  defaultQuantity?: number | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(props.action, {});
  const [rows, setRows] = useState<Row[]>([
    { key: 1, description: '', quantity: String(props.defaultQuantity ?? 1), price: '' },
  ]);
  const [discount, setDiscount] = useState('');
  const [shipping, setShipping] = useState('');

  const totals = useMemo(() => {
    const items = rows.map((row) => ({
      quantity: Number(row.quantity),
      unitPriceCents: parseBrlToCents(row.price) ?? Number.NaN,
    }));
    if (items.some((item) => !Number.isInteger(item.quantity) || Number.isNaN(item.unitPriceCents))) return null;
    const discountCents = discount.trim() ? parseBrlToCents(discount) : 0;
    const shippingCents = shipping.trim() ? parseBrlToCents(shipping) : 0;
    if (discountCents == null || shippingCents == null) return null;
    return computeProposalTotals(items, discountCents, shippingCents);
  }, [rows, discount, shipping]);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      {state.error ? (
        <Alert variant="destructive" title="Não foi possível enviar a proposta">
          {state.error}
        </Alert>
      ) : null}

      <div>
        <Label htmlFor="title">Título da proposta *</Label>
        <Input id="title" name="title" required maxLength={160} defaultValue={props.defaultTitle} />
      </div>
      <div>
        <Label htmlFor="summary">Resumo</Label>
        <Textarea id="summary" name="summary" rows={3} maxLength={2000} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-omnia-deep-blue">Itens *</legend>
        {rows.map((row, index) => (
          <div key={row.key} className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
            <Input
              name="itemDescription"
              aria-label={`Descrição do item ${index + 1}`}
              placeholder="Descrição"
              required
              maxLength={200}
              value={row.description}
              onChange={(event) => update(row.key, { description: event.target.value })}
            />
            <Input
              name="itemQuantity"
              aria-label={`Quantidade do item ${index + 1}`}
              type="number"
              min={1}
              step={1}
              required
              value={row.quantity}
              onChange={(event) => update(row.key, { quantity: event.target.value })}
            />
            <Input
              name="itemPrice"
              aria-label={`Preço unitário do item ${index + 1} (R$)`}
              inputMode="decimal"
              placeholder="0,00"
              required
              value={row.price}
              onChange={(event) => update(row.key, { price: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
            >
              Remover
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length >= 30}
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: Math.max(...current.map((r) => r.key)) + 1, description: '', quantity: '1', price: '' },
            ])
          }
        >
          Adicionar item
        </Button>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="discount">Desconto (R$)</Label>
          <Input id="discount" name="discount" inputMode="decimal" placeholder="0,00" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="shipping">Frete (R$)</Label>
          <Input id="shipping" name="shipping" inputMode="decimal" placeholder="0,00" value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="validUntil">Válida até</Label>
          <Input id="validUntil" name="validUntil" type="date" />
        </div>
        <div>
          <Label htmlFor="deliveryDays">Prazo de entrega (dias)</Label>
          <Input id="deliveryDays" name="deliveryDays" type="number" min={0} step={1} />
        </div>
      </div>
      <div>
        <Label htmlFor="paymentTerms">Condições de pagamento</Label>
        <Textarea id="paymentTerms" name="paymentTerms" rows={2} maxLength={1000} />
      </div>
      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
      </div>

      <p className="text-sm text-omnia-graphite" aria-live="polite">
        Total estimado: <strong>{totals ? formatPriceCents(totals.totalCents) : '—'}</strong>
        <span className="ml-2 text-xs text-omnia-graphite-light">
          (o valor final é recalculado no servidor)
        </span>
      </p>

      <Button type="submit" disabled={pending}>
        Enviar proposta ao comprador
      </Button>
    </form>
  );
}
