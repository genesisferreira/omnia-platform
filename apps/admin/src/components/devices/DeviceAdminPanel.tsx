'use client';

import { useCallback, useEffect, useState } from 'react';

type Settings = { enabled: boolean; defaultMaxDevices: number | null; updatedAt: string | null };
type PendingRequest = {
  id: string;
  device: string;
  reason: string;
  createdAt: string;
  student: { id: string; name?: string | null; email?: string | null };
  deviceLabel: string | null;
  deviceType: string | null;
};
type StudentView = {
  student: { id: string; role: string | null; maxDevicesOverride: number | null };
  limit: number | null;
  authorizedCount: number;
  overLimit: boolean;
  devices: Array<{
    id: string;
    label: string;
    deviceType: string;
    status: string;
    createdAt: string;
    lastSeenAt: string | null;
  }>;
  requests: Array<{
    id: string;
    device: string;
    status: string;
    reason: string;
    createdAt: string;
  }>;
};

async function call(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`/api/omnia/devices/admin/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.code || `HTTP_${res.status}`);
  return data;
}

const d = (v: string | null) => (v ? new Date(v).toLocaleString('pt-BR') : '—');

export function DeviceAdminPanel({ canChangePolicy }: { canChangePolicy: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<StudentView | null>(null);
  const [overrideInput, setOverrideInput] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await call('settings');
      setSettings(s.settings);
      setLimitInput(String(s.settings.defaultMaxDevices ?? ''));
      const r = await call('requests?status=PENDING');
      setPending(r.requests);
    } catch (e) {
      setMsg(`Erro ao carregar: ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      await load();
      if (student) await loadStudent(student.student.id);
    } catch (e) {
      setMsg(`Falha: ${(e as Error).message}`);
    }
  }

  async function loadStudent(id: string) {
    try {
      const v = (await call(`students/${encodeURIComponent(id)}`)) as StudentView;
      setStudent(v);
      setOverrideInput(
        v.student.maxDevicesOverride == null ? '' : String(v.student.maxDevicesOverride),
      );
    } catch (e) {
      setStudent(null);
      setMsg(`Aluno não encontrado (${(e as Error).message})`);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Controle de Dispositivos (alunos)</h1>
      {msg ? <p className="rounded bg-neutral-100 p-2 text-sm">{msg}</p> : null}

      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Política global</h2>
        {settings ? (
          <>
            <p className="text-sm">
              Status: <strong>{settings.enabled ? 'ATIVO' : 'DESLIGADO'}</strong> · limite padrão:{' '}
              <strong>{settings.defaultMaxDevices}</strong> · atualizado {d(settings.updatedAt)}
            </p>
            {canChangePolicy ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={`rounded px-3 py-1 text-sm text-white ${settings.enabled ? 'bg-red-700' : 'bg-green-700'}`}
                  onClick={() =>
                    act(
                      () => call('settings', 'POST', { enabled: !settings.enabled }),
                      settings.enabled ? 'Emergency OFF aplicado.' : 'Controle ativado.',
                    )
                  }
                >
                  {settings.enabled ? 'DESLIGAR (Emergency OFF)' : 'ATIVAR'}
                </button>
                <input
                  className="w-20 rounded border px-2 py-1 text-sm"
                  type="number"
                  min={1}
                  max={100}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() =>
                    act(
                      () => call('settings', 'POST', { defaultMaxDevices: Number(limitInput) }),
                      'Limite atualizado.',
                    )
                  }
                >
                  Salvar limite padrão
                </button>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Somente super_admin altera a política.</p>
            )}
          </>
        ) : (
          <p className="text-sm">Carregando…</p>
        )}
      </section>

      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Solicitações pendentes ({pending.length})</h2>
        <ul className="divide-y text-sm">
          {pending.map((r) => (
            <li key={r.id} className="space-y-1 py-2">
              <div>
                <strong>{r.student.name || r.student.email || `Aluno ${r.student.id}`}</strong> ·{' '}
                {r.deviceLabel} ({r.deviceType}) · {d(r.createdAt)}
              </div>
              <div className="text-neutral-600">Motivo: {r.reason}</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded bg-green-700 px-2 py-1 text-white"
                  onClick={() =>
                    act(() => call(`requests/${r.id}/approve`, 'POST', {}), 'Aprovado.')
                  }
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  className="rounded bg-red-700 px-2 py-1 text-white"
                  onClick={() => act(() => call(`requests/${r.id}/deny`, 'POST', {}), 'Negado.')}
                >
                  Negar
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => {
                    setStudentId(r.student.id);
                    void loadStudent(r.student.id);
                  }}
                >
                  Ver aluno / substituir
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded border p-4">
        <h2 className="font-semibold">Dispositivos de um aluno</h2>
        <div className="flex gap-2">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="ID do aluno"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm"
            onClick={() => loadStudent(studentId)}
          >
            Buscar
          </button>
        </div>
        {student ? (
          <div className="space-y-3 text-sm">
            <p>
              Autorizados: <strong>{student.authorizedCount}</strong> / limite{' '}
              {student.limit ?? '—'}
              {student.overLimit ? ' · ACIMA DO LIMITE (sem novos registros até regularizar)' : ''}
            </p>
            <div className="flex items-center gap-2">
              <span>Override:</span>
              <input
                className="w-20 rounded border px-2 py-1"
                type="number"
                min={1}
                max={100}
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                placeholder="global"
              />
              <button
                type="button"
                className="rounded border px-2 py-1"
                onClick={() =>
                  act(
                    () =>
                      call(`students/${student.student.id}/limit`, 'POST', {
                        maxDevicesOverride: overrideInput === '' ? null : Number(overrideInput),
                      }),
                    'Override salvo.',
                  )
                }
              >
                Salvar
              </button>
            </div>
            <ul className="divide-y">
              {student.devices.map((dv) => (
                <li key={dv.id} className="flex items-center justify-between py-1">
                  <span>
                    #{dv.id} {dv.label} ({dv.deviceType}) — <strong>{dv.status}</strong> · criado{' '}
                    {d(dv.createdAt)} · visto {d(dv.lastSeenAt)}
                  </span>
                  <span className="flex gap-2">
                    {dv.status === 'AUTHORIZED' ? (
                      <button
                        type="button"
                        className="rounded border px-2 py-0.5"
                        onClick={() =>
                          act(() => call(`devices/${dv.id}/revoke`, 'POST', {}), 'Revogado.')
                        }
                      >
                        Revogar
                      </button>
                    ) : null}
                    {dv.status !== 'AUTHORIZED'
                      ? student.devices
                          .filter((o) => o.status === 'AUTHORIZED')
                          .map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              className="rounded border px-2 py-0.5"
                              onClick={() =>
                                act(
                                  () =>
                                    call(`devices/${o.id}/replace`, 'POST', { newDeviceId: dv.id }),
                                  'Substituído.',
                                )
                              }
                            >
                              Substituir #{o.id}
                            </button>
                          ))
                      : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
