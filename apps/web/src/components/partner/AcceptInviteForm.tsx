'use client';

import { useActionState } from 'react';

import { Alert, Button } from '@omnia/ui';

import type { AcceptState } from '@/app/convite/actions';

export function AcceptInviteForm(props: {
  action: (prev: AcceptState, formData: FormData) => Promise<AcceptState>;
  token: string;
}) {
  const [state, formAction, pending] = useActionState<AcceptState, FormData>(props.action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert variant="destructive">{state.error}</Alert> : null}
      <input type="hidden" name="token" value={props.token} />
      <label className="flex items-start gap-2 text-sm text-omnia-graphite">
        <input type="checkbox" name="confirm" className="mt-1" required />
        Quero entrar na equipe desta empresa e entendo que ela verá meu nome e e-mail.
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Aceitando…' : 'Aceitar convite'}
      </Button>
    </form>
  );
}
