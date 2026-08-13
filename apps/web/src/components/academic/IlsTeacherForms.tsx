'use client';

import { useState } from 'react';
import { Button } from '@omnia/ui';

export function InterventionForm(props: { studentId: number }) {
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-3 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await fetch('/api/academic/ils/teaching/interventions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: props.studentId,
            action: 'recommend_content',
            reason,
          }),
        });
        const data = await res.json();
        setMsg(data?.ok ? 'Intervenção registrada.' : data?.error?.message || 'Falha');
      }}
    >
      <label className="block text-sm font-medium">Registrar intervenção</label>
      <textarea
        className="w-full rounded-md border border-border bg-background p-2 text-sm"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo pedagógico (mínimo 8 caracteres)"
      />
      <Button type="submit">Salvar</Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
