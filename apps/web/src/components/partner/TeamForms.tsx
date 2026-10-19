'use client';

import { useActionState, useState } from 'react';

import { Alert, Button, Input } from '@omnia/ui';

import type { TeamActionState } from '@/app/parceiro/equipe/actions';

type Action = (prev: TeamActionState, formData: FormData) => Promise<TeamActionState>;

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'viewer', label: 'Visualizador — só consulta' },
  { value: 'editor', label: 'Editor — anúncios e propostas' },
  { value: 'manager', label: 'Gerente — também gerencia a equipe' },
  { value: 'owner', label: 'Proprietário' },
];

export function InviteForm(props: { action: Action; allowOwner: boolean; askPartnerId: boolean }) {
  const [state, formAction, pending] = useActionState<TeamActionState, FormData>(props.action, {});
  const [copied, setCopied] = useState(false);
  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-omnia-deep-blue/10 bg-white p-4"
    >
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      {state.inviteLink ? (
        <Alert variant="success" title="Convite criado">
          <p>{state.message}</p>
          <p className="mt-2 break-all rounded bg-white/60 p-2 font-mono text-xs">
            {state.inviteLink}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={async () => {
              await navigator.clipboard.writeText(state.inviteLink ?? '');
              setCopied(true);
            }}
          >
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <p className="mt-2 text-xs">
            Este link não será exibido de novo. Envie-o somente ao convidado; ele precisa entrar com
            o mesmo e-mail e ter a conta validada pela equipe Omnia.
          </p>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {props.askPartnerId ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-omnia-deep-blue">ID da empresa</span>
            <Input name="partnerId" inputMode="numeric" required />
          </label>
        ) : null}
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-omnia-deep-blue">E-mail do convidado</span>
          <Input name="email" type="email" required autoComplete="off" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-omnia-deep-blue">Papel</span>
          <select
            name="role"
            defaultValue="viewer"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ROLE_OPTIONS.filter((option) => props.allowOwner || option.value !== 'owner').map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Gerando…' : 'Gerar convite'}
      </Button>
    </form>
  );
}

export function MemberControls(props: {
  action: Action;
  membershipId: string;
  role: string;
  allowOwner: boolean;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState<TeamActionState, FormData>(props.action, {});
  if (!props.editable) return null;
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membershipId" value={props.membershipId} />
      <select
        name="role"
        defaultValue={props.role}
        aria-label="Papel"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      >
        {ROLE_OPTIONS.filter((option) => props.allowOwner || option.value !== 'owner').map(
          (option) => (
            <option key={option.value} value={option.value}>
              {option.label.split(' — ')[0]}
            </option>
          ),
        )}
      </select>
      <Button
        type="submit"
        name="intent"
        value="role"
        size="sm"
        variant="outline"
        disabled={pending}
      >
        Salvar papel
      </Button>
      <Button
        type="submit"
        name="intent"
        value="revoke"
        size="sm"
        variant="ghost"
        disabled={pending}
      >
        Revogar acesso
      </Button>
      {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
      {state.message ? <span className="text-xs text-emerald-700">{state.message}</span> : null}
    </form>
  );
}

export function RevokeInviteButton(props: { action: Action; invitationId: string }) {
  const [state, formAction, pending] = useActionState<TeamActionState, FormData>(props.action, {});
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="invitationId" value={props.invitationId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        Revogar
      </Button>
      {state.error ? <span className="text-xs text-red-700">{state.error}</span> : null}
    </form>
  );
}
