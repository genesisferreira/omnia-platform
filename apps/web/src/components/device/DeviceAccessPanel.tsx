'use client';

import { useEffect, useState } from 'react';

type Props = {
  nextPath: string;
  state: string;
  limit: number | null;
  authorizedCount: number | null;
  devices: Array<{
    label: string;
    deviceType: string;
    createdAt: string;
    lastSeenAt: string | null;
  }>;
  openRequest: { createdAt: string; status: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  desktop: 'Computador',
  mobile: 'Celular',
  tablet: 'Tablet',
  unknown: 'Dispositivo',
};

function fmt(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}

/**
 * UX do aluno: sem erro técnico, sem token/hash/IP. Registro automático quando há vaga;
 * com limite atingido, explica e permite solicitar liberação com justificativa.
 */
export function DeviceAccessPanel(props: Props) {
  const [state, setState] = useState(props.state);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(props.openRequest);

  useEffect(() => {
    if (state !== 'REGISTRATION_AVAILABLE') return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/device/register', {
          method: 'POST',
          credentials: 'same-origin',
        });
        const data = (await res.json().catch(() => null)) as { state?: string } | null;
        if (cancelled) return;
        if (res.ok && (data?.state === 'ALLOWED' || data?.state === 'NOT_ENFORCED')) {
          window.location.replace(props.nextPath);
          return;
        }
        setState(data?.state || 'BLOCKED_LIMIT');
      } catch {
        if (!cancelled)
          setMessage('Não foi possível verificar este dispositivo agora. Tente novamente.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state, props.nextPath]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      // Garante que este navegador tenha um identificador de candidato antes de solicitar.
      await fetch('/api/device/register', { method: 'POST', credentials: 'same-origin' });
      const res = await fetch('/api/device/request', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json().catch(() => null)) as {
        request?: { createdAt: string; status: string };
        error?: { code?: string };
      } | null;
      if (res.ok && data?.request) {
        setPending({ createdAt: data.request.createdAt, status: data.request.status });
        setState('PENDING_APPROVAL');
      } else if (data?.error?.code === 'INVALID_INPUT') {
        setMessage('Descreva o motivo com pelo menos 5 caracteres (máx. 500).');
      } else if (data?.error?.code === 'NOT_NEEDED') {
        window.location.replace(props.nextPath);
      } else {
        setMessage('Não foi possível enviar a solicitação agora. Tente novamente em instantes.');
      }
    } catch {
      setMessage('Não foi possível enviar a solicitação agora. Tente novamente em instantes.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'REGISTRATION_AVAILABLE') {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Verificando este dispositivo…</h1>
        <p className="text-sm text-neutral-600">Só um instante.</p>
        {message ? <p className="text-sm text-red-700">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Este dispositivo ainda não está autorizado</h1>
        <p className="text-neutral-700">
          {state === 'DEVICE_REVOKED'
            ? 'O acesso deste dispositivo à área acadêmica foi encerrado pela administração.'
            : `Sua conta já atingiu o limite de ${props.limit ?? ''} dispositivo(s) autorizado(s) para a área acadêmica.`}{' '}
          Você pode continuar usando seus dispositivos já autorizados ou solicitar a liberação
          deste.
        </p>
      </div>

      {props.devices.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Dispositivos autorizados
          </h2>
          <ul className="divide-y rounded border">
            {props.devices.map((d, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {TYPE_LABEL[d.deviceType] || 'Dispositivo'} · {d.label}
                </span>
                <span className="text-neutral-500">
                  desde {fmt(d.createdAt)} · último acesso {fmt(d.lastSeenAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state === 'PENDING_APPROVAL' || pending ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm">
          Sua solicitação foi enviada em {fmt(pending?.createdAt ?? null)} e está em análise. Você
          será liberado assim que a administração aprovar.
          <div className="mt-3">
            <button
              type="button"
              className="underline"
              onClick={() => window.location.replace(props.nextPath)}
            >
              Verificar novamente
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submitRequest} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="device-reason">
            Por que você precisa usar este dispositivo?
          </label>
          <textarea
            id="device-reason"
            className="w-full rounded border p-2 text-sm"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: troquei de celular / computador do trabalho"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Solicitar liberação'}
          </button>
        </form>
      )}

      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </section>
  );
}
